-- Migration: Create payroll, payslip, and PF management tables
-- Date: 2025-01-XX
-- Feature: payroll-pf

SET search_path TO erp, public;

-- Payslips Table
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  employee_id TEXT,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  
  -- Earnings
  basic_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  hra DECIMAL(12, 2) DEFAULT 0,
  special_allowance DECIMAL(12, 2) DEFAULT 0,
  bonus DECIMAL(12, 2) DEFAULT 0,
  incentives DECIMAL(12, 2) DEFAULT 0,
  other_earnings DECIMAL(12, 2) DEFAULT 0,
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Deductions
  pf_employee DECIMAL(12, 2) DEFAULT 0,
  pf_employer DECIMAL(12, 2) DEFAULT 0,
  esi_employee DECIMAL(12, 2) DEFAULT 0,
  esi_employer DECIMAL(12, 2) DEFAULT 0,
  professional_tax DECIMAL(12, 2) DEFAULT 0,
  tds DECIMAL(12, 2) DEFAULT 0,
  other_deductions DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Net Pay
  net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Payslip Details
  payslip_id TEXT UNIQUE,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'generated', 'released', 'locked'
  is_locked BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMP,
  released_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Company Details (stored per payslip for historical accuracy)
  company_name TEXT,
  company_address TEXT,
  issue_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE(user_id, month, year)
);

-- PF Details Table (Per Employee)
CREATE TABLE IF NOT EXISTS pf_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uan_number TEXT UNIQUE, -- Universal Account Number
  pf_account_number TEXT,
  enrollment_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'on_hold', 'closed'
  employee_contribution_percent DECIMAL(5, 2) DEFAULT 12.00 CHECK (employee_contribution_percent >= 0 AND employee_contribution_percent <= 100),
  employer_contribution_percent DECIMAL(5, 2) DEFAULT 12.00 CHECK (employer_contribution_percent >= 0 AND employer_contribution_percent <= 100),
  pf_base_salary DECIMAL(12, 2), -- Base salary for PF calculation
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(user_id)
);

-- PF Contributions Table (Monthly History)
CREATE TABLE IF NOT EXISTS pf_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pf_detail_id UUID NOT NULL REFERENCES pf_details(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  basic_salary DECIMAL(12, 2) NOT NULL,
  employee_contribution DECIMAL(12, 2) NOT NULL DEFAULT 0,
  employer_contribution DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_contribution DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payslip_id UUID REFERENCES payslips(id) ON DELETE SET NULL,
  contribution_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'credited', 'failed'
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- PF Documents Table
CREATE TABLE IF NOT EXISTS pf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pf_detail_id UUID REFERENCES pf_details(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'declaration', 'transfer', 'withdrawal', 'settlement', 'other'
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payroll Audit Log
CREATE TABLE IF NOT EXISTS payroll_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'payslip_created', 'payslip_released', 'payslip_locked', 'pf_updated', 'pf_contribution_added'
  entity_type TEXT NOT NULL, -- 'payslip', 'pf_detail', 'pf_contribution'
  entity_id UUID,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payslips_user_id ON payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON payslips(year, month);
CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips(status);
CREATE INDEX IF NOT EXISTS idx_payslips_payslip_id ON payslips(payslip_id);
CREATE INDEX IF NOT EXISTS idx_pf_details_user_id ON pf_details(user_id);
CREATE INDEX IF NOT EXISTS idx_pf_details_uan ON pf_details(uan_number);
CREATE INDEX IF NOT EXISTS idx_pf_contributions_user_id ON pf_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_pf_contributions_pf_detail_id ON pf_contributions(pf_detail_id);
CREATE INDEX IF NOT EXISTS idx_pf_contributions_month_year ON pf_contributions(year, month);
CREATE INDEX IF NOT EXISTS idx_pf_documents_user_id ON pf_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_pf_documents_pf_detail_id ON pf_documents(pf_detail_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_log_user_id ON payroll_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_log_entity ON payroll_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_log_created_at ON payroll_audit_log(created_at);

-- Add comments
COMMENT ON TABLE payslips IS 'Employee payslips with earnings, deductions, and net pay';
COMMENT ON TABLE pf_details IS 'Employee Provident Fund details and configuration';
COMMENT ON TABLE pf_contributions IS 'Monthly PF contribution history';
COMMENT ON TABLE pf_documents IS 'PF-related documents (declarations, transfers, withdrawals)';
COMMENT ON TABLE payroll_audit_log IS 'Audit trail for all payroll and PF operations';

