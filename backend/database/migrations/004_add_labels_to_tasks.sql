-- Add labels column to tasks as JSONB
ALTER TABLE IF EXISTS tasks
ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb;
