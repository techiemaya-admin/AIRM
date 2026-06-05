/**
 * Joining Form Types
 */

export interface EmployeeInfo {
  full_name: string;
  email: string;
  employee_id: string;
  date_of_birth: string;
  gender: string;
  join_date: string;
  designation: string;
  department: string;
  marital_status: string;
  phone: string;
  personal_email: string;
  bank_name: string;
  bank_ifsc: string;
  bank_branch: string;
  bank_account_number: string;
  uan_number: string;
  pf_number: string;
  current_address: string;
  permanent_address: string;
  languages_known: string[];
  blood_group: string;
  height: string;
  weight: string;
  medical_history: string;
}

export interface FamilyMember {
  id?: string;
  member_type: string;
  member_name: string;
  contact: string;
  location: string;
  relation: string;
}

export interface AcademicInfo {
  id?: string;
  qualification: string;
  specialization: string;
  institution_name: string;
  board_university: string;
  passout_year: number;
  grade_percentage: string;
}

export interface PreviousEmployment {
  id?: string;
  employer_name: string;
  designation: string;
  duration_from: string;
  duration_to: string;
  salary: string;
  reason_for_leaving: string;
}

export interface EmployerVerification {
  employer_name: string;
  designation: string;
  location: string;
  period_of_working: string;
  reason_for_leaving: string;
  supervisor_contact: string;
  hr_mail: string;
  hr_contact: string;
}

export interface VerificationInfo {
  name: string;
  father_name: string;
  designation: string;
  department: string;
  date_of_birth: string;
  pan_number: string;
  aadhar_number: string;
  gender: string;
  present_address: string;
  present_stay_period: string;
  present_contact: string;
  permanent_address: string;
  permanent_stay_period: string;
  permanent_contact: string;
  employers: EmployerVerification[];
}

export interface JoiningForm {
  id: string;
  employee_info: EmployeeInfo;
  family_members: FamilyMember[];
  academic_info: AcademicInfo[];
  previous_employment: PreviousEmployment[];
  verification_info?: VerificationInfo;
  onboarding_status: 'pending' | 'in_progress' | 'completed';
  onboarding_completed_at?: string;
}

export interface JoiningFormSummary {
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  department: string;
  designation: string;
  join_date: string;
  onboarding_status: string;
  created_at: string;
}
