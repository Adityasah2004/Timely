-- Add shared_with column to todos
-- NULL means shared with everyone in the household (existing behaviour).
-- An array of slot IDs (e.g. '{1,3}') means shared only with those members.
ALTER TABLE todos ADD COLUMN IF NOT EXISTS shared_with text[] DEFAULT NULL;
