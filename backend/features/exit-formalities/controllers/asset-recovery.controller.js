/**
 * Asset Recovery Controller
 * Handle request/response for asset recovery and handover
 * Call services
 * NO database queries, NO business logic
 */

import * as exitService from '../services/exit-formalities.service.js';

/**
 * Get employee assets
 */
export async function getEmployeeAssets(req, res) {
  try {
    // Check if this is being called from the wrong route (/:id/assets instead of /assets)
    if (req.params.id) {
      // This should not happen if routes are ordered correctly
      // But if it does, we're in the wrong handler
      return res.status(404).json({
        error: 'Not found',
        message: 'Route not found'
      });
    }

    const userId = req.query.user_id || req.userId;
    
    // Validate userId is a valid UUID if provided
    if (userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a valid UUID'
      });
    }

    const assets = await exitService.getEmployeeAssets(userId);
    res.json({ assets });
  } catch (error) {
    console.error('[exit-formalities] Get employee assets error:', error);
    res.status(500).json({
      error: 'Failed to get employee assets',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Create employee asset
 */
export async function createEmployeeAsset(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can create employee assets'
      });
    }

    const asset = await exitService.createEmployeeAsset({
      ...req.body,
      assigned_by: userId
    });

    res.status(201).json({
      message: 'Employee asset created successfully',
      asset
    });
  } catch (error) {
    console.error('[exit-formalities] Create employee asset error:', error);
    res.status(500).json({
      error: 'Failed to create employee asset',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get asset recovery
 */
export async function getAssetRecovery(req, res) {
  try {
    const { id } = req.params;
    const assets = await exitService.getAssetRecovery(id);
    res.json({ assets });
  } catch (error) {
    console.error('[exit-formalities] Get asset recovery error:', error);
    res.status(500).json({
      error: 'Failed to get asset recovery',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Update asset recovery
 */
export async function updateAssetRecovery(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can update asset recovery'
      });
    }

    const recovery = await exitService.updateAssetRecovery({
      ...req.body,
      exit_request_id: id,
      recovered_by: userId
    });

    res.json({
      message: 'Asset recovery updated successfully',
      recovery
    });
  } catch (error) {
    console.error('[exit-formalities] Update asset recovery error:', error);
    res.status(500).json({
      error: 'Failed to update asset recovery',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get asset handover
 */
export async function getAssetHandover(req, res) {
  try {
    const { id } = req.params;
    const handover = await exitService.getAssetHandover(id);
    res.json({ handover });
  } catch (error) {
    console.error('[exit-formalities] Get asset handover error:', error);
    res.status(500).json({
      error: 'Failed to get asset handover',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Generate asset handover document
 */
export async function generateAssetHandover(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can generate asset handover'
      });
    }

    const handover = await exitService.generateAssetHandover(id, {
      ...req.body,
      generated_by: userId
    });

    res.json({
      message: 'Asset handover document generated successfully',
      handover
    });
  } catch (error) {
    console.error('[exit-formalities] Generate asset handover error:', error);
    res.status(500).json({
      error: 'Failed to generate asset handover',
      message: error.message || 'Internal server error'
    });
  }
}

