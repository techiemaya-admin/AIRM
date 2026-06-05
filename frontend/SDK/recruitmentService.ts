export async function uploadVerificationDocuments(candidateId: string, verificationId: string, files: File[]): Promise<any> {
  const formData = new FormData();
  files.forEach(file => formData.append('documents', file));

  // Use API_BASE_URL from environment variable
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL environment variable is required');
  }

  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE_URL}/api/recruitment/${candidateId}/verification/${verificationId}/upload`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload documents');
  return res.json();
}
// Send verification mail (document upload link)
export async function sendVerificationMail(candidateId: string, verificationId: string): Promise<any> {
  try {
    const response = await api.post(`${API_BASE}/${candidateId}/verification/${verificationId}/send-mail`);
    return response;
  } catch (error) {
    console.error("Failed to send verification mail:", error);
    throw error;
  }
}
// Send interview round mail manually
export async function sendInterviewRoundMail(candidateId: string, roundId: string): Promise<any> {
  try {
    const response = await api.post(`${API_BASE}/${candidateId}/interview/${roundId}/send-mail`);
    return response;
  } catch (error) {
    console.error("Failed to send interview round mail:", error);
    throw error;
  }
}
/**
 * Recruitment Service
 * API calls for recruitment/onboarding process
 */

import { api } from "@sdk/api";
import type { Candidate, CandidateSummary, InterviewRound, BackgroundVerification, CandidateInfo } from "../features/recruitment/types";

const API_BASE = "/recruitment";

// Get all candidates
export async function getAllCandidates(): Promise<CandidateSummary[]> {
  try {
    const response = await api.get(API_BASE) as any;
    return response.candidates || [];
  } catch (error) {
    console.error("Failed to fetch candidates:", error);
    return [];
  }
}

// Get single candidate details
export async function getCandidate(id: string): Promise<Candidate | null> {
  try {
    const response = await api.get(`${API_BASE}/${id}`) as any;
    return response.candidate || null;
  } catch (error) {
    console.error("Failed to fetch candidate:", error);
    return null;
  }
}

// Create new candidate
export async function createCandidate(candidateInfo: CandidateInfo): Promise<Candidate | null> {
  try {
    const response = await api.post(API_BASE, { candidate_info: candidateInfo }) as any;
    return response.candidate || null;
  } catch (error) {
    console.error("Failed to create candidate:", error);
    throw error;
  }
}

// Update candidate info
export async function updateCandidate(id: string, data: Partial<Candidate>): Promise<Candidate | null> {
  try {
    const response = await api.put(`${API_BASE}/${id}`, data) as any;
    return response.candidate || null;
  } catch (error) {
    console.error("Failed to update candidate:", error);
    throw error;
  }
}

// Add interview round
export async function addInterviewRound(candidateId: string, round: InterviewRound): Promise<InterviewRound | null> {
  try {
    const response = await api.post(`${API_BASE}/${candidateId}/interview`, round) as any;
    return response.interview_round || null;
  } catch (error) {
    console.error("Failed to add interview round:", error);
    throw error;
  }
}

// Update interview round result
export async function updateInterviewRound(candidateId: string, roundId: string, data: Partial<InterviewRound>): Promise<InterviewRound | null> {
  try {
    const response = await api.put(`${API_BASE}/${candidateId}/interview/${roundId}`, data) as any;
    return response.interview_round || null;
  } catch (error) {
    console.error("Failed to update interview round:", error);
    throw error;
  }
}

// Delete interview round
export async function deleteInterviewRound(candidateId: string, roundId: string): Promise<boolean> {
  try {
    await api.delete(`${API_BASE}/${candidateId}/interview/${roundId}`);
    return true;
  } catch (error) {
    console.error("Failed to delete interview round:", error);
    return false;
  }
}

// Complete interview stage
export async function completeInterviewStage(candidateId: string, passed: boolean, notes?: string): Promise<Candidate | null> {
  try {
    const response = await api.post(`${API_BASE}/${candidateId}/interview/complete`, { passed, notes }) as any;
    return response.candidate || null;
  } catch (error) {
    console.error("Failed to complete interview stage:", error);
    throw error;
  }
}

// Add background verification
export async function addVerification(candidateId: string, verification: BackgroundVerification): Promise<BackgroundVerification | null> {
  try {
    const response = await api.post(`${API_BASE}/${candidateId}/verification`, verification) as any;
    return response.verification || null;
  } catch (error) {
    console.error("Failed to add verification:", error);
    throw error;
  }
}

// Update verification status
export async function updateVerification(candidateId: string, verificationId: string, data: Partial<BackgroundVerification>): Promise<BackgroundVerification | null> {
  try {
    const response = await api.put(`${API_BASE}/${candidateId}/verification/${verificationId}`, data) as any;
    return response.verification || null;
  } catch (error) {
    console.error("Failed to update verification:", error);
    throw error;
  }
}

// Complete verification stage
export async function completeVerificationStage(candidateId: string, passed: boolean, notes?: string): Promise<Candidate | null> {
  try {
    const response = await api.post(`${API_BASE}/${candidateId}/verification/complete`, { passed, notes }) as any;
    return response.candidate || null;
  } catch (error) {
    console.error("Failed to complete verification stage:", error);
    throw error;
  }
}

// Complete onboarding (hire the candidate)
export async function completeOnboarding(candidateId: string, joiningDate: string, employeeData: any): Promise<{ candidate: Candidate; employee: any } | null> {
  try {
    const response = await api.post(`${API_BASE}/${candidateId}/onboard`, { joining_date: joiningDate, employee_data: employeeData }) as any;
    return response || null;
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    throw error;
  }
}

// Reject candidate
export async function rejectCandidate(candidateId: string, reason: string): Promise<Candidate | null> {
  try {
    const response = await api.post(`${API_BASE}/${candidateId}/reject`, { reason }) as any;
    return response.candidate || null;
  } catch (error) {
    console.error("Failed to reject candidate:", error);
    throw error;
  }
}

// Delete candidate
export async function deleteCandidate(id: string): Promise<boolean> {
  try {
    await api.delete(`${API_BASE}/${id}`);
    return true;
  } catch (error) {
    console.error("Failed to delete candidate:", error);
    return false;
  }
}
