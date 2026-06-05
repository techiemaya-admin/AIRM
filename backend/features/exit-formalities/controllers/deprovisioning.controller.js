/**
 * Deprovisioning Controller
 * Handle request/response for access de-provisioning
 * Call services
 * NO database queries, NO business logic
 */

import * as exitService from '../services/exit-formalities.service.js';

/**
 * Get access de-provisioning
 */
export async function getAccessDeprovisioning(req, res) {
  try {
    const { id } = req.params;
    const deprovisioning = await exitService.getAccessDeprovisioning(id);
    res.json({ deprovisioning });
  } catch (error) {
    console.error('[exit-formalities] Get access de-provisioning error:', error);
    res.status(500).json({
      error: 'Failed to get access de-provisioning',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Update access de-provisioning
 */
export async function updateAccessDeprovisioning(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can update access de-provisioning'
      });
    }

    const deprovisioning = await exitService.updateAccessDeprovisioning({
      ...req.body,
      exit_request_id: id,
      revoked_by: userId
    });

    res.json({
      message: 'Access de-provisioning updated successfully',
      deprovisioning
    });
  } catch (error) {
    console.error('[exit-formalities] Update access de-provisioning error:', error);
    res.status(500).json({
      error: 'Failed to update access de-provisioning',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Auto-revoke access
 */
export async function autoRevokeAccess(req, res) {
  try {
    const { id } = req.params;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can auto-revoke access'
      });
    }

    const revoked = await exitService.autoRevokeAccess(id);

    res.json({
      message: 'Access auto-revoked successfully',
      revoked
    });
  } catch (error) {
    console.error('[exit-formalities] Auto-revoke access error:', error);
    res.status(500).json({
      error: 'Failed to auto-revoke access',
      message: error.message || 'Internal server error'
    });
  }
}

