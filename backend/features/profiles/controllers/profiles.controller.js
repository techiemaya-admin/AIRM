/**
 * Profiles Controller
 * Handle request/response
 * Call services
 * NO database queries, NO business logic
 */

import * as profilesService from '../services/profiles.service.js';

/**
 * Get all profiles
 */
export async function getAllProfiles(req, res) {
  try {
    const profiles = await profilesService.getAllProfiles();
    res.json({ profiles });
  } catch (error) {
    console.error('[profiles] Get all profiles error:', error);
    res.status(500).json({
      error: 'Failed to get profiles',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get profile by ID
 */
export async function getProfileById(req, res) {
  try {
    const { id } = req.params;

    const profile = await profilesService.getProfileById(id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('[profiles] Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Update profile
 */
export async function updateProfile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Authorization check
    if (id !== userId && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own profile'
      });
    }

    const result = await profilesService.updateProfile(id, req.body);

    res.json({
      message: 'Profile updated successfully',
      ...result
    });
  } catch (error) {
    console.error('[profiles] Update profile error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Delete profile
 */
export async function deleteProfile(req, res) {
  try {
    const { id } = req.params;
    console.log(`[profiles.controller] deleteProfile called for id=${id}, auth user=${req.userId}, isAdmin=${req.isAdmin}`);
    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Authorization check
    if (id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own profile' });
    }

    const result = await profilesService.deleteProfile(id);

    res.json({ message: 'Profile deleted successfully', ...result });
  } catch (error) {
    console.error('[profiles] Delete profile error:', error);
    if (error.message === 'User not found' || error.message === 'Profile not found') {
      return res.status(404).json({ error: 'Profile not found', message: 'Profile not found' });
    }
    res.status(500).json({ error: 'Failed to delete profile', message: error.message || 'Internal server error' });
  }
}

