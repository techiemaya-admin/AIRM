/**
 * Exit Formalities Feature Types
 * DTOs, API response types, and domain types
 */

/**
 * Exit Request DTO
 */
export interface ExitRequest {
  id: string;
  user_id: string;
  employee_id?: string | null;
  full_name: string;
  email?: string;
  department?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  resignation_date: string;
  last_working_day: string;
  reason_category?: string | null;
  reason_details?: string | null;
  resignation_letter_url?: string | null;
  exit_type?: 'Resignation' | 'Termination' | 'Absconded' | 'Contract End';
  exit_progress_percentage?: number;
  initiated_by?: string | null;
  status: ExitStatus;
  initiated_at: string;
  manager_approved_at?: string | null;
  hr_approved_at?: string | null;
  clearance_completed_at?: string | null;
  settlement_completed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Exit Status Types
 */
export type ExitStatus =
  | 'initiated'
  | 'manager_approved'
  | 'hr_approved'
  | 'clearance_pending'
  | 'clearance_completed'
  | 'settlement_pending'
  | 'completed'
  | 'cancelled';

/**
 * Exit Clearance Item
 */
export interface ExitClearance {
  id: string;
  exit_request_id: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id?: string | null;
  approver_name?: string | null;
  approver_email?: string | null;
  comments?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Exit Interview
 */
export interface ExitInterview {
  id: string;
  exit_request_id: string;
  conducted_by?: string | null;
  conducted_by_name?: string | null;
  feedback_questions?: any;
  overall_rating?: number | null;
  would_recommend?: boolean | null;
  suggestions?: string | null;
  conducted_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Exit Document
 */
export interface ExitDocument {
  id: string;
  exit_request_id: string;
  document_type: string;
  document_url: string;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
  uploaded_at: string;
  created_at: string;
}

/**
 * Exit Activity Log Entry
 */
export interface ExitActivityLog {
  id: string;
  exit_request_id: string;
  action: string;
  performed_by?: string | null;
  performed_by_name?: string | null;
  performed_by_email?: string | null;
  details?: any;
  created_at: string;
}

/**
 * Create Exit Request Request
 */
export interface CreateExitRequestRequest {
  user_id?: string;
  employee_id?: string;
  full_name: string;
  department?: string;
  manager_id?: string;
  resignation_date: string;
  last_working_day: string;
  reason_category?: string;
  reason_details?: string;
  resignation_letter_url?: string;
  exit_type?: 'Resignation' | 'Termination' | 'Absconded' | 'Contract End';
}

/**
 * Update Exit Request Request
 */
export interface UpdateExitRequestRequest {
  resignation_date?: string;
  last_working_day?: string;
  reason_category?: string;
  reason_details?: string;
  resignation_letter_url?: string;
}

/**
 * Approve Exit Request Request
 */
export interface ApproveExitRequestRequest {
  role: 'manager' | 'hr';
}

/**
 * Update Clearance Request
 */
export interface UpdateClearanceRequest {
  department: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
}

/**
 * Save Exit Interview Request
 */
export interface SaveExitInterviewRequest {
  feedback_questions?: any;
  overall_rating?: number;
  would_recommend?: boolean;
  suggestions?: string;
}

/**
 * Add Exit Document Request
 */
export interface AddExitDocumentRequest {
  document_type: string;
  document_url: string;
}

/**
 * API Response Types
 */
export interface GetAllExitRequestsResponse {
  exit_requests: ExitRequest[];
}

export interface GetExitRequestResponse {
  exit_request: ExitRequest;
  clearance: ExitClearance[];
  interview?: ExitInterview | null;
  documents: ExitDocument[];
  activity_log: ExitActivityLog[];
}

export interface CreateExitRequestResponse {
  message: string;
  exit_request: ExitRequest;
}

export interface UpdateExitRequestResponse {
  message: string;
  exit_request: ExitRequest;
}

// ============================================
// ASSET RECOVERY & HANDOVER
// ============================================

export interface EmployeeAsset {
  id: string;
  user_id: string;
  asset_name: string;
  asset_id?: string | null;
  asset_category?: string | null;
  assigned_date: string;
  condition_at_assignment?: string | null;
  assigned_by?: string | null;
  assigned_by_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitAssetRecovery {
  id: string;
  exit_request_id: string;
  employee_asset_id: string;
  asset_name?: string;
  asset_id?: string;
  asset_category?: string;
  recovery_status: 'pending' | 'returned' | 'damaged' | 'lost' | 'not_applicable';
  recovery_date?: string | null;
  condition_on_return?: string | null;
  remarks?: string | null;
  photo_url?: string | null;
  recovered_by?: string | null;
  recovered_by_name?: string | null;
  employee_acknowledged: boolean;
  employee_acknowledged_at?: string | null;
  admin_acknowledged: boolean;
  admin_acknowledged_at?: string | null;
  cost_recovery: number;
  created_at: string;
  updated_at: string;
}

export interface ExitAssetHandover {
  id: string;
  exit_request_id: string;
  handover_document_url?: string | null;
  employee_signature_url?: string | null;
  admin_signature_url?: string | null;
  signed_at?: string | null;
  generated_at: string;
  generated_by?: string | null;
  generated_by_name?: string | null;
}

// ============================================
// DE-PROVISIONING
// ============================================

export interface ExitAccessDeprovisioning {
  id: string;
  exit_request_id: string;
  system_name: string;
  system_type?: string | null;
  status: 'pending' | 'revoked' | 'not_applicable';
  revocation_timestamp?: string | null;
  revoked_by?: string | null;
  revoked_by_name?: string | null;
  auto_revoked: boolean;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// EMPLOYEE DUES & SETTLEMENT
// ============================================

export interface ExitPayableDue {
  id: string;
  exit_request_id: string;
  due_type: 'pending_salary' | 'leave_encashment' | 'bonus' | 'incentives' | 'reimbursements' | 'other';
  description?: string | null;
  amount: number;
  calculated_date?: string | null;
  calculated_by?: string | null;
  calculated_by_name?: string | null;
  approved: boolean;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  paid: boolean;
  paid_at?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitRecoverableDue {
  id: string;
  exit_request_id: string;
  due_type: 'unreturned_assets' | 'damaged_assets' | 'salary_advance' | 'notice_period_shortfall' | 'loan_deduction' | 'other';
  description?: string | null;
  amount: number;
  calculated_date?: string | null;
  calculated_by?: string | null;
  calculated_by_name?: string | null;
  approved: boolean;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  recovered: boolean;
  recovered_at?: string | null;
  recovery_reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitSettlement {
  id: string;
  exit_request_id: string;
  total_payable: number;
  total_recoverable: number;
  net_settlement_amount: number;
  settlement_status: 'calculated' | 'approved' | 'paid';
  calculated_at: string;
  calculated_by?: string | null;
  calculated_by_name?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
  paid_by_name?: string | null;
  payment_reference?: string | null;
  settlement_statement_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Final Settlement Calculation Result
 */
export interface FinalSettlement {
  id?: string;
  exit_request_id?: string;
  earnings: {
    salaryPayable: number;
    leaveEncashment: number;
    bonus: number;
    incentives: number;
    reimbursements: number;
    totalPayable: number;
  };
  deductions: {
    noticeRecovery: number;
    assetRecovery: number;
    loans: number;
    advances: number;
    pendingRecoveries: number;
    statutoryDeductions: number;
    totalRecoverable: number;
  };
  netSettlement: number;
  settlementStatus: 'company_pays_employee' | 'employee_pays_company' | 'fully_settled';
  details?: {
    salaryCalculation?: any;
    leaveEncashment?: any;
    noticeRecovery?: any;
    assetRecoveries?: any[];
    statutoryDeductions?: any;
  };
  metadata?: {
    calculatedAt: string;
    lastWorkingDay: string;
    dateOfJoining: string;
    employmentType: string;
    noticePeriodRequired: number;
    noticePeriodServed: number;
  };
}

/**
 * PDF Data Types
 */
export interface SettlementPDFData {
  title: string;
  companyDetails: {
    name: string;
    address: string;
    logo?: string | null;
  };
  employeeDetails: {
    name: string;
    employeeId: string;
    department: string;
    dateOfJoining: string;
    lastWorkingDay: string;
    designation: string;
  };
  earnings: Array<{ component: string; amount: number }>;
  totalEarnings: number;
  deductions: Array<{ component: string; amount: number }>;
  totalDeductions: number;
  netSettlement: number;
  settlementStatus: string;
  declaration: string;
  signatures: {
    hr: { name: string; signature?: string | null; date: string };
    finance: { name: string; signature?: string | null; date: string };
    employee: { name: string; signature?: string | null; date: string };
    authorized: { name: string; signature?: string | null; date: string };
  };
  generatedAt: string;
  settlementId: string;
}

export interface AssetHandoverPDFData {
  title: string;
  companyDetails: {
    name: string;
    address: string;
    logo?: string | null;
  };
  employeeDetails: {
    name: string;
    employeeId: string;
    department: string;
    lastWorkingDay: string;
  };
  assets: Array<{
    assetName: string;
    assetId: string;
    conditionAtIssue: string;
    conditionAtReturn: string;
    status: string;
    remarks: string;
    assetCategory?: string | null;
    brand?: string | null;
    model?: string | null;
    configuration?: string | null;
  }>;
  declaration: string;
  signatures: {
    employee: { name: string; signature?: string | null; date: string };
    admin: { name: string; signature?: string | null; date: string };
  };
  generatedAt: string;
  templateFormat?: {
    title?: string;
    companyInfo?: {
      name?: string;
      fullName?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      cin?: string;
    } | null;
    signatureBlock?: {
      signatoryName?: string;
      signatoryTitle?: string;
      employeeLabel?: string;
      adminLabel?: string;
    } | null;
    letterFormat?: {
      hasHeader?: boolean;
      hasFooter?: boolean;
      hasLogo?: boolean;
      hasRefNumber?: boolean;
      hasDate?: boolean;
      hasSubject?: boolean;
      hasNumberedList?: boolean;
      hasSignature?: boolean;
      layout?: string;
    } | null;
    instructions?: string[];
    acknowledgement?: string | null;
    tableHeaders?: string[];
    employeeFieldLabels?: string[];
    logoImage?: string | null;
    signatureImage?: string | null;
    templateImage?: string | null;
    layout?: {
      imageWidth?: number;
      imageHeight?: number;
    } | null;
  };
}

export interface ExperienceLetterPDFData {
  title: string;
  companyDetails: {
    name: string;
    address: string;
    logo?: string | null;
  };
  employeeDetails: {
    name: string;
    employeeId: string;
    designation: string;
  };
  employmentDetails: {
    dateOfJoining: string;
    lastWorkingDay: string;
    role: string;
    department: string;
    projects: any[];
    grossSalary?: number | null;
    reasonForLeaving?: string;
    gender?: string;
  };
  content: string;
  signature: {
    name: string;
    designation: string;
    signature?: string | null;
    date: string;
  };
  companySeal?: string | null;
  generatedAt: string;
  // Template format settings - Dynamic template data from uploaded template
  templateFormat?: {
    useNumberedFormat?: boolean;
    refNumber?: string;
    layout?: 'numbered_list' | 'paragraph' | 'table' | 'standard';
    // Company info from template
    companyInfo?: {
      name?: string;
      fullName?: string;
      legalName?: string;
      logo?: string;
      address?: string;
      city?: string;
      country?: string;
      phone?: string;
      fax?: string;
      email?: string;
      website?: string;
      cin?: string;
      registeredOffice?: string;
      refNumberPrefix?: string;
    };
    // Signature block from template
    signatureBlock?: {
      signatoryName?: string;
      signatoryTitle?: string;
      hasSignatureImage?: boolean;
    };
    // Letter format from template
    letterFormat?: {
      hasHeader?: boolean;
      hasFooter?: boolean;
      hasLogo?: boolean;
      hasRefNumber?: boolean;
      hasDate?: boolean;
      hasNumberedList?: boolean;
      hasSignature?: boolean;
      title?: string;
    };
    // Footer lines from template
    footerLines?: string[];
    // Uploaded branding images (base64 data URLs)
    logoImage?: string | null;
    signatureImage?: string | null;
  };
}

export interface RelievingLetterPDFData {
  title: string;
  companyDetails: {
    name: string;
    address: string;
    logo?: string | null;
  };
  employeeDetails: {
    name: string;
    employeeId: string;
    designation: string;
    department: string;
  };
  exitDetails: {
    lastWorkingDay: string;
    resignationDate?: string | null;
    exitType: string;
    allClearancesCompleted: boolean;
  };
  content: string;
  signature: {
    name: string;
    designation: string;
    signature?: string | null;
    date: string;
  };
  companySeal?: string | null;
  generatedAt: string;
}

// ============================================
// PF, GRATUITY & COMPLIANCE
// ============================================

export interface ExitPFManagement {
  id: string;
  exit_request_id: string;
  pf_detail_id?: string | null;
  pf_exit_initiated: boolean;
  pf_exit_initiated_at?: string | null;
  pf_exit_initiated_by?: string | null;
  pf_exit_initiated_by_name?: string | null;
  pf_exit_completed: boolean;
  pf_exit_completed_at?: string | null;
  pf_withdrawal_amount: number;
  pf_withdrawal_status: 'pending' | 'initiated' | 'processed' | 'completed';
  pf_uan_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitGratuity {
  id: string;
  exit_request_id: string;
  eligible: boolean;
  years_of_service: number;
  last_drawn_salary: number;
  gratuity_amount: number;
  calculated_at?: string | null;
  calculated_by?: string | null;
  calculated_by_name?: string | null;
  paid: boolean;
  paid_at?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitCompliance {
  id: string;
  exit_request_id: string;
  compliance_item: string;
  status: 'pending' | 'completed' | 'not_applicable';
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  document_url?: string | null;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExitComplianceDocument {
  id: string;
  exit_request_id: string;
  document_type: string;
  document_url: string;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
  uploaded_at: string;
  expiry_date?: string | null;
  created_at: string;
}

// ============================================
// SMART ADD-ONS
// ============================================

export interface ExitReminder {
  id: string;
  exit_request_id: string;
  reminder_type: string;
  reminder_for?: string | null;
  reminder_for_name?: string | null;
  reminder_message?: string | null;
  due_date?: string | null;
  sent: boolean;
  sent_at?: string | null;
  created_at: string;
}

export interface ExitAssetRisk {
  id: string;
  exit_request_id: string;
  employee_asset_id?: string | null;
  asset_name?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_reason?: string | null;
  flagged_by?: string | null;
  flagged_by_name?: string | null;
  flagged_at: string;
  resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolution_notes?: string | null;
  created_at: string;
}

export interface ExitReport {
  id: string;
  exit_request_id: string;
  report_type: 'full' | 'summary' | 'asset_handover' | 'settlement' | 'compliance';
  report_url: string;
  generated_by?: string | null;
  generated_by_name?: string | null;
  generated_at: string;
  parameters?: any;
}

export interface ExitCommunication {
  id: string;
  exit_request_id: string;
  communication_type: 'email' | 'notification' | 'reminder' | 'alert';
  subject?: string | null;
  message?: string | null;
  sent_to?: string | null;
  sent_to_name?: string | null;
  sent_by?: string | null;
  sent_by_name?: string | null;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending';
  metadata?: any;
  created_at: string;
}

export interface ExitDashboardMetrics {
  total_exits: number;
  pending_clearances: number;
  pending_settlements: number;
  completed: number;
  by_exit_type: {
    resignation: number;
    termination: number;
    absconded: number;
    contract_end: number;
  };
  average_completion_days: number;
}

