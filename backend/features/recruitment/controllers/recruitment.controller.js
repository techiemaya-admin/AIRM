// Send verification mail (document upload link)
export async function sendVerificationMail(req, res) {
  try {
    const { id, verificationId } = req.params;
    await recruitmentService.sendVerificationMail(id, verificationId);
    res.json({ success: true, message: 'Verification mail sent' });
  } catch (error) {
    console.error('Error sending verification mail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
// Send interview round email manually
export async function sendInterviewRoundMail(req, res) {
  try {
    const { id, roundId } = req.params;
    await recruitmentService.sendInterviewRoundMail(id, roundId);
    res.json({ success: true, message: 'Interview round email sent' });
  } catch (error) {
    console.error('Error sending interview round email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
/**
 * Recruitment Controller
 * Handles HTTP requests for 3-stage hiring process
 */

import * as recruitmentService from '../services/recruitment.service.js';

// Get all candidates
export async function getAllCandidates(req, res) {
  try {
    const candidates = await recruitmentService.getAllCandidates();
    res.json({ success: true, candidates });
  } catch (error) {
    console.error('Error getting candidates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get single candidate
export async function getCandidateById(req, res) {
  try {
    const { id } = req.params;
    const candidate = await recruitmentService.getCandidateById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    res.json({ success: true, candidate });
  } catch (error) {
    console.error('Error getting candidate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Create new candidate
export async function createCandidate(req, res) {
  try {
    const { candidate_info } = req.body;
    const candidate = await recruitmentService.createCandidate(candidate_info);
    res.status(201).json({ success: true, candidate });
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Update candidate
export async function updateCandidate(req, res) {
  try {
    const { id } = req.params;
    const candidate = await recruitmentService.updateCandidate(id, req.body);
    res.json({ success: true, candidate });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete candidate
export async function deleteCandidate(req, res) {
  try {
    const { id } = req.params;
    await recruitmentService.deleteCandidate(id);
    res.json({ success: true, message: 'Candidate deleted' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Add interview round
export async function addInterviewRound(req, res) {
  try {
    const { id } = req.params;
    const round = await recruitmentService.addInterviewRound(id, req.body);
    res.status(201).json({ success: true, interview_round: round });
  } catch (error) {
    console.error('Error adding interview round:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Update interview round
export async function updateInterviewRound(req, res) {
  try {
    const { id, roundId } = req.params;
    const round = await recruitmentService.updateInterviewRound(id, roundId, req.body);
    res.json({ success: true, interview_round: round });
  } catch (error) {
    console.error('Error updating interview round:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete interview round
export async function deleteInterviewRound(req, res) {
  try {
    const { id, roundId } = req.params;
    await recruitmentService.deleteInterviewRound(id, roundId);
    res.json({ success: true, message: 'Interview round deleted' });
  } catch (error) {
    console.error('Error deleting interview round:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Complete interview stage
export async function completeInterviewStage(req, res) {
  try {
    const { id } = req.params;
    const { passed, notes } = req.body;
    const candidate = await recruitmentService.completeInterviewStage(id, passed, notes);
    res.json({ success: true, candidate });
  } catch (error) {
    console.error('Error completing interview stage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Add verification
export async function addVerification(req, res) {
  try {
    const { id } = req.params;
    const verification = await recruitmentService.addVerification(id, req.body);
    res.status(201).json({ success: true, verification });
  } catch (error) {
    console.error('Error adding verification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Update verification
export async function updateVerification(req, res) {
  try {
    const { id, verificationId } = req.params;
    const verification = await recruitmentService.updateVerification(id, verificationId, req.body);
    res.json({ success: true, verification });
  } catch (error) {
    console.error('Error updating verification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete verification
export async function deleteVerification(req, res) {
  try {
    const { id, verificationId } = req.params;
    await recruitmentService.deleteVerification(id, verificationId);
    res.json({ success: true, message: 'Verification deleted' });
  } catch (error) {
    console.error('Error deleting verification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Complete verification stage
export async function completeVerificationStage(req, res) {
  try {
    const { id } = req.params;
    const { passed, notes } = req.body;
    const candidate = await recruitmentService.completeVerificationStage(id, passed, notes);
    res.json({ success: true, candidate });
  } catch (error) {
    console.error('Error completing verification stage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Complete onboarding (hire employee)
export async function completeOnboarding(req, res) {
  try {
    const { id } = req.params;
    const { joining_date, employee_data } = req.body;
    const result = await recruitmentService.completeOnboarding(id, joining_date, employee_data);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Reject candidate
export async function rejectCandidate(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const candidate = await recruitmentService.rejectCandidate(id, reason);
    res.json({ success: true, candidate });
  } catch (error) {
    console.error('Error rejecting candidate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
