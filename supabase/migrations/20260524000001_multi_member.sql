-- Migrate M/A slots to numeric 1/2 and widen constraints to support up to 4 members

BEGIN;

-- Drop ALL old slot constraints first before touching any data
ALTER TABLE profiles      DROP CONSTRAINT IF EXISTS profiles_short_id_check;
ALTER TABLE events        DROP CONSTRAINT IF EXISTS events_who_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_for_user_check;

-- Migrate existing data: M → 1, A → 2
UPDATE profiles      SET short_id  = '1' WHERE short_id  = 'M';
UPDATE profiles      SET short_id  = '2' WHERE short_id  = 'A';
UPDATE events        SET who       = '1' WHERE who        = 'M';
UPDATE events        SET who       = '2' WHERE who        = 'A';
UPDATE notifications SET for_user  = '1' WHERE for_user   = 'M';
UPDATE notifications SET for_user  = '2' WHERE for_user   = 'A';
UPDATE activity      SET actor_short = '1' WHERE actor_short = 'M';
UPDATE activity      SET actor_short = '2' WHERE actor_short = 'A';

-- Add new wider constraints
ALTER TABLE profiles
  ADD CONSTRAINT profiles_short_id_check CHECK (short_id IN ('1','2','3','4'));

ALTER TABLE events
  ADD CONSTRAINT events_who_check CHECK (who IN ('1','2','3','4','B'));

ALTER TABLE notifications
  ADD CONSTRAINT notifications_for_user_check CHECK (for_user IN ('1','2','3','4','B'));

COMMIT;
