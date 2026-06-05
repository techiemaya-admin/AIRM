-- Add estimate field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimate INTEGER DEFAULT 8;
