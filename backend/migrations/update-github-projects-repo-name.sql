-- Migration: Add repo_name to github_projects
-- This allows storing the sanitized GitHub repo name separately from the project display name

SET search_path TO erp, public;

ALTER TABLE github_projects 
ADD COLUMN IF NOT EXISTS repo_name VARCHAR(255);

-- Update existing rows (if any) to set repo_name to current name
UPDATE github_projects SET repo_name = name WHERE repo_name IS NULL;

-- Create index for repo_name
CREATE INDEX IF NOT EXISTS idx_github_projects_repo_name ON github_projects(repo_name);
