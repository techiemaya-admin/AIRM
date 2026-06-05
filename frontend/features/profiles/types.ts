/**
 * Profiles Feature Types
 * DTOs, API response types, and domain types
 */

/**
 * Document Categories and Types
 */
export const DOCUMENT_CATEGORIES = {
  KYC_DOCUMENTS: 'KYC Documents',
  EDUCATION_CERTIFICATES: 'Education Certificates',
  EXPERIENCE_DOCUMENTS: 'Experience Documents',
  OTHER: 'Other'
} as const;

export const DOCUMENT_TYPES = {
  [DOCUMENT_CATEGORIES.KYC_DOCUMENTS]: [
    'Aadhaar',
    'Electricity / Utility Bill',
    'PAN',
    'Photo',
    'Bank Account'
  ],
  [DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES]: [
    'SSC',
    'HSC',
    'Graduation',
    'Post Graduation'
  ],
  [DOCUMENT_CATEGORIES.EXPERIENCE_DOCUMENTS]: [
    'Experience Letter',
    'Previous Company Salary Slips',
    'Previous Company Offer / Appointment Letter',
    'Resume'
  ],
  [DOCUMENT_CATEGORIES.OTHER]: [
    'Reference Letter',
    'Recommendation',
    'Miscellaneous'
  ]
} as const;

/**
 * Document DTO
 */
export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_category: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
  uploaded_by: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  verified_at?: string;
  verified_by?: string;
}

/**
 * Document Upload Request
 */
export interface UploadDocumentRequest {
  document_category: string;
  document_type: string;
  file: File;
}

/**
 * Document API Response Types
 */
export interface GetDocumentsResponse {
  documents: EmployeeDocument[];
}

export interface UploadDocumentResponse {
  message: string;
  document: EmployeeDocument;
}

export interface UpdateDocumentStatusResponse {
  message: string;
  document: EmployeeDocument;
}

/**
 * Employee Profile DTO
 */
export interface EmployeeProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  skills: string[];
  join_date: string | null;
  experience_years: number | null;
  previous_projects: any[];
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  avatar_url: string | null;
  job_title?: string | null;
  department?: string | null;
  employment_type?: string | null;
  employee_id?: string | null;
  reporting_manager?: string | null;
  personal_email?: string | null;
  emergency_contact?: string | null;
  education?: any[];
  certifications?: any[];
  project_history?: any[];
  performance_reviews?: any[];
  documents?: any[];
  onboarding_status?: string | null;
  onboarding_completed_at?: string | null;
  burnout_score?: number;
  family_details?: any[];
  bank_details?: any;
  personal_details?: any;
  address?: any;
  blood_group?: string | null;
  height?: string | null;
  weight?: string | null;
  medical_history?: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Create/Update Profile Request
 */
export interface UpdateProfileRequest {
  phone?: string;
  skills?: string[];
  join_date?: string;
  experience_years?: number;
  previous_projects?: any[];
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  full_name?: string;
  job_title?: string;
  department?: string;
  employment_type?: string;
  employee_id?: string;
  reporting_manager?: string;
  personal_email?: string;
  emergency_contact?: string;
  education?: any[];
  certifications?: any[];
  project_history?: any[];
  performance_reviews?: any[];
  documents?: any[];
  burnout_score?: number;
  family_details?: any[];
  bank_details?: any;
  personal_details?: any;
  address?: any;
  blood_group?: string;
  height?: string;
  weight?: string;
  medical_history?: string;
}

/**
 * API Response Types
 */
export interface GetAllProfilesResponse {
  profiles: EmployeeProfile[];
}

export interface GetProfileResponse {
  profile: EmployeeProfile;
}

export interface UpdateProfileResponse {
  message: string;
  profile_id: string;
}

