/**
 * Exit Smart Add-ons Service
 * HTTP calls for progress, reminders, risks, reports, and communications
 */

import type {
  ExitReminder,
  ExitAssetRisk,
  ExitReport,
  ExitCommunication,
  ExitDashboardMetrics,
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
 * Get exit progress
 */
export async function getExitProgress(exitRequestId: string): Promise<{ progress_percentage: number }> {
  return apiRequest<{ progress_percentage: number }>(`/exit-formalities/${exitRequestId}/progress`);
}

/**
 * Get reminders
 */
export async function getReminders(exitRequestId: string): Promise<{ reminders: ExitReminder[] }> {
  return apiRequest<{ reminders: ExitReminder[] }>(`/exit-formalities/${exitRequestId}/reminders`);
}

/**
 * Create reminder
 */
export async function createReminder(
  exitRequestId: string,
  data: {
    reminder_type: string;
    reminder_for?: string;
    reminder_message?: string;
    due_date?: string;
  }
): Promise<{ message: string; reminder: ExitReminder }> {
  return apiRequest<{ message: string; reminder: ExitReminder }>(`/exit-formalities/${exitRequestId}/reminders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get asset risks
 */
export async function getAssetRisks(exitRequestId: string): Promise<{ risks: ExitAssetRisk[] }> {
  return apiRequest<{ risks: ExitAssetRisk[] }>(`/exit-formalities/${exitRequestId}/risks`);
}

/**
 * Flag asset risk
 */
export async function flagAssetRisk(
  exitRequestId: string,
  data: {
    employee_asset_id?: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    risk_reason?: string;
  }
): Promise<{ message: string; risk: ExitAssetRisk }> {
  return apiRequest<{ message: string; risk: ExitAssetRisk }>(`/exit-formalities/${exitRequestId}/risks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Resolve asset risk
 */
export async function resolveAssetRisk(
  riskId: string,
  data: { resolution_notes?: string }
): Promise<{ message: string; risk: ExitAssetRisk }> {
  return apiRequest<{ message: string; risk: ExitAssetRisk }>(`/exit-formalities/risks/${riskId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get exit reports
 */
export async function getExitReports(exitRequestId: string): Promise<{ reports: ExitReport[] }> {
  return apiRequest<{ reports: ExitReport[] }>(`/exit-formalities/${exitRequestId}/reports`);
}

/**
 * Create exit report
 */
export async function createExitReport(
  exitRequestId: string,
  data: {
    report_type: 'full' | 'summary' | 'asset_handover' | 'settlement' | 'compliance';
    report_url: string;
    parameters?: any;
  }
): Promise<{ message: string; report: ExitReport }> {
  return apiRequest<{ message: string; report: ExitReport }>(`/exit-formalities/${exitRequestId}/reports`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get exit communications
 */
export async function getExitCommunications(exitRequestId: string): Promise<{ communications: ExitCommunication[] }> {
  return apiRequest<{ communications: ExitCommunication[] }>(`/exit-formalities/${exitRequestId}/communications`);
}

/**
 * Get exit dashboard metrics
 */
export async function getExitDashboardMetrics(filters?: {
  status?: string;
  department?: string;
}): Promise<{ metrics: ExitDashboardMetrics }> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.department) queryParams.append('department', filters.department);
  const query = queryParams.toString();
  return apiRequest<{ metrics: ExitDashboardMetrics }>(
    `/exit-formalities/dashboard/metrics${query ? `?${query}` : ''}`
  );
}

