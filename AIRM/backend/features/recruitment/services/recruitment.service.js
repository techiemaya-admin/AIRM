import { sendVerificationMailEmail } from '../../../shared/services/emailService.js';
// Send verification mail (document upload link)
export async function sendVerificationMail(candidateId, verificationId) {
  // Get candidate and verification details
  const candidate = await recruitmentModel.getCandidateById(candidateId);
  if (!candidate) throw new Error('Candidate not found');
  const verification = (candidate.background_verifications || []).find(v => v.id === verificationId);
  if (!verification) throw new Error('Verification not found');
  if (!candidate.email) throw new Error('Candidate email not found');
  // Use APP_BASE_URL with localhost fallback for local development
  const PORT = process.env.PORT || 3001;
  const BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
  const uploadLink = `${BASE_URL}/upload-docs/${candidateId}/${verificationId}`;
  // Send email with upload link
  await sendVerificationMailEmail({
    to: candidate.email,
    candidateName: candidate.full_name,
    verificationType: verification.verification_type,
    verificationName: verification.verification_name,
    uploadLink,
  });
}
// Manually send interview round email for a specific round
export async function sendInterviewRoundMail(candidateId, roundId) {
  // Get candidate and round details
  const candidate = await recruitmentModel.getCandidateById(candidateId);
  if (!candidate) throw new Error('Candidate not found');
  const round = (candidate.interview_rounds || []).find(r => r.id === roundId);
  if (!round) throw new Error('Interview round not found');
  if (!candidate.email) throw new Error('Candidate email not found');
  await sendInterviewRoundEmail({
    to: candidate.email,
    candidateName: candidate.full_name,
    roundName: round.round_name,
    interviewerName: round.interviewer_name,
    interviewerEmail: round.interviewer_email,
    interviewDate: round.interview_date,
  });
  // Block interview in candidate calendar
  if (round.interview_date) {
    const startTime = new Date(round.interview_date);
    // Default to 1 hour duration if not specified
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    await recruitmentModel.addCandidateCalendarEvent(candidateId, {
      title: `Interview: ${round.round_name}`,
      description: `Interview with ${round.interviewer_name}`,
      start_time: startTime,
      end_time: endTime,
      event_type: 'interview',
    });
  }
}
/**
 * Recruitment Service
 * Business logic for 3-stage hiring process
 * Stage 1: Technical Round & Interview
 * Stage 2: Background Verification
 * Stage 3: Final Onboarding
 */

import * as recruitmentModel from '../models/recruitment.model.js';
import pool from '../../../shared/database/connection.js';
import { sendInterviewRoundEmail } from '../../../shared/services/emailService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Transform candidate data for API response
 */
function transformCandidate(candidate) {
  return {
    id: candidate.id,
    candidate_info: {
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      position_applied: candidate.position_applied,
      department: candidate.department,
      experience_years: candidate.experience_years,
      current_company: candidate.current_company,
      current_ctc: candidate.current_ctc,
      expected_ctc: candidate.expected_ctc,
      notice_period: candidate.notice_period,
      resume_url: candidate.resume_url,
      photo_url: candidate.photo_url,
      location: candidate.location,
      comments: candidate.comments,
    },
    current_stage: candidate.current_stage,
    interview_rounds: candidate.interview_rounds || [],
    interview_status: candidate.interview_status,
    background_verifications: candidate.background_verifications || [],
    verification_status: candidate.verification_status,
    onboarding_status: candidate.onboarding_status,
    final_status: candidate.final_status,
    rejection_reason: candidate.rejection_reason,
    offer_letter_sent: candidate.offer_letter_sent,
    offer_accepted: candidate.offer_accepted,
    joining_date: candidate.joining_date,
    created_at: candidate.created_at,
    updated_at: candidate.updated_at,
  };
}

/**
 * Get all candidates (summary list)
 */
export async function getAllCandidates() {
  try {
    const candidates = await recruitmentModel.getAllCandidates();
    return candidates.map(c => ({
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      position_applied: c.position_applied,
      department: c.department,
      current_stage: c.current_stage,
      interview_status: c.interview_status,
      verification_status: c.verification_status,
      final_status: c.final_status,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  } catch (error) {
    console.error('[recruitment] Error getting candidates:', error);
    throw error;
  }
}

/**
 * Get candidate by ID with full details
 */
export async function getCandidateById(id) {
  try {
    const candidate = await recruitmentModel.getCandidateById(id);
    if (!candidate) return null;
    return transformCandidate(candidate);
  } catch (error) {
    console.error('[recruitment] Error getting candidate:', error);
    throw error;
  }
}

/**
 * Create new candidate
 */
export async function createCandidate(candidateInfo) {
  try {
    const candidate = await recruitmentModel.createCandidate(candidateInfo);
    return transformCandidate(candidate);
  } catch (error) {
    console.error('[recruitment] Error creating candidate:', error);
    throw error;
  }
}

/**
 * Update candidate
 */
export async function updateCandidate(id, data) {
  try {
    const candidate = await recruitmentModel.updateCandidate(id, data);
    return transformCandidate(candidate);
  } catch (error) {
    console.error('[recruitment] Error updating candidate:', error);
    throw error;
  }
}

/**
 * Delete candidate
 */
export async function deleteCandidate(id) {
  try {
    await recruitmentModel.deleteCandidate(id);
  } catch (error) {
    console.error('[recruitment] Error deleting candidate:', error);
    throw error;
  }
}

/**
 * Add interview round
 */
export async function addInterviewRound(candidateId, roundData) {
  try {
    const round = await recruitmentModel.addInterviewRound(candidateId, roundData);
    // Fetch candidate details for email
    const candidate = await recruitmentModel.getCandidateById(candidateId);
    if (candidate && candidate.email) {
      await sendInterviewRoundEmail({
        to: candidate.email,
        candidateName: candidate.full_name,
        roundName: round.round_name,
        interviewerName: round.interviewer_name,
        interviewDate: round.interview_date,
      });
    }
    return round;
  } catch (error) {
    console.error('[recruitment] Error adding interview round:', error);
    throw error;
  }
}

/**
 * Update interview round
 */
export async function updateInterviewRound(candidateId, roundId, data) {
  try {
    const round = await recruitmentModel.updateInterviewRound(candidateId, roundId, data);
    return round;
  } catch (error) {
    console.error('[recruitment] Error updating interview round:', error);
    throw error;
  }
}

/**
 * Delete interview round
 */
export async function deleteInterviewRound(candidateId, roundId) {
  try {
    await recruitmentModel.deleteInterviewRound(candidateId, roundId);
  } catch (error) {
    console.error('[recruitment] Error deleting interview round:', error);
    throw error;
  }
}

/**
 * Complete interview stage
 */
export async function completeInterviewStage(candidateId, passed, notes) {
  try {
    const candidate = await recruitmentModel.completeInterviewStage(candidateId, passed, notes);
    return transformCandidate(candidate);
  } catch (error) {
    console.error('[recruitment] Error completing interview stage:', error);
    throw error;
  }
}

/**
 * Add verification
 */
export async function addVerification(candidateId, verificationData) {
  try {
    const verification = await recruitmentModel.addVerification(candidateId, verificationData);
    return verification;
  } catch (error) {
    console.error('[recruitment] Error adding verification:', error);
    throw error;
  }
}

/**
 * Update verification
 */
export async function updateVerification(candidateId, verificationId, data) {
  try {
    const verification = await recruitmentModel.updateVerification(candidateId, verificationId, data);
    return verification;
  } catch (error) {
    console.error('[recruitment] Error updating verification:', error);
    throw error;
  }
}

/**
 * Delete verification
 */
export async function deleteVerification(candidateId, verificationId) {
  try {
    await recruitmentModel.deleteVerification(candidateId, verificationId);
  } catch (error) {
    console.error('[recruitment] Error deleting verification:', error);
    throw error;
  }
}

/**
 * Complete verification stage
 */
export async function completeVerificationStage(candidateId, passed, notes) {
  try {
    const candidate = await recruitmentModel.completeVerificationStage(candidateId, passed, notes);
    return transformCandidate(candidate);
  } catch (error) {
    console.error('[recruitment] Error completing verification stage:', error);
    throw error;
  }
}

/**
 * Complete onboarding - Creates actual employee in system
 */
export async function completeOnboarding(candidateId, joiningDate, employeeData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get candidate details
    const candidate = await recruitmentModel.getCandidateById(candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const userId = uuidv4();
    const userRoleId = uuidv4();

    // 1. Create user account (erp.users has no role column)
    await client.query(`
      INSERT INTO erp.users (id, email, full_name, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
    `, [
      userId,
      candidate.email,
      employeeData.full_name || candidate.full_name
    ]);

    // 2. Create user role entry (erp uses user_roles table)
    await client.query(`
      INSERT INTO erp.user_roles (id, user_id, role, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [userRoleId, userId, 'employee']);

    // 3. Create profile
    await client.query(`
      INSERT INTO erp.profiles (
        id, full_name, phone, job_title, department, join_date,
        onboarding_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', NOW(), NOW())
    `, [
      userId,
      employeeData.full_name || candidate.full_name,
      employeeData.phone || candidate.phone,
      employeeData.designation || candidate.position_applied,
      employeeData.department || candidate.department,
      joiningDate
    ]);

    // 4. Update candidate status
    const updatedCandidate = await recruitmentModel.completeOnboarding(candidateId, joiningDate);

    await client.query('COMMIT');

    return {
      candidate: transformCandidate(updatedCandidate),
      employee_id: userId,
      message: 'Employee successfully hired and added to system (ERP)'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[recruitment] Error completing onboarding:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reject candidate
 */
export async function rejectCandidate(candidateId, reason) {
  try {
    const candidate = await recruitmentModel.rejectCandidate(candidateId, reason);
    return transformCandidate(candidate);
  } catch (error) {
    console.error('[recruitment] Error rejecting candidate:', error);
    throw error;
  }
}
