-- Quotes table integrity: status/phase consistency guard + atomic quote creation.
-- Run this in the Supabase SQL editor (project: bluerock-prod).
-- No supabase/migrations pipeline exists yet in this project — apply manually,
-- same as 20260705_support_tickets.sql.
--
-- Foundation fix, not a feature. Two independent problems found in a live
-- diagnostic pass over Sprint 5/6, both confirmed against production data and
-- code, not just theorized:
--
--   1. quotes.status and quotes.milestone_phase can drift out of sync with
--      each other, and status can move backward, because nothing below the
--      application layer enforces either invariant. Confirmed live: quote
--      b12bf87b-dad8-415c-bc9d-910ed59cbfbc has status='pending_quote' with
--      milestone_phase=4 — MilestoneSwitchboard's "jump to phase" buttons
--      write milestone_phase with no awareness of status at all.
--
--   2. Quote creation (POST /api/quotes) did the machine-availability check
--      and the insert as two separate application-level round trips, with no
--      row lock between them — a textbook TOCTOU race allowing the same
--      machine to be double-booked by two concurrent buyers. The Developer
--      Handbook (section 7.1) already documents the correct fix — a single
--      SECURITY DEFINER function using SELECT ... FOR UPDATE — but that
--      function was never actually created in this database.
--
-- ── 1. STATUS / PHASE CONSISTENCY ────────────────────────────────────────────
--
-- Deliberately does NOT touch the CHECK constraint on quotes.status or remove
-- any status/phase value from the UI. buyer_accepted, payment_pending,
-- payment_confirmed and sold are correct future states — nothing currently
-- writes them, but they stay in every label map and filter query because the
-- transitions that produce them are the next thing to build, not this fix.
--
-- Two rules, enforced as one BEFORE INSERT OR UPDATE trigger:
--
--   a. status may not move backward through the lifecycle
--      (pending_quote -> invoice_generated -> buyer_accepted ->
--       payment_pending -> payment_confirmed -> sold), and neither 'sold'
--      nor 'cancelled' may transition to anything else once reached.
--      'cancelled' remains reachable from any non-terminal status (a deal
--      can fall through at any stage).
--
--   b. milestone_phase may never exceed the highest phase that makes sense
--      for the row's current status, e.g. milestone_phase can't reach
--      2 ("Buyer Accepted") while status is still 'invoice_generated'. This
--      is what would have rejected the b12bf87b write outright.
--
-- Known consequence, not a bug: MilestoneSwitchboard's free-form "jump to
-- phase" buttons will now be rejected by Postgres once they try to jump past
-- what the row's current status allows. That UI was never status-aware to
-- begin with (that's how b12bf87b happened) — wiring status transitions into
-- the switchboard is exactly the "later step" this migration is a
-- prerequisite for, not something this migration attempts.
--
-- Existing bad row: b12bf87b-dad8-415c-bc9d-910ed59cbfbc is left as-is,
-- deliberately not corrected. This project has no hard-delete policy and no
-- precedent for silently rewriting historical rows; the row is part of a
-- batch of quote requests from 2026-06 test/dev activity (identical
-- lock_expires_at values within each batch, no real proforma or documents
-- attached), not a live buyer transaction with real consequences riding on
-- its accuracy. A trigger only ever validates writes going forward — it
-- can't retroactively touch rows it never sees — so leaving it alone and
-- documenting it here is the correct call, not a gap in the fix.

create or replace function enforce_quote_status_phase_consistency()
returns trigger as $$
declare
  v_old_rank int;
  v_new_rank int;
  v_max_phase int;
begin
  if TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status then
    if OLD.status in ('sold', 'cancelled') then
      raise exception 'quotes.status: % is terminal and cannot change to %', OLD.status, NEW.status;
    end if;

    if NEW.status <> 'cancelled' then
      v_old_rank := case OLD.status
        when 'pending_quote'     then 0
        when 'invoice_generated' then 1
        when 'buyer_accepted'    then 2
        when 'payment_pending'   then 3
        when 'payment_confirmed' then 4
        when 'sold'              then 5
      end;
      v_new_rank := case NEW.status
        when 'pending_quote'     then 0
        when 'invoice_generated' then 1
        when 'buyer_accepted'    then 2
        when 'payment_pending'   then 3
        when 'payment_confirmed' then 4
        when 'sold'              then 5
      end;

      if v_new_rank < v_old_rank then
        raise exception 'quotes.status cannot move backward: % -> %', OLD.status, NEW.status;
      end if;
    end if;
  end if;

  v_max_phase := case NEW.status
    when 'pending_quote'     then 0
    when 'invoice_generated' then 1
    when 'buyer_accepted'    then 2
    when 'payment_pending'   then 2
    when 'payment_confirmed' then 3
    when 'sold'              then 6
    when 'cancelled'         then 6
  end;

  if NEW.milestone_phase > v_max_phase then
    raise exception 'quotes.milestone_phase (%) cannot exceed % while status is %', NEW.milestone_phase, v_max_phase, NEW.status;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_quotes_status_phase_consistency on quotes;
create trigger trg_quotes_status_phase_consistency
before insert or update on quotes
for each row execute function enforce_quote_status_phase_consistency();

-- ── 2. ATOMIC QUOTE CREATION ─────────────────────────────────────────────────
--
-- Handbook section 7.1 pattern, adapted to what the app actually collects
-- today: the Handbook signature takes a required p_freight_est because it
-- assumed a Ballpark Freight Estimator would exist at request time. That
-- component was never built (confirmed in the same diagnostic pass) — real
-- quote requests never carry a freight number, it's added later by the admin
-- Quote Builder. p_freight_est is therefore optional and defaults to NULL,
-- matching every real pending_quote row in production today.
--
-- Also folds in the second race the app-level code had: the buyer-duplicate
-- check ("does this buyer already have an active quote on this machine") was
-- also a select-then-insert race, just scoped to a different invariant than
-- machine availability. A partial unique index closes it unconditionally, for
-- every insert path into quotes (this function, and the older bulk
-- watchlist-quote-request route), not just this one — a plain function-body
-- SELECT check would have reproduced the exact same race it's meant to fix.
create unique index if not exists quotes_one_active_per_buyer_machine
  on quotes (buyer_id, machine_id)
  where status in ('pending_quote', 'invoice_generated', 'buyer_accepted', 'payment_pending', 'payment_confirmed');

create or replace function create_quote_with_lock(
  p_buyer_id    uuid,
  p_machine_id  uuid,
  p_port        text,
  p_freight_est numeric default null
) returns quotes as $$
declare
  v_machine machines%rowtype;
  v_quote   quotes%rowtype;
begin
  -- FOR UPDATE locks the machine row for the rest of this transaction — a
  -- second concurrent call for the same machine blocks here until the first
  -- transaction commits (and its status change becomes visible) or rolls
  -- back, instead of both calls reading 'available' and both proceeding.
  select * into v_machine from machines
  where id = p_machine_id
  for update;

  if not found then
    raise exception 'Machine not found';
  end if;

  if v_machine.status <> 'available' then
    raise exception 'Machine is not available';
  end if;

  insert into quotes (buyer_id, machine_id, status, milestone_phase, port_of_discharge, freight_estimate, lock_expires_at)
  values (p_buyer_id, p_machine_id, 'pending_quote', 0, p_port, p_freight_est, now() + interval '48 hours')
  returning * into v_quote;

  update machines set status = 'pending_hold', updated_at = now() where id = p_machine_id;

  return v_quote;
end;
$$ language plpgsql security definer set search_path = public;

-- No explicit GRANT: called exclusively via adminSupabase (service_role) from
-- /api/quotes, which already bypasses RLS and function-level grants the same
-- way every other admin-side write in this codebase does.
