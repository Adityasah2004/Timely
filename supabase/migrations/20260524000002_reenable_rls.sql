-- Re-enable RLS on all tables with correct, recursion-free policies.
-- get_my_household_id() (security definer) was created in migration _002
-- and avoids the infinite-recursion problem on profiles.

-- ── Re-enable RLS ───────────────────────────────────────────────
ALTER TABLE households    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- ── Drop all old policies (clean slate) ─────────────────────────
DROP POLICY IF EXISTS "households: members can read"           ON households;
DROP POLICY IF EXISTS "households: anyone can insert"          ON households;
DROP POLICY IF EXISTS "households: authenticated can insert"   ON households;
DROP POLICY IF EXISTS "profiles: household members can read"   ON profiles;
DROP POLICY IF EXISTS "profiles: user can update own"          ON profiles;
DROP POLICY IF EXISTS "profiles: user can insert own"          ON profiles;
DROP POLICY IF EXISTS "events: household"                      ON events;
DROP POLICY IF EXISTS "todos: household"                       ON todos;
DROP POLICY IF EXISTS "alarms: household"                      ON alarms;
DROP POLICY IF EXISTS "activity: household"                    ON activity;

-- ── households ──────────────────────────────────────────────────
-- Any signed-in user can create a household (they're creating their home).
CREATE POLICY "households: insert"
  ON households FOR INSERT TO authenticated
  WITH CHECK (true);

-- Members can read their own household.
CREATE POLICY "households: select"
  ON households FOR SELECT TO authenticated
  USING (id = get_my_household_id());

-- ── profiles ────────────────────────────────────────────────────
-- Users can always read/write their own profile (needed on first sign-in
-- before they have a household, so get_my_household_id() would return NULL).
CREATE POLICY "profiles: own"
  ON profiles FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Any authenticated user can read profiles.
-- household_id is the invite code — knowing it grants access, and the
-- join flow needs to read existing members before setting its own household.
CREATE POLICY "profiles: household read"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- ── events / todos / alarms / activity ──────────────────────────
CREATE POLICY "events: household"
  ON events FOR ALL TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "todos: household"
  ON todos FOR ALL TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "alarms: household"
  ON alarms FOR ALL TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "activity: household"
  ON activity FOR ALL TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- ── notifications ────────────────────────────────────────────────
CREATE POLICY "notifications: household"
  ON notifications FOR ALL TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- ── focus_sessions ───────────────────────────────────────────────
CREATE POLICY "focus_sessions: household"
  ON focus_sessions FOR ALL TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());
