-- ================================================================
-- Fix infinite recursion in profiles RLS policy
-- The original policy queried profiles inside a profiles policy.
-- Solution: use a security definer function to break the recursion.
-- ================================================================

-- Drop the recursive policy
drop policy if exists "profiles: household members can read" on profiles;
drop policy if exists "events: household" on events;
drop policy if exists "todos: household" on todos;
drop policy if exists "alarms: household" on alarms;
drop policy if exists "activity: household" on activity;

-- Helper: get current user's household_id without triggering RLS
create or replace function get_my_household_id()
returns uuid
language sql
security definer
stable
as $$
  select household_id from profiles where id = auth.uid() limit 1;
$$;

-- Profiles: members can read others in their household
create policy "profiles: household members can read"
  on profiles for select
  using (
    household_id = get_my_household_id()
  );

-- Events: household members only
create policy "events: household"
  on events for all
  using (household_id = get_my_household_id())
  with check (household_id = get_my_household_id());

-- Todos: household members only
create policy "todos: household"
  on todos for all
  using (household_id = get_my_household_id())
  with check (household_id = get_my_household_id());

-- Alarms: household members only
create policy "alarms: household"
  on alarms for all
  using (household_id = get_my_household_id())
  with check (household_id = get_my_household_id());

-- Activity: household members only
create policy "activity: household"
  on activity for all
  using (household_id = get_my_household_id())
  with check (household_id = get_my_household_id());
