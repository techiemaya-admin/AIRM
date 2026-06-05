-- Migration: Extended Exit Management Module
-- Date: 2025-01-XX
-- Feature: exit-formalities (Extended)
-- Adds: Asset Recovery, De-Provisioning, Settlement, Compliance, and Smart Features

SET search_path TO erp, public;

-- ============================================
-- 1. UPDATE EXISTING EXIT_REQUESTS TABLE
-- ============================================
-- Add exit_type field to support different exit scenarios
ALTER TABLE exit_requests 
ADD COLUMN IF NOT EXISTS exit_type TEXT DEFAULT 'Resignation' 
CHECK (exit_type IN ('Resignation', 'Termination', 'Absconded', 'Contract End'));

-- Add initiated_by field to track who initiated (employee or HR)
ALTER TABLE exit_requests 
ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add exit_progress_percentage for tracking
ALTER TABLE exit_requests 
ADD COLUMN IF NOT EXISTS exit_progress_percentage INTEGER DEFAULT 0 
CHECK (exit_progress_percentage >= 0 AND exit_progress_percentage <= 100);

-- ============================================
-- 2. ASSET RECOVERY & HANDOVER
-- ============================================

-- Employee Assets Assignment History
CREATE TABLE IF NOT EXISTS employee_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  asset_name TEXT NOT NULL, -- 'Laptop', 'Mobile', 'ID Card', 'Access Card', 'Headset', etc.
  asset_id TEXT, -- Asset ID / Serial Number
  asset_category TEXT, -- 'IT Equipment', 'Access Card', 'ID Card', 'Other'
  assigned_date DATE NOT NULL,
  condition_at_assignment TEXT, -- 'New', 'Good', 'Fair', 'Poor'
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Asset Recovery (Exit-specific)
CREATE TABLE IF NOT EXISTS exit_asset_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  employee_asset_id UUID NOT NULL REFERENCES employee_assets(id) ON DELETE RESTRICT,
  recovery_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'returned', 'damaged', 'lost', 'not_applicable'
  recovery_date DATE,
  condition_on_return TEXT, -- 'Good', 'Fair', 'Poor', 'Damaged', 'Lost'
  remarks TEXT,
  photo_url TEXT, -- URL to photo of asset condition
  recovered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  employee_acknowledged BOOLEAN DEFAULT FALSE,
  employee_acknowledged_at TIMESTAMP,
  admin_acknowledged BOOLEAN DEFAULT FALSE,
  admin_acknowledged_at TIMESTAMP,
  cost_recovery DECIMAL(12, 2) DEFAULT 0, -- Cost if asset is lost/damaged
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exit_request_id, employee_asset_id)
);

-- Asset Handover Document
CREATE TABLE IF NOT EXISTS exit_asset_handover (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  handover_document_url TEXT, -- PDF URL
  employee_signature_url TEXT, -- Digital signature
  admin_signature_url TEXT, -- Admin signature
  signed_at TIMESTAMP,
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(exit_request_id)
);

-- ============================================
-- 3. DE-PROVISIONING (SYSTEM ACCESS)
-- ============================================

-- System Access De-Provisioning Checklist
CREATE TABLE IF NOT EXISTS exit_access_deprovisioning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL, -- 'Email', 'Git', 'VPN', 'CRM', 'ERP', 'Cloud Platform', etc.
  system_type TEXT, -- 'Email', 'Version Control', 'Network', 'CRM', 'ERP', 'Cloud', 'Other'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'revoked', 'not_applicable'
  revocation_timestamp TIMESTAMP,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  auto_revoked BOOLEAN DEFAULT FALSE, -- True if auto-triggered on last working day
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exit_request_id, system_name)
);

-- ============================================
-- 4. EMPLOYEE DUES & FINAL SETTLEMENT
-- ============================================

-- Employee Payable Dues
CREATE TABLE IF NOT EXISTS exit_payable_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  due_type TEXT NOT NULL, -- 'pending_salary', 'leave_encashment', 'bonus', 'incentives', 'reimbursements', 'other'
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  calculated_date DATE,
  calculated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee Recoverable Dues
CREATE TABLE IF NOT EXISTS exit_recoverable_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  due_type TEXT NOT NULL, -- 'unreturned_assets', 'damaged_assets', 'salary_advance', 'notice_period_shortfall', 'loan_deduction', 'other'
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  calculated_date DATE,
  calculated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  recovered BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMP,
  recovery_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Final Settlement Summary
CREATE TABLE IF NOT EXISTS exit_settlement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  total_payable DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_recoverable DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_settlement_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- payable - recoverable
  settlement_status TEXT NOT NULL DEFAULT 'calculated', -- 'calculated', 'approved', 'paid'
  calculated_at TIMESTAMP DEFAULT NOW(),
  calculated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMP,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  payment_reference TEXT,
  settlement_statement_url TEXT, -- PDF URL
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exit_request_id)
);

-- ============================================
-- 5. PF, GRATUITY & COMPLIANCE
-- ============================================

-- PF Exit Management
CREATE TABLE IF NOT EXISTS exit_pf_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  pf_detail_id UUID REFERENCES pf_details(id) ON DELETE SET NULL,
  pf_exit_initiated BOOLEAN DEFAULT FALSE,
  pf_exit_initiated_at TIMESTAMP,
  pf_exit_initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  pf_exit_completed BOOLEAN DEFAULT FALSE,
  pf_exit_completed_at TIMESTAMP,
  pf_withdrawal_amount DECIMAL(12, 2) DEFAULT 0,
  pf_withdrawal_status TEXT DEFAULT 'pending', -- 'pending', 'initiated', 'processed', 'completed'
  pf_uan_number TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exit_request_id)
);

-- Gratuity Calculation
CREATE TABLE IF NOT EXISTS exit_gratuity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  eligible BOOLEAN DEFAULT FALSE,
  years_of_service DECIMAL(5, 2) DEFAULT 0,
  last_drawn_salary DECIMAL(12, 2) DEFAULT 0,
  gratuity_amount DECIMAL(12, 2) DEFAULT 0,
  calculated_at TIMESTAMP,
  calculated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exit_request_id)
);

-- Exit Compliance Checklist
CREATE TABLE IF NOT EXISTS exit_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  compliance_item TEXT NOT NULL, -- 'NDA', 'Non-Compete', 'Confidentiality', 'Data Return', 'Legal Hold', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'not_applicable'
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  document_url TEXT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exit_request_id, compliance_item)
);

-- Compliance Documents Storage
CREATE TABLE IF NOT EXISTS exit_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'NDA', 'Non-Compete', 'Confidentiality Agreement', 'Legal Hold Notice', etc.
  document_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. EXIT DOCUMENTS & COMMUNICATION
-- ============================================

-- Update exit_documents to support more document types
-- (Table already exists, but we'll add support for new types via application logic)

-- Exit Communication Log
CREATE TABLE IF NOT EXISTS exit_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL, -- 'email', 'notification', 'reminder', 'alert'
  subject TEXT,
  message TEXT,
  sent_to UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  metadata JSONB, -- Additional data like email template, attachments, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. SMART ADD-ONS
-- ============================================

-- Exit Reminders
CREATE TABLE IF NOT EXISTS exit_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'clearance_pending', 'asset_recovery', 'settlement_pending', 'document_pending'
  reminder_for UUID REFERENCES users(id) ON DELETE SET NULL, -- Who should be reminded
  reminder_message TEXT,
  due_date DATE,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Asset Risk Flags
CREATE TABLE IF NOT EXISTS exit_asset_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  employee_asset_id UUID REFERENCES employee_assets(id) ON DELETE SET NULL,
  risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  risk_reason TEXT,
  flagged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  flagged_at TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exit Reports (for export)
CREATE TABLE IF NOT EXISTS exit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES exit_requests(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'full', 'summary', 'asset_handover', 'settlement', 'compliance'
  report_url TEXT NOT NULL, -- PDF/Excel URL
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  parameters JSONB -- Filters, date ranges, etc. used to generate report
);

-- ============================================
-- 8. INDEXES
-- ============================================

-- Employee Assets
CREATE INDEX IF NOT EXISTS idx_employee_assets_user_id ON employee_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_assets_asset_id ON employee_assets(asset_id);

-- Asset Recovery
CREATE INDEX IF NOT EXISTS idx_exit_asset_recovery_exit_request_id ON exit_asset_recovery(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_asset_recovery_status ON exit_asset_recovery(recovery_status);

-- De-Provisioning
CREATE INDEX IF NOT EXISTS idx_exit_access_deprovisioning_exit_request_id ON exit_access_deprovisioning(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_access_deprovisioning_status ON exit_access_deprovisioning(status);

-- Settlement
CREATE INDEX IF NOT EXISTS idx_exit_payable_dues_exit_request_id ON exit_payable_dues(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_recoverable_dues_exit_request_id ON exit_recoverable_dues(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_settlement_exit_request_id ON exit_settlement(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_settlement_status ON exit_settlement(settlement_status);

-- PF & Gratuity
CREATE INDEX IF NOT EXISTS idx_exit_pf_management_exit_request_id ON exit_pf_management(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_gratuity_exit_request_id ON exit_gratuity(exit_request_id);

-- Compliance
CREATE INDEX IF NOT EXISTS idx_exit_compliance_exit_request_id ON exit_compliance(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_compliance_documents_exit_request_id ON exit_compliance_documents(exit_request_id);

-- Communications & Reminders
CREATE INDEX IF NOT EXISTS idx_exit_communications_exit_request_id ON exit_communications(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_reminders_exit_request_id ON exit_reminders(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_reminders_sent ON exit_reminders(sent);

-- Asset Risks
CREATE INDEX IF NOT EXISTS idx_exit_asset_risks_exit_request_id ON exit_asset_risks(exit_request_id);
CREATE INDEX IF NOT EXISTS idx_exit_asset_risks_risk_level ON exit_asset_risks(risk_level);

-- Reports
CREATE INDEX IF NOT EXISTS idx_exit_reports_exit_request_id ON exit_reports(exit_request_id);

-- ============================================
-- 9. COMMENTS
-- ============================================

COMMENT ON TABLE employee_assets IS 'Employee asset assignment history';
COMMENT ON TABLE exit_asset_recovery IS 'Asset recovery tracking during exit';
COMMENT ON TABLE exit_asset_handover IS 'Asset handover document with digital signatures';
COMMENT ON TABLE exit_access_deprovisioning IS 'System access de-provisioning checklist';
COMMENT ON TABLE exit_payable_dues IS 'Employee payable dues (salary, leave encashment, etc.)';
COMMENT ON TABLE exit_recoverable_dues IS 'Employee recoverable dues (assets, advances, etc.)';
COMMENT ON TABLE exit_settlement IS 'Final settlement summary and status';
COMMENT ON TABLE exit_pf_management IS 'PF exit initiation and withdrawal tracking';
COMMENT ON TABLE exit_gratuity IS 'Gratuity eligibility and calculation';
COMMENT ON TABLE exit_compliance IS 'Exit compliance checklist items';
COMMENT ON TABLE exit_compliance_documents IS 'Compliance documents storage';
COMMENT ON TABLE exit_communications IS 'Exit-related communication log';
COMMENT ON TABLE exit_reminders IS 'Automated reminders for pending exit tasks';
COMMENT ON TABLE exit_asset_risks IS 'Asset risk flagging and resolution tracking';
COMMENT ON TABLE exit_reports IS 'Generated exit reports for export';

