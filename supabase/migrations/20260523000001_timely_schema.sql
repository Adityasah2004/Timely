-- ================================================================
-- Timely — database schema
-- Two users sharing a household: events, todos, alarms, activity
-- ================================================================

-- Enable real-time for all tables
-- (done via Supabase dashboard / publication, but we prep the tables here)

-- ── Users / households ──────────────────────────────────────────
create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Home',
  created_at  timestamptz not null default now()
);

create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text not null,
  short_id     char(1) not null check (short_id in ('M','A')),  -- slot in the pair
  role_label   text,
  tagline      text,
  created_at   timestamptz not null default now()
);

-- ── Events ──────────────────────────────────────────────────────
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_id     uuid not null references profiles(id) on delete cascade,
  title        text not null,
  location     text not null default '',
  start_time   time not null,
  end_time     time not null,
  event_date   date not null default current_date,
  who          text not null default 'M' check (who in ('M','A','B')),
  is_private   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Todos ───────────────────────────────────────────────────────
create table if not exists todos (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_id     uuid not null references profiles(id) on delete cascade,
  text         text not null,
  is_shared    boolean not null default true,
  is_done      boolean not null default false,
  due_label    text not null default 'TODAY',
  priority     int not null default 2 check (priority in (1,2,3)),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Alarms ──────────────────────────────────────────────────────
create table if not exists alarms (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_id     uuid not null references profiles(id) on delete cascade,
  alarm_time   time not null,
  label        text not null default 'Alarm',
  days_label   text not null default 'EVERY DAY',
  is_on        boolean not null default true,
  is_shared    boolean not null default true,
  sound        text not null default 'Pine',
  created_at   timestamptz not null default now()
);

-- ── Activity feed ────────────────────────────────────────────────
create table if not exists activity (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  actor_id     uuid not null references profiles(id) on delete cascade,
  actor_short  char(1) not null,  -- 'M', 'A', or 'B'
  verb         text not null,
  obj          text not null,
  badge        text not null,
  created_at   timestamptz not null default now()
);

-- ── Timestamps auto-update ──────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at  before update on events  for each row execute function touch_updated_at();
create trigger todos_updated_at   before update on todos   for each row execute function touch_updated_at();

-- ── Row-Level Security ──────────────────────────────────────────
alter table households enable row level security;
alter table profiles   enable row level security;
alter table events     enable row level security;
alter table todos      enable row level security;
alter table alarms     enable row level security;
alter table activity   enable row level security;

-- Profiles: readable by household members, writable by self
create policy "profiles: household members can read"
  on profiles for select
  using (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "profiles: user can update own"
  on profiles for update
  using (id = auth.uid());

create policy "profiles: user can insert own"
  on profiles for insert
  with check (id = auth.uid());

-- Households: members can read their own
create policy "households: members can read"
  on households for select
  using (
    id in (select household_id from profiles where id = auth.uid())
  );

create policy "households: anyone can insert"
  on households for insert
  with check (true);

-- Events, todos, alarms, activity: household members only
create policy "events: household"
  on events for all
  using (
    household_id = (select household_id from profiles where id = auth.uid())
  )
  with check (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "todos: household"
  on todos for all
  using (
    household_id = (select household_id from profiles where id = auth.uid())
  )
  with check (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "alarms: household"
  on alarms for all
  using (
    household_id = (select household_id from profiles where id = auth.uid())
  )
  with check (
    household_id = (select household_id from profiles where id = auth.uid())
  );

create policy "activity: household"
  on activity for all
  using (
    household_id = (select household_id from profiles where id = auth.uid())
  )
  with check (
    household_id = (select household_id from profiles where id = auth.uid())
  );

-- ── Enable Realtime ─────────────────────────────────────────────
-- Add tables to the supabase_realtime publication so live updates
-- propagate to all connected clients in the same household.
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table alarms;
alter publication supabase_realtime add table activity;
