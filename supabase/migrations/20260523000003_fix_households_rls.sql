-- Fix households RLS: insert was being blocked and select had recursion

drop policy if exists "households: members can read" on households;
drop policy if exists "households: anyone can insert" on households;

-- Any authenticated user can insert a household (they're creating their home)
create policy "households: authenticated can insert"
  on households for insert
  to authenticated
  with check (true);

-- Members can read their own household via the security-definer function
create policy "households: members can read"
  on households for select
  to authenticated
  using (id = get_my_household_id());
