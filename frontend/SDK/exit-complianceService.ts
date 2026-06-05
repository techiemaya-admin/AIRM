/**
 * Exit Compliance Service
 * HTTP calls for PF, gratuity, and compliance management
 */

import type {
  ExitPFManagement,
  ExitGratuity,
  ExitCompliance,
  ExitComplianceDocument,
} from "../features/exit-formalities/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not set!');

/**
 * Get auth token from localStorage
 */
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

/**
 * API request helper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const fullUrl = `${API_BASE_URL}/api${endpoint}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const errorMessage = error.message || error.error || `HTTP error! status: ${response.status}`;
    console.error(`[API Error] ${fullUrl}:`, errorMessage, error);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`[API Success] ${fullUrl}:`, data);
  return data;
}

/**
 * Get PF management
 */
export async function getPFManagement(exitRequestId: string): Promise<{ pf_management: ExitPFManagement | null }> {
  return apiRequest<{ pf_management: ExitPFManagement | null }>(`/exit-formalities/${exitRequestId}/pf`);
}

/**
 * Initiate PF exit
 */
export async function initiatePFExit(
  exitRequestId: string,
  data?: { pf_detail_id?: string }
): Promise<{ message: string; pf_management: ExitPFManagement }> {
  return apiRequest<{ message: string; pf_management: ExitPFManagement }>(
    `/exit-formalities/${exitRequestId}/pf/initiate`,
    {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }
  );
}

/**
 * Get gratuity
 */
export async function getGratuity(exitRequestId: string): Promise<{ gratuity: ExitGratuity | null }> {
  return apiRequest<{ gratuity: ExitGratuity | null }>(`/exit-formalities/${exitRequestId}/gratuity`);
}

/**
 * Calculate gratuity
 */
export async function calculateGratuity(
  exitRequestId: string,
  data: {
    last_drawn_salary: number;
    join_date: string;
    last_working_day: string;
  }
): Promise<{ message: string; gratuity: ExitGratuity }> {
  return apiRequest<{ message: string; gratuity: ExitGratuity }>(`/exit-formalities/${exitRequestId}/gratuity/calculate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get compliance checklist
 */
export async function getComplianceChecklist(exitRequestId: string): Promise<{ compliance: ExitCompliance[] }> {
  return apiRequest<{ compliance: ExitCompliance[] }>(`/exit-formalities/${exitRequestId}/compliance`);
}

/**
 * Update compliance item
 */
export async function updateComplianceItem(
  exitRequestId: string,
  data: {
    compliance_item: string;
    status: 'pending' | 'completed' | 'not_applicable';
    document_url?: string;
    remarks?: string;
  }
): Promise<{ message: string; compliance: ExitCompliance }> {
  return apiRequest<{ message: string; compliance: ExitCompliance }>(`/exit-formalities/${exitRequestId}/compliance`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get compliance documents
 */
export async function getComplianceDocuments(exitRequestId: string): Promise<{ documents: ExitComplianceDocument[] }> {
  return apiRequest<{ documents: ExitComplianceDocument[] }>(`/exit-formalities/${exitRequestId}/compliance/documents`);
}

/**
 * Add compliance document
 */
export async function addComplianceDocument(
  exitRequestId: string,
  data: {
    document_type: string;
    document_url: string;
    expiry_date?: string;
  }
): Promise<{ message: string; document: ExitComplianceDocument }> {
  return apiRequest<{ message: string; document: ExitComplianceDocument }>(
    `/exit-formalities/${exitRequestId}/compliance/documents`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

