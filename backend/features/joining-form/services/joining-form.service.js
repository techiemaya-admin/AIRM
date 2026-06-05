/**
 * Joining Form Service
 * Business logic for employee onboarding
 */

import * as joiningFormModel from '../models/joining-form.model.js';

/**
 * Get all joining forms
 */
export async function getAllJoiningForms() {
  try {
    const forms = await joiningFormModel.getAllJoiningForms();
    return forms.map(transformJoiningForm);
  } catch (error) {
    console.error('[joining-form] Error getting all forms:', error);
    throw error;
  }
}

/**
 * Get joining form by ID
 */
export async function getJoiningFormById(profileId) {
  try {
    const form = await joiningFormModel.getJoiningFormById(profileId);
    console.log('[joining-form-service] Model returned form:', !!form);
    if (!form) return null;
    return transformJoiningFormDetail(form);
  } catch (error) {
    console.error('[joining-form] Error getting form by ID:', error);
    throw error;
  }
}

/**
 * Save complete joining form
 */
export async function saveJoiningForm(profileId, data) {
  try {
    const {
      employee_info,
      family_members,
      academic_info,
      previous_employment,
      verification_info
    } = data;

    const shouldSaveEmployee = employee_info || verification_info;

    // Save employee info and verification
    if (shouldSaveEmployee) {
      await joiningFormModel.upsertEmployeeInfo(profileId, {
        ...(employee_info || {}),
        background_verification: verification_info || null
      });
    }

    // Save family members
    if (family_members && Array.isArray(family_members)) {
      await joiningFormModel.saveFamilyMembers(profileId, family_members);
    }

    // Save academic info
    if (academic_info && Array.isArray(academic_info)) {
      await joiningFormModel.saveAcademicInfo(profileId, academic_info);
    }

    // Save previous employment
    if (previous_employment && Array.isArray(previous_employment)) {
      await joiningFormModel.savePreviousEmployment(profileId, previous_employment);
    }

    return { success: true, profileId };
  } catch (error) {
    console.error('[joining-form] Error saving form:', error);
    throw error;
  }
}

/**
 * Update employee info only
 */
export async function updateEmployeeInfo(profileId, data) {
  try {
    const { verification_info, ...rest } = data;
    await joiningFormModel.upsertEmployeeInfo(profileId, {
      ...rest,
      background_verification: verification_info || rest.background_verification || null
    });
    return { success: true };
  } catch (error) {
    console.error('[joining-form] Error updating employee info:', error);
    throw error;
  }
}

/**
 * Add/Update/Delete family member
 */
export async function manageFamilyMember(action, profileId, data, memberId = null) {
  try {
    switch (action) {
      case 'add':
        return await joiningFormModel.addFamilyMember(profileId, data);
      case 'update':
        return await joiningFormModel.updateFamilyMember(memberId, data);
      case 'delete':
        await joiningFormModel.deleteFamilyMember(memberId);
        return { success: true };
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('[joining-form] Error managing family member:', error);
    throw error;
  }
}

/**
 * Add/Update/Delete academic info
 */
export async function manageAcademicInfo(action, profileId, data, academicId = null) {
  try {
    switch (action) {
      case 'add':
        return await joiningFormModel.addAcademicInfo(profileId, data);
      case 'update':
        return await joiningFormModel.updateAcademicInfo(academicId, data);
      case 'delete':
        await joiningFormModel.deleteAcademicInfo(academicId);
        return { success: true };
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('[joining-form] Error managing academic info:', error);
    throw error;
  }
}

/**
 * Add/Update/Delete previous employment
 */
export async function managePreviousEmployment(action, profileId, data, employmentId = null) {
  try {
    switch (action) {
      case 'add':
        return await joiningFormModel.addPreviousEmployment(profileId, data);
      case 'update':
        return await joiningFormModel.updatePreviousEmployment(employmentId, data);
      case 'delete':
        await joiningFormModel.deletePreviousEmployment(employmentId);
        return { success: true };
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('[joining-form] Error managing previous employment:', error);
    throw error;
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(profileId) {
  try {
    await joiningFormModel.completeOnboarding(profileId);
    return { success: true };
  } catch (error) {
    console.error('[joining-form] Error completing onboarding:', error);
    throw error;
  }
}

/**
 * Get pending onboarding list
 */
export async function getPendingOnboarding() {
  try {
    return await joiningFormModel.getPendingOnboarding();
  } catch (error) {
    console.error('[joining-form] Error getting pending onboarding:', error);
    throw error;
  }
}

// Transform functions
function transformJoiningForm(form) {
  return {
    id: form.id,
    full_name: form.full_name,
    email: form.email,
    employee_id: form.employee_id,
    department: form.department,
    designation: form.designation,
    join_date: form.join_date,
    onboarding_status: form.onboarding_status || 'pending',
    created_at: form.created_at
  };
}

function transformJoiningFormDetail(form) {
  return {
    id: form.id,
    employee_info: {
      full_name: form.full_name,
      email: form.email,
      employee_id: form.employee_id,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      join_date: form.join_date,
      designation: form.designation,
      department: form.department,
      marital_status: form.marital_status,
      phone: form.phone,
      personal_email: form.personal_email,
      bank_name: form.bank_name,
      bank_ifsc: form.bank_ifsc,
      bank_branch: form.bank_branch,
      bank_account_number: form.bank_account_number,
      uan_number: form.uan_number,
      pf_number: form.pf_number,
      current_address: form.current_address,
      permanent_address: form.permanent_address,
      languages_known: parseLanguagesKnown(form.languages_known),
      blood_group: form.blood_group,
      height: form.height,
      weight: form.weight,
      medical_history: form.medical_history
    },
    verification_info: parseVerificationInfo(form.background_verification),
    family_members: form.family_members || [],
    academic_info: form.academic_info || [],
    previous_employment: form.previous_employment || [],
    onboarding_status: form.onboarding_status || 'pending',
    onboarding_completed_at: form.onboarding_completed_at
  };
}

function parseLanguagesKnown(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('[joining-form] Failed to parse languages_known JSON');
      return [];
    }
  }
  return [];
}

function parseVerificationInfo(value) {
  if (!value) return buildEmptyVerificationInfo();
  if (typeof value === 'object') return { ...buildEmptyVerificationInfo(), ...value };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return { ...buildEmptyVerificationInfo(), ...parsed };
    } catch (error) {
      console.warn('[joining-form] Failed to parse background_verification JSON');
      return buildEmptyVerificationInfo();
    }
  }
  return buildEmptyVerificationInfo();
}

function buildEmptyVerificationInfo() {
  const emptyEmployer = {
    employer_name: '',
    designation: '',
    location: '',
    period_of_working: '',
    reason_for_leaving: '',
    supervisor_contact: '',
    hr_mail: '',
    hr_contact: ''
  };

  return {
    name: '',
    father_name: '',
    designation: '',
    department: '',
    date_of_birth: '',
    pan_number: '',
    aadhar_number: '',
    gender: '',
    present_address: '',
    present_stay_period: '',
    present_contact: '',
    permanent_address: '',
    permanent_stay_period: '',
    permanent_contact: '',
    employers: [
      { ...emptyEmployer },
      { ...emptyEmployer },
      { ...emptyEmployer },
      { ...emptyEmployer }
    ]
  };
}
