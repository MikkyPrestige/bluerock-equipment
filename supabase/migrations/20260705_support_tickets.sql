-- Admin Support Ticketing System — threaded conversation model
-- Run this in the Supabase SQL editor (project: bluerock-prod).
-- No supabase/migrations pipeline exists yet in this project — apply manually.
--
-- This replaces the earlier flat subject/message/admin_reply design entirely.
-- That version was never used in production (no real tickets exist yet), so
-- this drops and recreates both tables rather than writing a data migration.
-- If real ticket rows already exist and matter, stop and ask for a
-- data-preserving version instead of running this as-is.

-- support_messages must be dropped explicitly before support_tickets — a
-- cascade from dropping support_tickets alone was previously found to leave
-- support_messages behind on rerun.
drop table if exists support_messages cascade;
drop table if exists support_tickets cascade;

-- ── support_tickets: thread container, not a message holder ────────────────
create table support_tickets (
  id                  uuid primary key default gen_random_uuid(),
  buyer_id            uuid not null references buyers(id) on delete cascade,
  subject             text not null,
  status              text not null default 'open' check (status in ('open', 'replied', 'resolved', 'closed')),
  closed_by           text check (closed_by in ('buyer', 'admin')),
  buyer_last_read_at  timestamptz,
  admin_last_read_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index support_tickets_buyer_id_idx on support_tickets(buyer_id);
create index support_tickets_status_idx   on support_tickets(status);

-- Reuses the same update_updated_at() function already applied to machines/quotes.
create trigger trg_support_tickets_updated_at
before update on support_tickets
for each row execute function update_updated_at();

alter table support_tickets enable row level security;

create policy "buyers_own_read" on support_tickets
  for select using (auth.uid() = buyer_id);

create policy "buyers_own_insert" on support_tickets
  for insert with check (auth.uid() = buyer_id);

-- Narrow, read-only exception: admin's own authenticated browser session needs
-- SELECT visibility here purely so Supabase Realtime (postgres_changes) can
-- authorize broadcasts to it — Realtime is gated by each subscriber's RLS,
-- and the service-role client used by every other admin route never runs in
-- the browser, so it can't satisfy that check. This doesn't widen what admin
-- can see: every admin page already reads every ticket via the service-role
-- client. Replace the placeholder with the admin login email before running.
create policy "admin_read_all_tickets" on support_tickets
  for select using ((auth.jwt() ->> 'email') = 'meekyberry6@gmail.com');

-- ── support_messages: every message in the thread, buyer and admin alike ───
-- message may be '' for an attachment-only send inside an existing thread —
-- the not-blank check below is what actually guards against a fully empty
-- row, not the not-null constraint on message alone.
create table support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('buyer', 'admin')),
  sender_id   uuid not null,
  message     text not null,
  file_urls   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  constraint support_messages_not_blank check (message <> '' or jsonb_array_length(file_urls) > 0)
);

create index support_messages_ticket_id_idx on support_messages(ticket_id, created_at);

alter table support_messages enable row level security;

-- Ownership: a buyer may read messages only on their own ticket.
create policy "buyers_own_ticket_messages_read" on support_messages
  for select using (
    exists (
      select 1 from support_tickets t
      where t.id = support_messages.ticket_id
        and t.buyer_id = auth.uid()
    )
  );

-- Ownership + closure rule folded into one WITH CHECK subquery rather than a
-- BEFORE INSERT trigger. This project has no precedent for triggers enforcing
-- business rules — the only existing trigger (update_updated_at) just stamps
-- a timestamp — whereas every other authorization rule in this schema is a
-- plain declarative RLS policy. Keeping "can this buyer write here" as a
-- single policy means there's one place to read to answer that question,
-- instead of splitting it across RLS (ownership) and a trigger (closure).
--
-- closed_by only governs who is allowed to reopen a closed ticket — it plays
-- no role here. Once status is 'closed' or 'resolved', no buyer insert is
-- allowed, full stop — a buyer message must never be able to silently
-- un-resolve a ticket admin considers settled.
create policy "buyers_own_ticket_messages_insert" on support_messages
  for insert with check (
    sender_type = 'buyer'
    and sender_id = auth.uid()
    and exists (
      select 1 from support_tickets t
      where t.id = support_messages.ticket_id
        and t.buyer_id = auth.uid()
        and t.status not in ('closed', 'resolved')
    )
  );

-- Same Realtime-authorization carve-out as above — read-only, admin already
-- has full read via the service-role client everywhere else.
create policy "admin_read_all_messages" on support_messages
  for select using ((auth.jwt() ->> 'email') = 'meekyberry6@gmail.com');

-- Bookkeeping trigger (same category as update_updated_at, not a business
-- rule): keeps support_tickets.updated_at reflecting the latest message so
-- "last activity" sorts/displays correctly without a join at every read.
create or replace function support_touch_ticket_activity()
returns trigger as $$
begin
  update support_tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_support_messages_touch_ticket
after insert on support_messages
for each row execute function support_touch_ticket_activity();

-- ── REALTIME ────────────────────────────────────────────────────────────────
-- Broadcasts are still gated by the SELECT policies above per-subscriber.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table support_messages;
  end if;
end $$;

-- support_tickets is added too so the buyer thread view can react to a
-- status change (admin closing/resolving) the moment it happens, rather than
-- only discovering it the next time a send is attempted.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'support_tickets'
  ) then
    alter publication supabase_realtime add table support_tickets;
  end if;
end $$;

-- ── RPCs ────────────────────────────────────────────────────────────────────
-- Unread counts run with the caller's own privileges (default invoker
-- security) — they lean entirely on the RLS policies above, so a buyer
-- calling either function only ever sees rows their own RLS already permits.
create or replace function support_buyer_unread_count()
returns integer
language sql
stable
as $$
  select count(*)::integer
  from support_messages m
  join support_tickets t on t.id = m.ticket_id
  where t.buyer_id = auth.uid()
    and m.sender_type = 'admin'
    and m.created_at > coalesce(t.buyer_last_read_at, 'epoch'::timestamptz)
$$;

grant execute on function support_buyer_unread_count() to authenticated;

create or replace function support_admin_unread_count()
returns integer
language sql
stable
as $$
  select count(*)::integer
  from support_messages m
  join support_tickets t on t.id = m.ticket_id
  where m.sender_type = 'buyer'
    and m.created_at > coalesce(t.admin_last_read_at, 'epoch'::timestamptz)
$$;

grant execute on function support_admin_unread_count() to authenticated;

-- Narrow, safe writes for the buyer side — security definer, but every
-- statement hardcodes "and buyer_id = auth.uid()" internally, so a caller can
-- never touch a row that isn't their own regardless of the ticket id passed
-- in. This avoids opening a general UPDATE policy on support_tickets just to
-- allow these two specific, self-scoped transitions.
create or replace function support_mark_buyer_read(p_ticket_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update support_tickets
  set buyer_last_read_at = now()
  where id = p_ticket_id and buyer_id = auth.uid();
$$;

grant execute on function support_mark_buyer_read(uuid) to authenticated;

create or replace function support_close_ticket_as_buyer(p_ticket_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update support_tickets
  set status = 'closed', closed_by = 'buyer'
  where id = p_ticket_id and buyer_id = auth.uid() and status <> 'closed';
$$;

grant execute on function support_close_ticket_as_buyer(uuid) to authenticated;

-- ── STORAGE BUCKET ─────────────────────────────────────────────────────────
-- Unchanged: private, folder-scoped by buyer_id. Attachments now hang off
-- individual support_messages rows, keyed {buyer_id}/{message_uuid}/{filename}.
insert into storage.buckets (id, name, public)
values ('support-files', 'support-files', false)
on conflict (id) do nothing;

drop policy if exists "support_files_buyer_folder_select" on storage.objects;
create policy "support_files_buyer_folder_select" on storage.objects
  for select using (
    bucket_id = 'support-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "support_files_buyer_folder_insert" on storage.objects;
create policy "support_files_buyer_folder_insert" on storage.objects
  for insert with check (
    bucket_id = 'support-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
