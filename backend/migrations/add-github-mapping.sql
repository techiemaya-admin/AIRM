-- Migration: Add GitHub mapping columns
-- This enables syncing GitHub users, issues, and commits with Pulse

-- Set search path to ERP schema
SET search_path TO erp, public;

-- Add GitHub mapping columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS github_username VARCHAR(255);

-- Add GitHub mapping columns to issues table  
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS github_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS github_iid INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);
CREATE INDEX IF NOT EXISTS idx_issues_github_id ON issues(github_id);

-- Add comments for clarity
COMMENT ON COLUMN users.github_username IS 'GitHub username';
COMMENT ON COLUMN issues.github_id IS 'GitHub issue ID for mapping';
COMMENT ON COLUMN issues.github_iid IS 'GitHub issue internal ID';
