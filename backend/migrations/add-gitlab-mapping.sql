-- Migration: Add GitLab mapping columns
-- This enables syncing GitLab users, issues, and commits with Pulse

-- Set search path to ERP schema
SET search_path TO erp, public;

-- Add GitLab mapping columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gitlab_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS gitlab_username VARCHAR(255);

-- Add GitLab mapping columns to issues table  
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS gitlab_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS gitlab_iid INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_gitlab_id ON users(gitlab_id);
CREATE INDEX IF NOT EXISTS idx_issues_gitlab_id ON issues(gitlab_id);

-- Add comments for clarity
COMMENT ON COLUMN users.gitlab_id IS 'GitLab user ID for mapping';
COMMENT ON COLUMN users.gitlab_username IS 'GitLab username';
COMMENT ON COLUMN issues.gitlab_id IS 'GitLab issue ID for mapping';
COMMENT ON COLUMN issues.gitlab_iid IS 'GitLab issue internal ID';

-- Show successful migration
SELECT 'GitLab mapping columns added successfully' AS status;