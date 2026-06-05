-- Backfill default columns for existing projects that have NULL or empty columns
UPDATE projects
SET columns = '["Todo", "Sprint", "Review", "Completed"]'::jsonb
WHERE columns IS NULL OR columns = '[]'::jsonb;
