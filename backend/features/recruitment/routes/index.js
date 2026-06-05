
/**
 * Recruitment Routes
 * API endpoints for 3-stage hiring process
 */

import express from 'express';
import * as recruitmentController from '../controllers/recruitment.controller.js';
import uploadRoute from './upload.js';

const router = express.Router();

// Manual send mail for interview round
router.post('/:id/interview/:roundId/send-mail', recruitmentController.sendInterviewRoundMail);

// Get all candidates
router.get('/', recruitmentController.getAllCandidates);

// Get single candidate details
router.get('/:id', recruitmentController.getCandidateById);

// Create new candidate
router.post('/', recruitmentController.createCandidate);

// Update candidate
router.put('/:id', recruitmentController.updateCandidate);

// Delete candidate
router.delete('/:id', recruitmentController.deleteCandidate);

// Interview round endpoints
router.post('/:id/interview', recruitmentController.addInterviewRound);
router.put('/:id/interview/:roundId', recruitmentController.updateInterviewRound);
router.delete('/:id/interview/:roundId', recruitmentController.deleteInterviewRound);
router.post('/:id/interview/complete', recruitmentController.completeInterviewStage);

// Background verification endpoints
router.post('/:id/verification', recruitmentController.addVerification);
router.put('/:id/verification/:verificationId', recruitmentController.updateVerification);
router.delete('/:id/verification/:verificationId', recruitmentController.deleteVerification);
router.post('/:id/verification/:verificationId/send-mail', recruitmentController.sendVerificationMail);
router.post('/:id/verification/complete', recruitmentController.completeVerificationStage);

// Onboarding endpoint
router.post('/:id/onboard', recruitmentController.completeOnboarding);

// Reject candidate
router.post('/:id/reject', recruitmentController.rejectCandidate);
router.use(uploadRoute);

export default router;
