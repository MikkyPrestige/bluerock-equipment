-- Buyer-facing invoice accept/revise flow: the next link in the quote
-- pipeline after invoice_generated. Run this in the Supabase SQL editor
-- (project: bluerock-prod) — no supabase/migrations pipeline exists yet,
-- same manual-application convention as every prior quotes migration.
--
-- ── WHY A NEW STATUS VALUE, NOT A SIDE COLUMN ────────────────────────────────
-- Considered representing "buyer asked for changes" as an orthogonal column
-- (e.g. revision_requested_at) while leaving status at invoice_generated —
-- the same shape as quotes.archived_at. Rejected: every existing surface in
-- this app (STATUS/badge maps, the buyer "active quotes" OR-filters, the
-- REMOVABLE_STATUSES set, the admin quotes list stats) is keyed directly off
-- quotes.status. A side column would leave a quote awaiting the buyer's
-- decision indistinguishable, at the status level, from one where the buyer
-- already asked for changes and is waiting on admin — exactly the category
-- of bug the status/phase consistency work already fixed once, just
-- reintroduced through a different door. A first-class status value slots
-- into all of that existing infrastructure for free. The lesson from the
-- earlier dead-states drift (buyer_accepted etc. sitting in the CHECK
-- constraint, unwritten for months) was never "don't add status values" — it
-- was "don't add one without also shipping the one real code path that
-- writes and reads it." This migration ships both in the same change, so
-- revision_requested does not become another dead value: see
-- POST /api/quotes/[id]/request-revision (writes it) and the admin quote
-- detail page's revision-request banner (reads it).
--
-- ── RANK: revision_requested TIES invoice_generated, not a new forward step ──
-- enforce_quote_status_phase_consistency() (see the two prior quotes
-- migrations) rejects any status change with a lower rank than the current
-- one. The buyer/admin revision loop is inherently
--   invoice_generated -> revision_requested -> invoice_generated -> ...
-- which is a backward transition under strict monotonic ranks. Giving
-- revision_requested the SAME rank as invoice_generated (both mean "an
-- invoice exists, buyer hasn't accepted yet") makes both directions of that
-- loop a same-rank move, which the existing "no rank decrease" rule already
-- permits with no special-cased exception — while a real regression, e.g.
-- buyer_accepted -> revision_requested, is still correctly rejected as
-- backward, since buyer_accepted outranks both.
alter table quotes add column if not exists revision_reason text;

-- Discover and replace the status CHECK constraint by content rather than by
-- a guessed name — this project's schema was authored directly in the
-- Supabase SQL editor (per the Handbook), so the real auto-generated
-- constraint name was never confirmed from this side of the codebase.
-- Matching on pg_get_constraintdef() text is safe here because quotes has
-- exactly one CHECK constraint that mentions status (the other, on
-- milestone_phase, has no "status" substring in its definition).
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'quotes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%in%'
  loop
    execute format('alter table quotes drop constraint %I', con.conname);
  end loop;
end $$;

alter table quotes add constraint quotes_status_check
  check (status in (
    'pending_quote', 'invoice_generated', 'revision_requested', 'buyer_accepted',
    'payment_pending', 'payment_confirmed', 'sold', 'cancelled'
  ));

-- Full function body reissued (CREATE OR REPLACE replaces the whole
-- definition) — only the two CASE expressions gained a revision_requested
-- branch, tied to invoice_generated's rank (1) and max_phase (1). Every other
-- line is identical to 20260713b_quotes_phase_exceeded_errcode.sql.
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
        when 'pending_quote'      then 0
        when 'invoice_generated'  then 1
        when 'revision_requested' then 1
        when 'buyer_accepted'     then 2
        when 'payment_pending'    then 3
        when 'payment_confirmed'  then 4
        when 'sold'               then 5
      end;
      v_new_rank := case NEW.status
        when 'pending_quote'      then 0
        when 'invoice_generated'  then 1
        when 'revision_requested' then 1
        when 'buyer_accepted'     then 2
        when 'payment_pending'    then 3
        when 'payment_confirmed'  then 4
        when 'sold'               then 5
      end;

      if v_new_rank < v_old_rank then
        raise exception 'quotes.status cannot move backward: % -> %', OLD.status, NEW.status;
      end if;
    end if;
  end if;

  v_max_phase := case NEW.status
    when 'pending_quote'      then 0
    when 'invoice_generated'  then 1
    when 'revision_requested' then 1
    when 'buyer_accepted'     then 2
    when 'payment_pending'    then 2
    when 'payment_confirmed'  then 3
    when 'sold'               then 6
    when 'cancelled'          then 6
  end;

  if NEW.milestone_phase > v_max_phase then
    raise exception 'quotes.milestone_phase (%) cannot exceed % while status is %', NEW.milestone_phase, v_max_phase, NEW.status
      using errcode = 'BR001';
  end if;

  return NEW;
end;
$$ language plpgsql;

-- The partial unique index enforcing "one active quote per buyer per
-- machine" (20260713_quotes_status_phase_integrity_and_atomic_lock.sql) must
-- also treat revision_requested as active — a quote mid-revision-negotiation
-- is exactly as "live" as one sitting at invoice_generated, and leaving it
-- out of this predicate would let a buyer open a second quote on the same
-- machine while the first is awaiting admin's revised pricing. Partial index
-- predicates can't be altered in place, so this drops and recreates it.
drop index if exists quotes_one_active_per_buyer_machine;
create unique index quotes_one_active_per_buyer_machine
  on quotes (buyer_id, machine_id)
  where status in ('pending_quote', 'invoice_generated', 'revision_requested', 'buyer_accepted', 'payment_pending', 'payment_confirmed');
