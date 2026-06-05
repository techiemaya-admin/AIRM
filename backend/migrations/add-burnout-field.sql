-- Migration: Add burnout field to profiles
-- Tracks employee burnout risk level (0-100 scale)

SET search_path TO erp, public;

-- Add burnout field
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS burnout_score INTEGER DEFAULT 0 CHECK (burnout_score >= 0 AND burnout_score <= 100);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_burnout_score ON profiles(burnout_score);

-- Add comment for clarity
COMMENT ON COLUMN profiles.burnout_score IS 'Employee burnout risk score (0-100, where 0 is no risk and 100 is high risk)';

-- Show successful migration
SELECT 'Burnout field added successfully' AS status;

