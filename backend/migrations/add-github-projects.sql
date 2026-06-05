-- Migration: Add GitHub projects table
-- This enables storing GitHub repository information linked to Pulse projects

-- Set search path to ERP schema
SET search_path TO erp, public;

-- Create github_projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS github_projects (
    id SERIAL PRIMARY KEY,
    github_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    web_url TEXT,
    owner VARCHAR(255) NOT NULL,
    visibility VARCHAR(20) DEFAULT 'private',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add github_project_id to issues table for better linking
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS github_project_id BIGINT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_github_projects_created_by ON github_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_github_projects_name ON github_projects(name);

-- Add comment for clarity
COMMENT ON TABLE github_projects IS 'Stores GitHub repositories integrated with Pulse projects';
