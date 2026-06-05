-- Migration: Create exit formalities tables
-- Date: 2025-01-XX
-- Feature: exit-formalities

SET search_path TO erp, public;

-- Exit Requests Table
CREATE TABLE IF NOT EXISTS exit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  employee_id TEXT,
  full_name TEXT NOT NULL,
  department TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resignation_date DATE NOT NULL,
  last_working_day DATE NOT NULL,
  reason_category TEXT, -- 'Personal', 'Better Opportunity', 'Relocation', 'Health', 'Other'
  reason_details TEXT,
  resignation_letter_url TEXT,
  status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated', 'manager_approved', 'hr_approved', 'clearance_pending', 'clearance_completed', 'settlement_pending', 'completed', 'cancelled'
  initiated_at TIMESTAMP DEFAULT NOW(),
  manager_approved_at TIMESTAMP,
  hr_approved_at TIMESTAMP,
  clearance_completed_at TIMESTAMP,
  settlement_completed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Exit Clearance Checklist
CREATE TABLE IF NOT EXISTS exit_clearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  department TEXT NOT NULL, -- 'IT', 'Finance', 'HR', 'Admin'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  comments TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exit_request_id, department)
);

-- Exit Interview
CREATE TABLE IF NOT EXISTS exit_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  conducted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  feedback_questions JSONB, -- Structured feedback data
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  would_recommend BOOLEAN,
  suggestions TEXT,
  conducted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Exit Documents
CREATE TABLE IF NOT EXISTS exit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'final_payslip', 'settlement', 'form16', 'experience_certificate'
  document_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exit Activity Log
CREATE TABLE IF NOT EXISTS exit_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'initiated', 'approved', 'rejected', 'cleared', 'completed'
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exit_requests_user_id ON exit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_exit_requests_status ON exit_requests(status);
CREATE INDEX IF NOT EXISTS idx_exit_requests_manager_id ON exit_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_exit_clearance_exit_request_id ON exit_clearance(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_interviews_exit_request_id ON exit_interviews(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_documents_exit_request_id ON exit_documents(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_activity_log_exit_request_id ON exit_activity_log(exit_request_id);

-- Add comments
COMMENT ON TABLE exit_requests IS 'Employee exit requests and workflow status';
COMMENT ON TABLE exit_clearance IS 'Department-wise clearance checklist for exits';
COMMENT ON TABLE exit_interviews IS 'Exit interview feedback and analytics';
COMMENT ON TABLE exit_documents IS 'Exit-related documents (payslips, settlements, etc.)';
COMMENT ON TABLE exit_activity_log IS 'Audit log for all exit-related activities';



