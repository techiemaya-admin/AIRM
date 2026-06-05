-- Migration: Create candidate_calendar_events table for interview scheduling
CREATE TABLE IF NOT EXISTS candidate_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL DEFAULT 'interview',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_candidate_calendar_events_candidate_id ON candidate_calendar_events(candidate_id);