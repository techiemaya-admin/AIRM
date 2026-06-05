-- Migration: Add extended profile fields for comprehensive employee profiles
-- Adds fields for job title, department, employment type, reporting manager, etc.

SET search_path TO erp, public;

-- Add extended profile fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-time',
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS reporting_manager TEXT,
ADD COLUMN IF NOT EXISTS personal_email TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS education JSONB,
ADD COLUMN IF NOT EXISTS certifications JSONB,
ADD COLUMN IF NOT EXISTS project_history JSONB,
ADD COLUMN IF NOT EXISTS performance_reviews JSONB,
ADD COLUMN IF NOT EXISTS documents JSONB;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON profiles(job_title);
CREATE INDEX IF NOT EXISTS idx_profiles_employment_type ON profiles(employment_type);

-- Add comments for clarity
COMMENT ON COLUMN profiles.job_title IS 'Employee job title/position';
COMMENT ON COLUMN profiles.department IS 'Department the employee belongs to';
COMMENT ON COLUMN profiles.employment_type IS 'Type of employment: Full-time, Contract, Intern';
COMMENT ON COLUMN profiles.employee_id IS 'Company employee ID';
COMMENT ON COLUMN profiles.reporting_manager IS 'Name or ID of reporting manager';
COMMENT ON COLUMN profiles.personal_email IS 'Personal email address (optional)';
COMMENT ON COLUMN profiles.emergency_contact IS 'Emergency contact information';
COMMENT ON COLUMN profiles.education IS 'JSON array of education records';
COMMENT ON COLUMN profiles.certifications IS 'JSON array of certifications';
COMMENT ON COLUMN profiles.project_history IS 'JSON array of projects worked on in company';
COMMENT ON COLUMN profiles.performance_reviews IS 'JSON array of performance review records';
COMMENT ON COLUMN profiles.documents IS 'JSON array of document references';

-- Show successful migration
SELECT 'Extended profile fields added successfully' AS status;

