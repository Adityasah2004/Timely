-- households table doesn't contain sensitive data (just a name like "Home")
-- and is always scoped via profiles.household_id — disable RLS entirely
alter table households disable row level security;
