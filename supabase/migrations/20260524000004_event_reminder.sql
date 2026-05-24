-- Store the local notification ID so it can be cancelled on event delete.
-- reminder_offset_min: minutes before the event to fire (NULL = no reminder).
-- reminder_notif_id: the expo-notifications scheduled ID stored client-side only
--   (we don't actually need this server-side, but keeping reminder_offset_min
--    lets us reschedule after reinstall in a future version).
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_offset_min int DEFAULT NULL;
