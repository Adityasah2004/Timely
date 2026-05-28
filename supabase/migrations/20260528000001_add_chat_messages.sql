-- ================================================================
-- Timely — Migration: Add Chat Messages for Startup War Room
-- ================================================================

CREATE TABLE IF NOT EXISTS messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  sender_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_short char(1) NOT NULL, -- '1'..'4' or 'S' for system/AI
  content      text NOT NULL,
  is_system    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Row-Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: household"
  ON messages FOR ALL TO authenticated
  USING     (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
