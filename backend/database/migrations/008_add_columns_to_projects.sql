-- Add columns jsonb field to projects table to store custom columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS columns JSONB DEFAULT '["Todo", "Sprint", "Review", "Completed"]'::jsonb;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_columns ON projects USING GIN (columns);
