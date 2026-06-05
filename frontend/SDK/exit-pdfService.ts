/**
 * Exit PDF Service
 * HTTP calls for PDF generation
 */

import type {
  SettlementPDFData,
  AssetHandoverPDFData,
  ExperienceLetterPDFData,
  RelievingLetterPDFData,
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
 * Get settlement PDF data
 */
export async function getSettlementPDFData(exitRequestId: string): Promise<{ message: string; pdfData: SettlementPDFData }> {
  return apiRequest<{ message: string; pdfData: SettlementPDFData }>(
    `/exit-formalities/${exitRequestId}/settlement/pdf`
  );
}

/**
 * Get asset handover PDF data
 */
export async function getAssetHandoverPDFData(exitRequestId: string): Promise<{ message: string; pdfData: AssetHandoverPDFData }> {
  return apiRequest<{ message: string; pdfData: AssetHandoverPDFData }>(
    `/exit-formalities/${exitRequestId}/assets/handover/pdf`
  );
}

/**
 * Get experience letter PDF data
 */
export async function getExperienceLetterPDFData(exitRequestId: string): Promise<{ message: string; pdfData: ExperienceLetterPDFData }> {
  return apiRequest<{ message: string; pdfData: ExperienceLetterPDFData }>(
    `/exit-formalities/${exitRequestId}/experience-letter/pdf`
  );
}

/**
 * Get relieving letter PDF data
 */
export async function getRelievingLetterPDFData(exitRequestId: string): Promise<{ message: string; pdfData: RelievingLetterPDFData }> {
  return apiRequest<{ message: string; pdfData: RelievingLetterPDFData }>(
    `/exit-formalities/${exitRequestId}/relieving-letter/pdf`
  );
}

