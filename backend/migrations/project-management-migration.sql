-- Project Management Migration
-- Creates tables for managing projects and issues with GitLab integration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create gitlab_projects table
CREATE TABLE IF NOT EXISTS gitlab_projects (
    id SERIAL PRIMARY KEY,
    gitlab_project_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    web_url TEXT,
    visibility VARCHAR(20) DEFAULT 'private',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update gitlab_issues table structure to match new requirements
ALTER TABLE gitlab_issues 
    ADD COLUMN IF NOT EXISTS estimate_hours DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS gitlab_iid INTEGER;

-- Create index on gitlab_iid for faster lookups
CREATE INDEX IF NOT EXISTS idx_gitlab_issues_iid ON gitlab_issues(gitlab_iid);
CREATE INDEX IF NOT EXISTS idx_gitlab_issues_project_id ON gitlab_issues(project_id);

-- Update issue_assignees table to ensure proper relationships
-- Make sure we have the right structure for assignments
CREATE TABLE IF NOT EXISTS issue_assignees (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES gitlab_issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(issue_id, user_id)
);

-- Update issue_comments table to reference gitlab_issues
ALTER TABLE issue_comments 
    DROP CONSTRAINT IF EXISTS issue_comments_issue_id_fkey;

ALTER TABLE issue_comments 
    ADD CONSTRAINT issue_comments_issue_id_fkey 
    FOREIGN KEY (issue_id) REFERENCES gitlab_issues(id) ON DELETE CASCADE;

-- Update issue_activity table to reference gitlab_issues
ALTER TABLE issue_activity 
    DROP CONSTRAINT IF EXISTS issue_activity_issue_id_fkey;

ALTER TABLE issue_activity 
    ADD CONSTRAINT issue_activity_issue_id_fkey 
    FOREIGN KEY (issue_id) REFERENCES gitlab_issues(id) ON DELETE CASCADE;

-- Update issue_labels table to reference gitlab_issues
ALTER TABLE issue_labels 
    DROP CONSTRAINT IF EXISTS issue_labels_issue_id_fkey;

ALTER TABLE issue_labels 
    ADD CONSTRAINT issue_labels_issue_id_fkey 
    FOREIGN KEY (issue_id) REFERENCES gitlab_issues(id) ON DELETE CASCADE;

-- Create project members table for managing project access
CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES gitlab_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_level INTEGER DEFAULT 30, -- GitLab access levels: 10=Guest, 20=Reporter, 30=Developer, 40=Maintainer, 50=Owner
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gitlab_projects_created_by ON gitlab_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_gitlab_issues_created_by ON gitlab_issues(created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_gitlab_projects_updated_at ON gitlab_projects;
CREATE TRIGGER update_gitlab_projects_updated_at 
    BEFORE UPDATE ON gitlab_projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gitlab_issues_updated_at ON gitlab_issues;
CREATE TRIGGER update_gitlab_issues_updated_at 
    BEFORE UPDATE ON gitlab_issues 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- You can uncomment this if you want sample projects

-- INSERT INTO gitlab_projects (gitlab_project_id, name, description, web_url, visibility) VALUES
-- (1, 'Sample Project', 'A sample project for testing', 'https://git.techiemaya.com/admin/sample-project', 'private')
-- ON CONFLICT (gitlab_project_id) DO NOTHING;

COMMENT ON TABLE gitlab_projects IS 'Stores GitLab projects synced with the application';
COMMENT ON TABLE project_members IS 'Manages project member access levels';
COMMENT ON COLUMN gitlab_issues.estimate_hours IS 'Estimated hours for the issue';
COMMENT ON COLUMN gitlab_issues.start_date IS 'Planned start date for the issue';
COMMENT ON COLUMN gitlab_issues.due_date IS 'Due date for the issue';
COMMENT ON COLUMN gitlab_issues.gitlab_iid IS 'GitLab internal ID (issue number within project)';