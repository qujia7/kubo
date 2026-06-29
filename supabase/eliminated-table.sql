-- Run this once in the Supabase SQL editor.
-- Adds the "eliminated" table (teams/players knocked out) and turns on
-- Realtime so the board updates live for everyone.

create table if not exists public.eliminated (
  id          uuid primary key default gen_random_uuid(),
  cat         text not null,        -- 'winner' or 'scorer'
  pick        text not null,        -- the team / player that is out
  created_at  timestamptz not null default now()
);

-- Same open-access model as the rest of the app (admin is gated client-side).
alter table public.eliminated enable row level security;
create policy "eliminated read"   on public.eliminated for select using (true);
create policy "eliminated insert" on public.eliminated for insert with check (true);
create policy "eliminated delete" on public.eliminated for delete using (true);

-- Live updates: stream changes to all open browsers.
alter publication supabase_realtime add table public.bets;
alter publication supabase_realtime add table public.pending;
alter publication supabase_realtime add table public.eliminated;
