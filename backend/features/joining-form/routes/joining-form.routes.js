// Create a new profile for onboarding

import express from 'express';
const router = express.Router();
import { v4 as uuidv4 } from 'uuid';
import * as joiningFormModel from '../models/joining-form.model.js';
import { authenticate } from '../../../core/auth/authMiddleware.js';
import * as joiningFormController from '../controllers/joining-form.controller.js';

// Create new profile (minimal info, returns new profileId)
router.post('/create', async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) {
			return res.status(400).json({ success: false, error: 'Email is required' });
		}
		const newProfileId = uuidv4();
		console.log('[REAL UUID ROUTE HIT] Generated profileId:', newProfileId, 'Email:', email); // Unique debug log
		// Insert minimal profile row with email
		await joiningFormModel.createEmptyProfile(newProfileId, email);
		res.json({ success: true, profileId: newProfileId });
	} catch (error) {
		console.error('[joining-form] Create profile error:', error);
		res.status(500).json({ success: false, error: 'Failed to create profile' });
	}
});

// All routes require authentication
router.use(authenticate);

// Get all joining forms
router.get('/', joiningFormController.getAllJoiningForms);

// Get pending onboarding list
router.get('/pending', joiningFormController.getPendingOnboarding);

// Get joining form by employee ID
router.get('/:id', joiningFormController.getJoiningFormById);

// Save complete joining form
router.post('/:id', express.json(), joiningFormController.saveJoiningForm);

// Update employee info only
router.put('/:id/employee-info', express.json(), joiningFormController.updateEmployeeInfo);

// Family members
router.post('/:id/family', express.json(), joiningFormController.addFamilyMember);
router.put('/:id/family/:memberId', express.json(), joiningFormController.updateFamilyMember);
router.delete('/:id/family/:memberId', joiningFormController.deleteFamilyMember);

// Academic info
router.post('/:id/academic', express.json(), joiningFormController.addAcademicInfo);
router.put('/:id/academic/:academicId', express.json(), joiningFormController.updateAcademicInfo);
router.delete('/:id/academic/:academicId', joiningFormController.deleteAcademicInfo);

// Previous employment
router.post('/:id/employment', express.json(), joiningFormController.addPreviousEmployment);
router.put('/:id/employment/:employmentId', express.json(), joiningFormController.updatePreviousEmployment);
router.delete('/:id/employment/:employmentId', joiningFormController.deletePreviousEmployment);

// Complete onboarding
router.post('/:id/complete', joiningFormController.completeOnboarding);

export default router;
