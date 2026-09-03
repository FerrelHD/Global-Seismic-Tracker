-- 1. SEISMIC EVENTS TABLE
create table if not exists public.seismic_events (
  id uuid primary key default gen_random_uuid(),
  usgs_id text unique not null,
  magnitude real,
  depth real not null,
  latitude real not null,
  longitude real not null,
  place text,
  occurred_at timestamptz not null
);

-- Index for queries (by time and magnitude)
create index if not exists idx_seismic_events_occurred_at on public.seismic_events (occurred_at desc);
create index if not exists idx_seismic_events_magnitude on public.seismic_events (magnitude desc);

-- 2. SAVED BOOKMARKS TABLE
create table if not exists public.saved_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_id uuid references public.seismic_events(id) on delete cascade not null,
  custom_note text,
  created_at timestamptz default now() not null,
  unique (user_id, event_id)
);

create index if not exists idx_saved_bookmarks_user on public.saved_bookmarks (user_id);

-- 3. ROW LEVEL SECURITY (RLS)
alter table public.seismic_events enable row level security;
alter table public.saved_bookmarks enable row level security;

-- Public can read all seismic events
create policy "Allow public read-only access on seismic_events"
  on public.seismic_events for select
  to public
  using (true);

-- Authenticated users have full CRUD on their own bookmarks only
create policy "Allow user select own bookmarks"
  on public.saved_bookmarks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Allow user insert own bookmarks"
  on public.saved_bookmarks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Allow user update own bookmarks"
  on public.saved_bookmarks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Allow user delete own bookmarks"
  on public.saved_bookmarks for delete
  to authenticated
  using (auth.uid() = user_id);
