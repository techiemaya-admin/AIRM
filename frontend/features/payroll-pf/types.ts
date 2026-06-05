/**
 * Payroll & PF Feature Types
 * DTOs, API response types, and domain types
 */

/**
 * Payslip DTO
 */
export interface Payslip {
  id: string;
  user_id: string;
  employee_id?: string | null;
  email?: string;
  full_name?: string;
  month: number;
  year: number;
  basic_pay: number;
  hra: number;
  special_allowance: number;
  bonus: number;
  incentives: number;
  other_earnings: number;
  total_earnings: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  esi_employer: number;
  professional_tax: number;
  tds: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  payslip_id?: string | null;
  document_url?: string | null;
  status: PayslipStatus;
  is_locked: boolean;
  released_at?: string | null;
  released_by?: string | null;
  released_by_name?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  issue_date?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
}

/**
 * Payslip Status
 */
export type PayslipStatus = 'pending' | 'generated' | 'released' | 'locked';

/**
 * PF Details DTO
 */
export interface PfDetails {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  uan_number?: string | null;
  pf_account_number?: string | null;
  enrollment_date?: string | null;
  status: PfStatus;
  employee_contribution_percent: number;
  employer_contribution_percent: number;
  pf_base_salary: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
  updated_by_name?: string | null;
}

/**
 * PF Status
 */
export type PfStatus = 'active' | 'on_hold' | 'closed';

/**
 * PF Contribution DTO
 */
export interface PfContribution {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  pf_detail_id: string;
  uan_number?: string | null;
  month: number;
  year: number;
  basic_salary: number;
  employee_contribution: number;
  employer_contribution: number;
  total_contribution: number;
  payslip_id?: string | null;
  contribution_date?: string | null;
  status: PfContributionStatus;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * PF Contribution Status
 */
export type PfContributionStatus = 'pending' | 'credited' | 'failed';

/**
 * PF Document DTO
 */
export interface PfDocument {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  pf_detail_id?: string | null;
  document_type: string;
  document_name: string;
  document_url: string;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
  uploaded_at: string;
  created_at: string;
}

/**
 * Payroll Audit Log Entry
 */
export interface PayrollAuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  performed_by?: string | null;
  performed_by_name?: string | null;
  details?: any;
  ip_address?: string | null;
  created_at: string;
}

/**
 * Create/Update Payslip Request
 */
export interface UpsertPayslipRequest {
  id?: string;
  user_id: string;
  employee_id?: string;
  month: number;
  year: number;
  basic_pay: number;
  hra?: number;
  special_allowance?: number;
  bonus?: number;
  incentives?: number;
  other_earnings?: number;
  pf_employee?: number;
  pf_employer?: number;
  esi_employee?: number;
  esi_employer?: number;
  professional_tax?: number;
  tds?: number;
  other_deductions?: number;
  payslip_id?: string;
  document_url?: string;
  status?: PayslipStatus;
  company_name?: string;
  company_address?: string;
  issue_date?: string;
}

/**
 * Create/Update PF Details Request
 */
export interface UpsertPfDetailsRequest {
  user_id: string;
  uan_number?: string;
  pf_account_number?: string;
  enrollment_date?: string;
  status?: PfStatus;
  employee_contribution_percent?: number;
  employer_contribution_percent?: number;
  pf_base_salary?: number;
  notes?: string;
}

/**
 * Create PF Contribution Request
 */
export interface CreatePfContributionRequest {
  user_id: string;
  pf_detail_id: string;
  month: number;
  year: number;
  basic_salary: number;
  employee_contribution?: number;
  employer_contribution?: number;
  total_contribution?: number;
  payslip_id?: string;
  contribution_date?: string;
  status?: PfContributionStatus;
  remarks?: string;
}

/**
 * Add PF Document Request
 */
export interface AddPfDocumentRequest {
  user_id: string;
  pf_detail_id?: string;
  document_type: string;
  document_name: string;
  document_url: string;
}

/**
 * API Response Types
 */
export interface GetPayslipsResponse {
  payslips: Payslip[];
}

export interface GetPayslipResponse {
  payslip: Payslip;
}

export interface UpsertPayslipResponse {
  message: string;
  payslip: Payslip;
}

export interface GetPfDetailsResponse {
  pf_details: PfDetails | null;
}

export interface UpsertPfDetailsResponse {
  message: string;
  pf_details: PfDetails;
}

export interface GetPfContributionsResponse {
  contributions: PfContribution[];
}

export interface CreatePfContributionResponse {
  message: string;
  contribution: PfContribution;
}

export interface GetPfDocumentsResponse {
  documents: PfDocument[];
}

export interface AddPfDocumentResponse {
  message: string;
  document: PfDocument;
}

export interface GetPayrollAuditLogResponse {
  audit_log: PayrollAuditLog[];
}

