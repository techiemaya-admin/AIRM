/**
 * Joining Form Controller
 * Handle HTTP request/response
 */

import * as joiningFormService from '../services/joining-form.service.js';

/**
 * Get all joining forms
 */
export async function getAllJoiningForms(req, res) {
  try {
    const forms = await joiningFormService.getAllJoiningForms();
    res.json({ success: true, forms });
  } catch (error) {
    console.error('[joining-form] Get all forms error:', error);
    res.status(500).json({ success: false, error: 'Failed to get joining forms' });
  }
}

/**
 * Get joining form by employee ID
 */
export async function getJoiningFormById(req, res) {
  try {
    const { id } = req.params;
    console.log('[joining-form] getJoiningFormById id:', id);
    const form = await joiningFormService.getJoiningFormById(id);
    console.log('[joining-form] getJoiningFormById found:', !!form);

    if (!form) {
      console.warn('[joining-form] Form not found for id:', id);
      return res.status(404).json({ success: false, error: 'Joining form not found' });
    }

    res.json({ success: true, form });
  } catch (error) {
    console.error('[joining-form] Get form error:', error);
    res.status(500).json({ success: false, error: 'Failed to get joining form' });
  }
}

/**
 * Save complete joining form
 */
export async function saveJoiningForm(req, res) {
  try {
    const { id } = req.params;
    console.log('[joining-form] saveJoiningForm req.body:', JSON.stringify(req.body, null, 2));
    const result = await joiningFormService.saveJoiningForm(id, req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[joining-form] Save form error:', error);
    res.status(500).json({ success: false, error: 'Failed to save joining form' });
  }
}

/**
 * Update employee info
 */
export async function updateEmployeeInfo(req, res) {
  try {
    const { id } = req.params;
    const result = await joiningFormService.updateEmployeeInfo(id, req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[joining-form] Update employee info error:', error);
    res.status(500).json({ success: false, error: 'Failed to update employee info' });
  }
}

/**
 * Add family member
 */
export async function addFamilyMember(req, res) {
  try {
    const { id } = req.params;
    const member = await joiningFormService.manageFamilyMember('add', id, req.body);
    res.json({ success: true, member });
  } catch (error) {
    console.error('[joining-form] Add family member error:', error);
    res.status(500).json({ success: false, error: 'Failed to add family member' });
  }
}

/**
 * Update family member
 */
export async function updateFamilyMember(req, res) {
  try {
    const { id, memberId } = req.params;
    const member = await joiningFormService.manageFamilyMember('update', id, req.body, memberId);
    res.json({ success: true, member });
  } catch (error) {
    console.error('[joining-form] Update family member error:', error);
    res.status(500).json({ success: false, error: 'Failed to update family member' });
  }
}

/**
 * Delete family member
 */
export async function deleteFamilyMember(req, res) {
  try {
    const { memberId } = req.params;
    await joiningFormService.manageFamilyMember('delete', null, null, memberId);
    res.json({ success: true, message: 'Family member deleted' });
  } catch (error) {
    console.error('[joining-form] Delete family member error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete family member' });
  }
}

/**
 * Add academic info
 */
export async function addAcademicInfo(req, res) {
  try {
    const { id } = req.params;
    const academic = await joiningFormService.manageAcademicInfo('add', id, req.body);
    res.json({ success: true, academic });
  } catch (error) {
    console.error('[joining-form] Add academic info error:', error);
    res.status(500).json({ success: false, error: 'Failed to add academic info' });
  }
}

/**
 * Update academic info
 */
export async function updateAcademicInfo(req, res) {
  try {
    const { id, academicId } = req.params;
    const academic = await joiningFormService.manageAcademicInfo('update', id, req.body, academicId);
    res.json({ success: true, academic });
  } catch (error) {
    console.error('[joining-form] Update academic info error:', error);
    res.status(500).json({ success: false, error: 'Failed to update academic info' });
  }
}

/**
 * Delete academic info
 */
export async function deleteAcademicInfo(req, res) {
  try {
    const { academicId } = req.params;
    await joiningFormService.manageAcademicInfo('delete', null, null, academicId);
    res.json({ success: true, message: 'Academic info deleted' });
  } catch (error) {
    console.error('[joining-form] Delete academic info error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete academic info' });
  }
}

/**
 * Add previous employment
 */
export async function addPreviousEmployment(req, res) {
  try {
    const { id } = req.params;
    const employment = await joiningFormService.managePreviousEmployment('add', id, req.body);
    res.json({ success: true, employment });
  } catch (error) {
    console.error('[joining-form] Add previous employment error:', error);
    res.status(500).json({ success: false, error: 'Failed to add previous employment' });
  }
}

/**
 * Update previous employment
 */
export async function updatePreviousEmployment(req, res) {
  try {
    const { id, employmentId } = req.params;
    const employment = await joiningFormService.managePreviousEmployment('update', id, req.body, employmentId);
    res.json({ success: true, employment });
  } catch (error) {
    console.error('[joining-form] Update previous employment error:', error);
    res.status(500).json({ success: false, error: 'Failed to update previous employment' });
  }
}

/**
 * Delete previous employment
 */
export async function deletePreviousEmployment(req, res) {
  try {
    const { employmentId } = req.params;
    await joiningFormService.managePreviousEmployment('delete', null, null, employmentId);
    res.json({ success: true, message: 'Previous employment deleted' });
  } catch (error) {
    console.error('[joining-form] Delete previous employment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete previous employment' });
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(req, res) {
  try {
    const { id } = req.params;
    await joiningFormService.completeOnboarding(id);
    res.json({ success: true, message: 'Onboarding completed' });
  } catch (error) {
    console.error('[joining-form] Complete onboarding error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete onboarding' });
  }
}

/**
 * Get pending onboarding list
 */
export async function getPendingOnboarding(req, res) {
  try {
    const employees = await joiningFormService.getPendingOnboarding();
    res.json({ success: true, employees });
  } catch (error) {
    console.error('[joining-form] Get pending onboarding error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pending onboarding' });
  }
}
