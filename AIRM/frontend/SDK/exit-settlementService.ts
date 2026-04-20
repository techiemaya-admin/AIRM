/**
 * Exit Settlement Service
 * HTTP calls for settlement and dues management
 */

import type {
  ExitPayableDue,
  ExitRecoverableDue,
  ExitSettlement,
  FinalSettlement,
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
 * Get payable dues
 */
export async function getPayableDues(exitRequestId: string): Promise<{ dues: ExitPayableDue[] }> {
  return apiRequest<{ dues: ExitPayableDue[] }>(`/exit-formalities/${exitRequestId}/dues/payable`);
}

/**
 * Add or update payable due
 */
export async function upsertPayableDue(
  exitRequestId: string,
  data: {
    due_type: string;
    description?: string;
    amount: number;
    approved?: boolean;
    paid?: boolean;
    payment_reference?: string;
    notes?: string;
  }
): Promise<{ message: string; due: ExitPayableDue }> {
  return apiRequest<{ message: string; due: ExitPayableDue }>(`/exit-formalities/${exitRequestId}/dues/payable`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get recoverable dues
 */
export async function getRecoverableDues(exitRequestId: string): Promise<{ dues: ExitRecoverableDue[] }> {
  return apiRequest<{ dues: ExitRecoverableDue[] }>(`/exit-formalities/${exitRequestId}/dues/recoverable`);
}

/**
 * Add or update recoverable due
 */
export async function upsertRecoverableDue(
  exitRequestId: string,
  data: {
    due_type: string;
    description?: string;
    amount: number;
    approved?: boolean;
    recovered?: boolean;
    recovery_reference?: string;
    notes?: string;
  }
): Promise<{ message: string; due: ExitRecoverableDue }> {
  return apiRequest<{ message: string; due: ExitRecoverableDue }>(
    `/exit-formalities/${exitRequestId}/dues/recoverable`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

/**
 * Calculate settlement
 */
export async function calculateSettlement(
  exitRequestId: string,
  data?: {
    leaveBalance?: number;
    bonusAmount?: number;
    incentivesAmount?: number;
    reimbursements?: number;
    noticePeriodRequired?: number;
    noticePeriodServed?: number;
  }
): Promise<{ message: string; settlement: FinalSettlement }> {
  return apiRequest<{ message: string; settlement: FinalSettlement }>(
    `/exit-formalities/${exitRequestId}/settlement/calculate`,
    {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }
  );
}

/**
 * Get settlement
 */
export async function getSettlement(exitRequestId: string): Promise<{ settlement: ExitSettlement | null }> {
  return apiRequest<{ settlement: ExitSettlement | null }>(`/exit-formalities/${exitRequestId}/settlement`);
}

/**
 * Update settlement status
 */
export async function updateSettlementStatus(
  exitRequestId: string,
  data: {
    status: 'calculated' | 'approved' | 'paid';
    payment_reference?: string;
  }
): Promise<{ message: string; settlement: ExitSettlement }> {
  return apiRequest<{ message: string; settlement: ExitSettlement }>(`/exit-formalities/${exitRequestId}/settlement`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

