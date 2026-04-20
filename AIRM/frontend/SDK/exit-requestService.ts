/**
 * Exit Request Service
 * HTTP calls for exit request management
 */

import type {
  ExitRequest,
  ExitClearance,
  ExitInterview,
  ExitDocument,
  CreateExitRequestRequest,
  UpdateExitRequestRequest,
  ApproveExitRequestRequest,
  UpdateClearanceRequest,
  SaveExitInterviewRequest,
  AddExitDocumentRequest,
  GetAllExitRequestsResponse,
  GetExitRequestResponse,
  CreateExitRequestResponse,
  UpdateExitRequestResponse,
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
 * Get all exit requests
 */
export async function getAllExitRequests(filters?: {
  status?: string;
  department?: string;
  manager_id?: string;
}): Promise<GetAllExitRequestsResponse> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.department) queryParams.append('department', filters.department);
  if (filters?.manager_id) queryParams.append('manager_id', filters.manager_id);
  
  const query = queryParams.toString();
  return apiRequest<GetAllExitRequestsResponse>(`/exit-formalities${query ? `?${query}` : ''}`);
}

/**
 * Get exit request by ID
 */
export async function getExitRequestById(id: string): Promise<GetExitRequestResponse> {
  return apiRequest<GetExitRequestResponse>(`/exit-formalities/${id}`);
}

/**
 * Create exit request
 */
export async function createExitRequest(
  data: CreateExitRequestRequest
): Promise<CreateExitRequestResponse> {
  return apiRequest<CreateExitRequestResponse>('/exit-formalities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update exit request
 */
export async function updateExitRequest(
  id: string,
  data: UpdateExitRequestRequest
): Promise<UpdateExitRequestResponse> {
  return apiRequest<UpdateExitRequestResponse>(`/exit-formalities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Approve exit request
 */
export async function approveExitRequest(
  id: string,
  data: ApproveExitRequestRequest
): Promise<UpdateExitRequestResponse> {
  return apiRequest<UpdateExitRequestResponse>(`/exit-formalities/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Update clearance item
 */
export async function updateClearance(
  id: string,
  data: UpdateClearanceRequest
): Promise<{ message: string; clearance: ExitClearance }> {
  return apiRequest<{ message: string; clearance: ExitClearance }>(`/exit-formalities/${id}/clearance`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Complete exit
 */
export async function completeExit(id: string): Promise<UpdateExitRequestResponse> {
  return apiRequest<UpdateExitRequestResponse>(`/exit-formalities/${id}/complete`, {
    method: 'PUT',
  });
}

/**
 * Save exit interview
 */
export async function saveExitInterview(
  id: string,
  data: SaveExitInterviewRequest
): Promise<{ message: string; interview: ExitInterview }> {
  return apiRequest<{ message: string; interview: ExitInterview }>(`/exit-formalities/${id}/interview`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Add exit document
 */
export async function addExitDocument(
  id: string,
  data: AddExitDocumentRequest
): Promise<{ message: string; document: ExitDocument }> {
  return apiRequest<{ message: string; document: ExitDocument }>(`/exit-formalities/${id}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Delete exit request
 */
export async function deleteExitRequest(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/exit-formalities/${id}`, {
    method: 'DELETE',
  });
}

