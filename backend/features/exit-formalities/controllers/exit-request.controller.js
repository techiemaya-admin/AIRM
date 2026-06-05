/**
 * Exit Request Controller
 * Handle request/response for exit request operations
 * Call services
 * NO database queries, NO business logic
 */

import * as exitService from '../services/exit-formalities.service.js';

/**
 * Get all exit requests
 */
export async function getAllExitRequests(req, res) {
  try {
    const filters = {
      status: req.query.status,
      department: req.query.department,
      manager_id: req.query.manager_id,
    };

    const exitRequests = await exitService.getAllExitRequests(filters);
    res.json({ exit_requests: exitRequests });
  } catch (error) {
    console.error('[exit-formalities] Get all exit requests error:', error);
    res.status(500).json({
      error: 'Failed to get exit requests',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get exit request by ID
 */
export async function getExitRequestById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    const exitRequest = await exitService.getExitRequestById(id);

    if (!exitRequest) {
      return res.status(404).json({ error: 'Exit request not found' });
    }

    // Authorization: Employee can only view their own, Manager/HR/Admin can view all
    if (exitRequest.user_id !== userId && !isAdmin && !isHR && exitRequest.manager_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this exit request'
      });
    }

    // Get related data
    const clearance = await exitService.getClearanceChecklist(id);
    const interview = await exitService.getExitInterview(id);
    const documents = await exitService.getExitDocuments(id);
    const activityLog = await exitService.getActivityLog(id);

    res.json({
      exit_request: exitRequest,
      clearance,
      interview,
      documents,
      activity_log: activityLog
    });
  } catch (error) {
    console.error('[exit-formalities] Get exit request error:', error);
    res.status(500).json({
      error: 'Failed to get exit request',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Create exit request
 */
export async function createExitRequest(req, res) {
  try {
    const requesterId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    // If admin/HR provides a user_id in body, use it. Otherwise, use requester's ID.
    const targetUserId = (isAdmin || isHR) && req.body.user_id ? req.body.user_id : requesterId;

    // Add initiated_by to track who created the request (if different)
    const exitData = {
      ...req.body,
      user_id: targetUserId,
      initiated_by: requesterId !== targetUserId ? requesterId : null
    };

    const exitRequest = await exitService.createExitRequest(exitData);

    res.status(201).json({
      message: 'Exit request created successfully',
      exit_request: exitRequest
    });
  } catch (error) {
    console.error('[exit-formalities] Create exit request error:', error);

    if (error.message === 'User already has an active exit request') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to create exit request',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Update exit request
 */
export async function updateExitRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    const exitRequest = await exitService.getExitRequestById(id);
    if (!exitRequest) {
      return res.status(404).json({ error: 'Exit request not found' });
    }

    // Authorization: Only employee can update their own request (if not approved), or HR/Admin
    if (exitRequest.user_id !== userId && !isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this exit request'
      });
    }

    // Only allow updates if status is 'initiated' or 'cancelled'
    if (exitRequest.status !== 'initiated' && exitRequest.status !== 'cancelled' && exitRequest.user_id === userId) {
      return res.status(400).json({
        error: 'Cannot update',
        message: 'Exit request cannot be modified after approval'
      });
    }

    const updated = await exitService.updateExitRequest(id, req.body);
    res.json({
      message: 'Exit request updated successfully',
      exit_request: updated
    });
  } catch (error) {
    console.error('[exit-formalities] Update exit request error:', error);
    res.status(500).json({
      error: 'Failed to update exit request',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Approve exit request (Manager or HR)
 */
export async function approveExitRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    const { role } = req.body; // 'manager' or 'hr'

    const exitRequest = await exitService.getExitRequestById(id);
    if (!exitRequest) {
      return res.status(404).json({ error: 'Exit request not found' });
    }

    // Manager approval
    if (role === 'manager') {
      if (exitRequest.manager_id !== userId && !isAdmin && !isHR) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only the reporting manager can approve'
        });
      }
      if (exitRequest.status !== 'initiated') {
        return res.status(400).json({
          error: 'Invalid status',
          message: 'Exit request must be in initiated status for manager approval'
        });
      }
      await exitService.updateExitRequestStatus(id, 'manager_approved', userId);
    }
    // HR approval
    else if (role === 'hr') {
      if (!isAdmin && !isHR) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only HR or Admin can approve'
        });
      }
      if (exitRequest.status !== 'manager_approved') {
        return res.status(400).json({
          error: 'Invalid status',
          message: 'Exit request must be manager approved before HR approval'
        });
      }
      await exitService.updateExitRequestStatus(id, 'hr_approved', userId);
    } else {
      return res.status(400).json({ error: 'Invalid role', message: 'Role must be manager or hr' });
    }

    const updated = await exitService.getExitRequestById(id);
    res.json({
      message: 'Exit request approved successfully',
      exit_request: updated
    });
  } catch (error) {
    console.error('[exit-formalities] Approve exit request error:', error);
    res.status(500).json({
      error: 'Failed to approve exit request',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Update clearance item
 */
export async function updateClearance(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    const clearanceData = {
      ...req.body,
      exit_request_id: id,
      approver_id: userId
    };

    // Authorization: Only HR/Admin or department heads can update clearance
    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can update clearance'
      });
    }

    const clearance = await exitService.updateClearanceItem(clearanceData);
    res.json({
      message: 'Clearance updated successfully',
      clearance
    });
  } catch (error) {
    console.error('[exit-formalities] Update clearance error:', error);
    res.status(500).json({
      error: 'Failed to update clearance',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Complete exit (final step)
 */
export async function completeExit(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can complete exit'
      });
    }

    const exitRequest = await exitService.getExitRequestById(id);
    if (!exitRequest) {
      return res.status(404).json({ error: 'Exit request not found' });
    }

    if (exitRequest.status !== 'clearance_completed' && exitRequest.status !== 'settlement_pending') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Exit request must have completed clearance before final completion'
      });
    }

    await exitService.updateExitRequestStatus(id, 'completed', userId);
    const updated = await exitService.getExitRequestById(id);

    res.json({
      message: 'Exit completed successfully',
      exit_request: updated
    });
  } catch (error) {
    console.error('[exit-formalities] Complete exit error:', error);
    res.status(500).json({
      error: 'Failed to complete exit',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Save exit interview
 */
export async function saveExitInterview(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can conduct exit interviews'
      });
    }

    const interviewData = {
      ...req.body,
      exit_request_id: id,
      conducted_by: userId
    };

    const interview = await exitService.saveExitInterview(interviewData);
    res.json({
      message: 'Exit interview saved successfully',
      interview
    });
  } catch (error) {
    console.error('[exit-formalities] Save exit interview error:', error);
    res.status(500).json({
      error: 'Failed to save exit interview',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Add exit document
 */
export async function addExitDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can add exit documents'
      });
    }

    const documentData = {
      ...req.body,
      exit_request_id: id,
      uploaded_by: userId
    };

    const document = await exitService.addExitDocument(documentData);
    res.status(201).json({
      message: 'Document added successfully',
      document
    });
  } catch (error) {
    console.error('[exit-formalities] Add exit document error:', error);
    res.status(500).json({
      error: 'Failed to add document',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Delete exit request
 */
export async function deleteExitRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can delete exit requests'
      });
    }

    const exitRequest = await exitService.getExitRequestById(id);
    if (!exitRequest) {
      return res.status(404).json({ error: 'Exit request not found' });
    }

    await exitService.deleteExitRequest(id);

    res.json({
      message: 'Exit request deleted successfully'
    });
  } catch (error) {
    console.error('[exit-formalities] Delete exit request error:', error);
    res.status(500).json({
      error: 'Failed to delete exit request',
      message: error.message || 'Internal server error'
    });
  }
}

