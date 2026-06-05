/**
 * Profiles Service
 * Business logic and workflow orchestration
 * NO Express objects, NO database queries
 */

import * as profilesModel from '../models/profiles.pg.js';

/**
 * Parse JSONB fields safely
 */
function parseJsonb(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return [];
    }
  }
  return [];
}

/**
 * Safely parse date string
 */
function parseDate(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    try {
      return dateValue.split('T')[0];
    } catch (e) {
      return null;
    }
  }
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Transform raw database profile to DTO
 */
function transformProfile(profile) {
  if (!profile) return null;

  try {
    return {
      id: profile.id || null,
      email: profile.email || null,
      full_name: profile.full_name || null,
      role: profile.role || 'user',
      phone: profile.phone || null,
      skills: Array.isArray(profile.skills) ? profile.skills : (profile.skills || []),
      join_date: parseDate(profile.join_date) || parseDate(profile.created_at),
      experience_years: profile.experience_years != null ? parseFloat(profile.experience_years) : null,
      previous_projects: parseJsonb(profile.previous_projects),
      bio: profile.bio || null,
      linkedin_url: profile.linkedin_url || null,
      github_url: profile.github_url || null,
      avatar_url: profile.avatar_url || null,
      job_title: profile.job_title || null,
      department: profile.department || null,
      employment_type: profile.employment_type || null,
      employee_id: profile.employee_id || null,
      reporting_manager: profile.reporting_manager || null,
      personal_email: profile.personal_email || null,
      emergency_contact: profile.emergency_contact || null,
      education: parseJsonb(profile.education),
      certifications: parseJsonb(profile.certifications),
      project_history: parseJsonb(profile.project_history),
      performance_reviews: parseJsonb(profile.performance_reviews),
      documents: parseJsonb(profile.documents),
      onboarding_status: profile.onboarding_status || 'pending',
      onboarding_completed_at: profile.onboarding_completed_at || null,
      burnout_score: profile.burnout_score !== null && profile.burnout_score !== undefined ? parseInt(profile.burnout_score) : 0,

      // Extended fields
      date_of_birth: profile.date_of_birth || null,
      gender: profile.gender || null,
      marital_status: profile.marital_status || null,
      bank_name: profile.bank_name || null,
      bank_ifsc: profile.bank_ifsc || null,
      bank_branch: profile.bank_branch || null,
      bank_account_number: profile.bank_account_number || null,
      uan_number: profile.uan_number || null,
      pf_number: profile.pf_number || null,
      current_address: profile.current_address || null,
      permanent_address: profile.permanent_address || null,
      languages_known: parseJsonb(profile.languages_known),
      blood_group: profile.blood_group || null,
      height: profile.height || null,
      weight: profile.weight || null,
      medical_history: profile.medical_history || null,
      family_details: parseJsonb(profile.family_details),
      bank_details: parseJsonb(profile.bank_details),
      personal_details: parseJsonb(profile.personal_details),
      address: parseJsonb(profile.address),

      created_at: profile.created_at || null,
      updated_at: profile.updated_at || null,
    };
  } catch (error) {
    console.error('[profiles] Error transforming profile:', error);
    console.error('[profiles] Profile data:', JSON.stringify(profile, null, 2));
    throw new Error(`Failed to transform profile: ${error.message}`);
  }
}

/**
 * Get all profiles
 */
export async function getAllProfiles() {
  try {
    const profiles = await profilesModel.getAllProfiles();
    return profiles.map(transformProfile).filter(p => p !== null);
  } catch (error) {
    console.error('[profiles] Error in getAllProfiles service:', error);
    throw error;
  }
}

/**
 * Get profile by ID
 */
export async function getProfileById(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const profile = await profilesModel.getProfileById(userId);

    if (!profile) {
      return null;
    }

    return transformProfile(profile);
  } catch (error) {
    console.error('[profiles] Error in getProfileById service:', error);
    console.error('[profiles] User ID:', userId);
    throw error;
  }
}

/**
 * Update profile
 */
export async function updateProfile(userId, profileData) {
  // Check if user exists
  const exists = await profilesModel.userExists(userId);
  if (!exists) {
    throw new Error('User not found');
  }

  // Update user name if provided
  if (profileData.full_name) {
    await profilesModel.updateUserName(userId, profileData.full_name);
  }

  // Update official email (users.email) if provided
  if (profileData.email) {
    await profilesModel.updateUserEmail(userId, profileData.email.toLowerCase().trim());
  }

  // Upsert profile. Ensure the canonical `id` (UUID) comes from the route/userId
  // and cannot be overridden by client-supplied `id` in profileData.
  await profilesModel.upsertProfile({
    ...profileData,
    id: userId,
  });

  return { profile_id: userId };
}

/**
 * Delete profile for a given user id
 */
export async function deleteProfile(userId) {
  console.log('[profiles.service] deleteProfile called for userId:', userId);

  // Check if user exists first
  const userExists = await profilesModel.userExists(userId);
  console.log('[profiles.service] User exists:', userExists);

  if (!userExists) {
    throw new Error('User not found');
  }

  // Delete in order: profiles -> user_roles -> users (due to foreign key constraints)
  // 1. Delete profile row (if exists)
  const profileResult = await profilesModel.deleteProfileById(userId);
  console.log('[profiles.service] Profile deleted, result:', profileResult.rowCount);

  // 2. Delete user roles
  const roleResult = await profilesModel.deleteUserRoleById(userId);
  console.log('[profiles.service] User roles deleted, result:', roleResult.rowCount);

  // 3. Delete user
  const userResult = await profilesModel.deleteUserById(userId);
  console.log('[profiles.service] User deleted, result:', userResult.rowCount);

  return { user_id: userId, deleted: true };
}

