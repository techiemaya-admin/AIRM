/**
 * Exit Asset Service
 * HTTP calls for asset recovery and handover
 */

import type {
  EmployeeAsset,
  ExitAssetRecovery,
  ExitAssetHandover,
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
 * Get employee assets
 */
export async function getEmployeeAssets(userId?: string): Promise<{ assets: EmployeeAsset[] }> {
  const query = userId ? `?user_id=${userId}` : '';
  return apiRequest<{ assets: EmployeeAsset[] }>(`/exit-formalities/assets${query}`);
}

/**
 * Create employee asset
 */
export async function createEmployeeAsset(data: {
  user_id: string;
  asset_name: string;
  asset_id?: string;
  asset_category?: string;
  assigned_date: string;
  condition_at_assignment?: string;
  notes?: string;
}): Promise<{ message: string; asset: EmployeeAsset }> {
  return apiRequest<{ message: string; asset: EmployeeAsset }>('/exit-formalities/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get asset recovery
 */
export async function getAssetRecovery(exitRequestId: string): Promise<{ assets: ExitAssetRecovery[] }> {
  return apiRequest<{ assets: ExitAssetRecovery[] }>(`/exit-formalities/${exitRequestId}/assets`);
}

/**
 * Update asset recovery
 */
export async function updateAssetRecovery(
  exitRequestId: string,
  data: {
    employee_asset_id: string;
    recovery_status: 'pending' | 'returned' | 'damaged' | 'lost' | 'not_applicable';
    recovery_date?: string;
    condition_on_return?: string;
    remarks?: string;
    photo_url?: string;
    employee_acknowledged?: boolean;
    admin_acknowledged?: boolean;
    cost_recovery?: number;
  }
): Promise<{ message: string; recovery: ExitAssetRecovery }> {
  return apiRequest<{ message: string; recovery: ExitAssetRecovery }>(`/exit-formalities/${exitRequestId}/assets`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get asset handover
 */
export async function getAssetHandover(exitRequestId: string): Promise<{ handover: ExitAssetHandover | null }> {
  return apiRequest<{ handover: ExitAssetHandover | null }>(`/exit-formalities/${exitRequestId}/assets/handover`);
}

/**
 * Generate asset handover
 */
export async function generateAssetHandover(
  exitRequestId: string,
  data: {
    handover_document_url?: string;
    employee_signature_url?: string;
    admin_signature_url?: string;
  }
): Promise<{ message: string; handover: ExitAssetHandover }> {
  return apiRequest<{ message: string; handover: ExitAssetHandover }>(
    `/exit-formalities/${exitRequestId}/assets/handover`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

