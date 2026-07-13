-- Give the milestone_phase-exceeds-status rejection a distinct, checkable
-- error code, so the API layer can tell "this is the status/phase
-- consistency rule from 20260713_quotes_status_phase_integrity_and_atomic_lock.sql"
-- apart from any other failure on the same UPDATE (network error, some other
-- constraint, etc.) without guessing from message text.
-- Run this in the Supabase SQL editor (project: bluerock-prod), same as the
-- prior quotes migration — no supabase/migrations pipeline exists yet.
--
-- UI-error-handling follow-up only. The rule itself — milestone_phase may
-- not exceed what the row's current status permits — is unchanged; this only
-- tags that one specific RAISE EXCEPTION with USING ERRCODE so the admin
-- Quote Detail page can show admins a specific, actionable message instead
-- of a generic failure. The backward-status-movement and terminal-status
-- exceptions in this same function are untouched (left as default P0001) —
-- nothing currently calls this route in a way that can hit those from the
-- MilestoneSwitchboard PATCH, so there's no caller yet that needs to tell
-- them apart.
--
-- 'BR001' is an app-defined SQLSTATE (Postgres reserves 5-char codes; this
-- doesn't collide with any built-in class). Full function body is repeated
-- because CREATE OR REPLACE FUNCTION replaces the whole definition — every
-- line is identical to the previous migration except the one USING ERRCODE
-- addition below.

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
    raise exception 'quotes.milestone_phase (%) cannot exceed % while status is %', NEW.milestone_phase, v_max_phase, NEW.status
      using errcode = 'BR001';
  end if;

  return NEW;
end;
$$ language plpgsql;
