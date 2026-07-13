-- Payment upload + verification: the next link in the quote pipeline after
-- buyer_accepted. Run this in the Supabase SQL editor (project: bluerock-prod)
-- — no supabase/migrations pipeline exists yet, same manual-application
-- convention as every prior quotes migration.
--
-- ── WHY payment_pending's RANK CHANGES FROM 3 TO 2 ──────────────────────────
-- The very first quotes migration (20260713_..._atomic_lock.sql) assigned
-- payment_pending rank 3 and buyer_accepted rank 2, speculatively, before any
-- code wrote either value — payment_pending was a dead status at the time,
-- same as revision_requested was until the previous change. That rank was
-- never exercised against a real transition, and it turns out to be wrong
-- once the real reject-and-resubmit loop this task adds is worked through:
--   buyer_accepted -> [buyer submits] -> payment_pending
--                  -> [admin rejects] -> buyer_accepted -> [resubmit] -> ...
-- is the exact same shape as the invoice_generated/revision_requested loop
-- from the prior migration — a legitimate backward-looking transition that
-- the strict "no rank decrease" rule would otherwise block. Rather than
-- introduce a new status for "payment rejected" (which would NOT need to be
-- distinguishable from buyer_accepted in any list/stat view the way
-- revision_requested needed to be distinguishable from invoice_generated —
-- admin's view of "buyer_accepted, no payment yet" and "payment rejected,
-- awaiting resubmission" both mean the same thing operationally: the ball is
-- in the buyer's court to (re)submit payment), this reuses buyer_accepted as
-- the resubmission state, exactly mirroring how admin regenerating an
-- invoice returns status to invoice_generated rather than some new
-- "invoice_regenerated" value. The two states are told apart, when it
-- matters, by payment_rejection_reason being non-null, the same way a
-- superseded document is told apart from an active one by superseded_at
-- rather than by a different document_type.
--
-- This also matches something already implicit in the original max_phase
-- assignments: buyer_accepted and payment_pending were ALREADY tied at
-- max_phase 2 (both sit before phase 3, "Payment Confirmed", is reached).
-- Tying their rank now makes rank and max_phase agree on the same underlying
-- claim — two statuses that share a milestone-phase ceiling represent the
-- same lifecycle stage, and should share a rank too. payment_confirmed (4)
-- and sold (5) keep their original ranks unchanged; a rank gap at 3 is
-- harmless, the rule only ever compares relative order.
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
        when 'payment_pending'    then 2
        when 'payment_confirmed'  then 4
        when 'sold'               then 5
      end;
      v_new_rank := case NEW.status
        when 'pending_quote'      then 0
        when 'invoice_generated'  then 1
        when 'revision_requested' then 1
        when 'buyer_accepted'     then 2
        when 'payment_pending'    then 2
        when 'payment_confirmed'  then 4
        when 'sold'               then 5
      end;

      if v_new_rank < v_old_rank then
        raise exception 'quotes.status cannot move backward: % -> %', OLD.status, NEW.status;
      end if;
    end if;
  end if;

  -- max_phase mappings are unchanged from the prior migration — only the
  -- rank CASE above changed.
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

-- ── payment_rejection_reason ─────────────────────────────────────────────
-- Symmetric to quotes.revision_reason: admin's stated reason for sending a
-- payment submission back to the buyer. Cleared by the buyer's next
-- resubmission (POST /api/quotes/[id]/payment), the same way revision_reason
-- is cleared by admin's next "Save Pricing" — whichever side resolves the
-- loop clears the other side's note.
alter table quotes add column if not exists payment_rejection_reason text;

-- ── quotes_one_active_per_buyer_machine: no change needed ───────────────────
-- payment_pending and payment_confirmed were already included in this
-- index's predicate as of the first quotes migration (they were added
-- speculatively alongside the dead statuses). sold is deliberately excluded,
-- unchanged: once a quote reaches sold its machine is also flipped to
-- machines.status = 'sold' below, so create_quote_with_lock's own
-- `WHERE status = 'available'` check already makes a second quote on that
-- machine impossible — the partial index has nothing left to protect once a
-- machine is truly sold.

-- ── documents.document_type: allow 'payment_proof' ──────────────────────────
-- Same discovery-by-content approach as the quotes.status constraint in
-- 20260714_quote_revision_flow.sql, for the same reason: this schema was
-- authored directly in the Supabase SQL editor, so the real constraint name
-- was never confirmed from this side. CLAUDE.md documents documents.document_type
-- with the same "(a|b|c)" enum notation used for quotes.status, which did
-- turn out to be a real CHECK constraint — so this is treated as likely
-- rather than assumed absent. If no such constraint exists, the loop below
-- is a no-op and the plain ALTER TABLE ADD COLUMN / no-op path costs nothing.
do $$
declare
  con record;
  found_any boolean := false;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'documents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%document_type%in%'
  loop
    found_any := true;
    execute format('alter table documents drop constraint %I', con.conname);
  end loop;

  if found_any then
    alter table documents add constraint documents_document_type_check
      check (document_type in (
        'proforma', 'bill_of_lading', 'export_cert', 'customs_manifest', 'packing_list', 'payment_proof'
      ));
  end if;
end $$;

-- ── RLS: no new policy needed ────────────────────────────────────────────
-- Every existing route that reads or writes documents.* (admin's Document
-- Ledger upload, the buyer/admin signed-URL download route, DocumentVault's
-- list fetch) already goes through adminSupabase (service role, bypasses
-- RLS) with an explicit ownership check in application code — quote.buyer_id
-- === user.id or user.email === ADMIN_EMAIL — not through the buyer's own
-- RLS-scoped client. None of that ownership logic is keyed on document_type,
-- so a new document_type value is covered automatically; there is nothing
-- document-type-specific to add a policy for. Same reasoning for the private
-- `documents` storage bucket: uploads and signed URLs are both generated
-- service-role-side, so — unlike the buyer-folder-scoped storage policies on
-- the support-files bucket — no storage RLS policy exists or is needed here.
