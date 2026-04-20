/**
 * Profiles Service
 * HTTP calls to backend
 * Feature-prefixed endpoints
 * Typed responses
 */

import type {
  EmployeeProfile,
  UpdateProfileRequest,
  GetAllProfilesResponse,
  GetProfileResponse,
  UpdateProfileResponse,
} from "../features/profiles/types";

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
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
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
 * Get all profiles
 */
export async function getAllProfiles(): Promise<GetAllProfilesResponse> {
  return apiRequest<GetAllProfilesResponse>('/api/profiles');
}

/**
 * Get profile by ID
 */
export async function getProfileById(id: string): Promise<GetProfileResponse> {
  return apiRequest<GetProfileResponse>(`/api/profiles/${id}`);
}

/**
 * Update profile
 */
export async function updateProfile(
  id: string,
  data: UpdateProfileRequest
): Promise<UpdateProfileResponse> {
  return apiRequest<UpdateProfileResponse>(`/api/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete profile by id
 */
export async function deleteProfile(id: string): Promise<any> {
  return apiRequest<any>(`/api/profiles/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Download profile template
 */
export async function downloadTemplate(): Promise<void> {
  const token = getToken();
  const fullUrl = `${API_BASE_URL}/api/profiles/template/download`;
  
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
  }

  // Get the blob and create download link
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Employee_Profile_Upload_Template.xlsx';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Upload file and extract profile
 */
export async function uploadProfileFile(file: File): Promise<any> {
  const token = getToken();
  const fullUrl = `${API_BASE_URL}/api/profiles/extract`;
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Upload batch profiles file
 */
export async function uploadBatchProfiles(file: File): Promise<any> {
  const token = getToken();
  const fullUrl = `${API_BASE_URL}/api/profiles/upload-batch`;
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

