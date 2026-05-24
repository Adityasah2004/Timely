-- ── Notifications ───────────────────────────────────────────────
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  for_user     text not null default 'B' check (for_user in ('M','A','B')),
  kind         text not null default 'info',   -- 'event', 'todo', 'alarm', 'focus', 'info'
  title        text not null,
  body         text not null default '',
  urgent       boolean not null default false,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── Preferences column on profiles ──────────────────────────────
-- role_label and tagline already exist; add preferences JSONB
alter table profiles add column if not exists preferences jsonb not null default '{}';

-- ── Focus sessions ───────────────────────────────────────────────
create table if not exists focus_sessions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_id     uuid not null references profiles(id) on delete cascade,
  label        text not null default '',
  duration_min int not null default 0,        -- planned duration in minutes
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,                   -- null = still active
  created_at   timestamptz not null default now()
);

-- Enable realtime for new tables
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table focus_sessions;
