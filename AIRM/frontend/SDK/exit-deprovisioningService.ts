/**
 * Exit Deprovisioning Service
 * HTTP calls for access de-provisioning
 */

import type {
  ExitAccessDeprovisioning,
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
 * Get access de-provisioning
 */
export async function getAccessDeprovisioning(
  exitRequestId: string
): Promise<{ deprovisioning: ExitAccessDeprovisioning[] }> {
  return apiRequest<{ deprovisioning: ExitAccessDeprovisioning[] }>(
    `/exit-formalities/${exitRequestId}/deprovisioning`
  );
}

/**
 * Update access de-provisioning
 */
export async function updateAccessDeprovisioning(
  exitRequestId: string,
  data: {
    system_name: string;
    system_type?: string;
    status: 'pending' | 'revoked' | 'not_applicable';
    auto_revoked?: boolean;
    remarks?: string;
  }
): Promise<{ message: string; deprovisioning: ExitAccessDeprovisioning }> {
  return apiRequest<{ message: string; deprovisioning: ExitAccessDeprovisioning }>(
    `/exit-formalities/${exitRequestId}/deprovisioning`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}

/**
 * Auto-revoke access
 */
export async function autoRevokeAccess(exitRequestId: string): Promise<{ message: string; revoked: ExitAccessDeprovisioning[] }> {
  return apiRequest<{ message: string; revoked: ExitAccessDeprovisioning[] }>(
    `/exit-formalities/${exitRequestId}/deprovisioning/auto-revoke`,
    {
      method: 'POST',
    }
  );
}

