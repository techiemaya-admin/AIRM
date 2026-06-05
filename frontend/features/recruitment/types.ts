/**
 * Recruitment Types
 * Types for the 3-stage employee onboarding process
 */

export type RecruitmentStage = 'interview' | 'verification' | 'onboarding';
export type RecruitmentStatus = 'pending' | 'in_progress' | 'passed' | 'failed';

export interface InterviewRound {
  id?: string;
  round_name: string;
  interviewer_name: string;
  interview_date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  result: 'pending' | 'passed' | 'failed';
  feedback?: string;
  score?: number;
}

export interface BackgroundVerification {
  id?: string;
  verification_type: 'identity' | 'education' | 'employment' | 'criminal' | 'reference';
  verification_name: string;
  status: 'pending' | 'in_progress' | 'verified' | 'failed';
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  documents?: string[];
}

export interface CandidateInfo {
  full_name: string;
  email: string;
  phone: string;
  position_applied: string;
  department: string;
  experience_years: number;
  current_company?: string;
  current_ctc?: string;
  expected_ctc?: string;
  notice_period?: string;
  resume_url?: string;
  photo_url?: string;
  location: string;
  comments?: string;
}

export interface Candidate {
  id: string;
  candidate_info: CandidateInfo;
  current_stage: RecruitmentStage;
  interview_rounds: InterviewRound[];
  interview_status: RecruitmentStatus;
  background_verifications: BackgroundVerification[];
  verification_status: RecruitmentStatus;
  onboarding_status: RecruitmentStatus;
  final_status: 'pending' | 'hired' | 'rejected';
  rejection_reason?: string;
  offer_letter_sent?: boolean;
  offer_accepted?: boolean;
  joining_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateSummary {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position_applied: string;
  department: string;
  current_stage: RecruitmentStage;
  interview_status: RecruitmentStatus;
  verification_status: RecruitmentStatus;
  final_status: 'pending' | 'hired' | 'rejected';
  created_at: string;
  updated_at: string;
}
