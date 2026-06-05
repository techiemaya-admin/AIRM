-- Recruitment Tables Migration
-- 3-Stage Employee Onboarding Process
-- Stage 1: Technical Round & Interview
-- Stage 2: Background Verification
-- Stage 3: Final Onboarding

-- Main candidates table
CREATE TABLE IF NOT EXISTS recruitment_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Candidate Information
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    position_applied VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    experience_years INTEGER DEFAULT 0,
    current_company VARCHAR(255),
    current_ctc VARCHAR(100),
    expected_ctc VARCHAR(100),
    notice_period VARCHAR(100),
    resume_url TEXT,
    photo_url TEXT,
    
    -- Stage tracking
    current_stage VARCHAR(50) DEFAULT 'interview' CHECK (current_stage IN ('interview', 'verification', 'onboarding')),
    
    -- Status fields
    interview_status VARCHAR(50) DEFAULT 'pending' CHECK (interview_status IN ('pending', 'in_progress', 'passed', 'failed')),
    interview_notes TEXT,
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_progress', 'passed', 'failed')),
    verification_notes TEXT,
    onboarding_status VARCHAR(50) DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'passed', 'failed')),
    
    -- Final outcome
    final_status VARCHAR(50) DEFAULT 'pending' CHECK (final_status IN ('pending', 'hired', 'rejected')),
    rejection_reason TEXT,
    
    -- Offer details
    offer_letter_sent BOOLEAN DEFAULT FALSE,
    offer_accepted BOOLEAN DEFAULT FALSE,
    joining_date DATE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interview rounds table
CREATE TABLE IF NOT EXISTS recruitment_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    round_name VARCHAR(255) NOT NULL,
    interviewer_name VARCHAR(255) NOT NULL,
    interview_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    result VARCHAR(50) DEFAULT 'pending' CHECK (result IN ('pending', 'passed', 'failed')),
    feedback TEXT,
    score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background verification table
CREATE TABLE IF NOT EXISTS recruitment_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('identity', 'education', 'employment', 'criminal', 'reference')),
    verification_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'verified', 'failed')),
    verified_by VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    documents JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_email ON recruitment_candidates(email);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_stage ON recruitment_candidates(current_stage);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_status ON recruitment_candidates(final_status);
CREATE INDEX IF NOT EXISTS idx_recruitment_interviews_candidate ON recruitment_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_verifications_candidate ON recruitment_verifications(candidate_id);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_recruitment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_recruitment_candidates_updated_at ON recruitment_candidates;
CREATE TRIGGER update_recruitment_candidates_updated_at
    BEFORE UPDATE ON recruitment_candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_recruitment_updated_at();

DROP TRIGGER IF EXISTS update_recruitment_interviews_updated_at ON recruitment_interviews;
CREATE TRIGGER update_recruitment_interviews_updated_at
    BEFORE UPDATE ON recruitment_interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_recruitment_updated_at();

DROP TRIGGER IF EXISTS update_recruitment_verifications_updated_at ON recruitment_verifications;
CREATE TRIGGER update_recruitment_verifications_updated_at
    BEFORE UPDATE ON recruitment_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_recruitment_updated_at();

-- Comment on tables
COMMENT ON TABLE recruitment_candidates IS '3-stage hiring process - main candidates table';
COMMENT ON TABLE recruitment_interviews IS 'Interview rounds for candidates (Stage 1)';
COMMENT ON TABLE recruitment_verifications IS 'Background verification checks (Stage 2)';
