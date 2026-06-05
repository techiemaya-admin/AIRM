/**
 * PF Management Controller
 * Handle request/response for PF details, contributions, documents
 * Call services
 * NO database queries, NO business logic
 */

import * as pfService from '../services/pf-management.service.js';

/**
 * Get PF details
 */
export async function getPfDetails(req, res) {
  try {
    const userId = req.params['user-id'];
    const currentUserId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    // Employees can only view their own PF details
    const targetUserId = userId || currentUserId;
    if (targetUserId !== currentUserId && !isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this PF information'
      });
    }

    const pfDetails = await pfService.getPfDetails(targetUserId);
    res.json({ pf_details: pfDetails });
  } catch (error) {
    console.error('[payroll-pf] Get PF details error:', error);
    res.status(500).json({
      error: 'Failed to get PF details',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Create or update PF details
 */
export async function upsertPfDetails(req, res) {
  try {
    const userId = req.params['user-id'];
    const currentUserId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    // Only HR/Admin can create/update PF details
    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can manage PF details'
      });
    }

    const pfData = {
      ...req.body,
      user_id: userId || req.body.user_id,
      updated_by: currentUserId
    };

    const pfDetails = await pfService.upsertPfDetails(pfData);

    res.json({
      message: 'PF details saved successfully',
      pf_details: pfDetails
    });
  } catch (error) {
    console.error('[payroll-pf] Upsert PF details error:', error);
    res.status(500).json({
      error: 'Failed to save PF details',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get PF contributions
 */
export async function getPfContributions(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    const filters = {
      month: req.query.month ? parseInt(req.query.month) : undefined,
      year: req.query.year ? parseInt(req.query.year) : undefined,
    };

    // Employees can only see their own contributions
    if (!isAdmin && !isHR) {
      filters.user_id = userId;
    } else if (req.query.user_id) {
      filters.user_id = req.query.user_id;
    }

    const contributions = await pfService.getPfContributions(filters);
    res.json({ contributions });
  } catch (error) {
    console.error('[payroll-pf] Get PF contributions error:', error);
    res.status(500).json({
      error: 'Failed to get PF contributions',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Create PF contribution
 */
export async function createPfContribution(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can create PF contributions'
      });
    }

    const contributionData = {
      ...req.body,
      created_by: userId
    };

    const contribution = await pfService.createPfContribution(contributionData);

    res.status(201).json({
      message: 'PF contribution created successfully',
      contribution
    });
  } catch (error) {
    console.error('[payroll-pf] Create PF contribution error:', error);
    res.status(500).json({
      error: 'Failed to create PF contribution',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get PF documents
 */
export async function getPfDocuments(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    const filters = {
      document_type: req.query.document_type,
    };

    // Employees can only see their own documents
    if (!isAdmin && !isHR) {
      filters.user_id = userId;
    } else if (req.query.user_id) {
      filters.user_id = req.query.user_id;
    }

    const documents = await pfService.getPfDocuments(filters);
    res.json({ documents });
  } catch (error) {
    console.error('[payroll-pf] Get PF documents error:', error);
    res.status(500).json({
      error: 'Failed to get PF documents',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Add PF document
 */
export async function addPfDocument(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can upload PF documents'
      });
    }

    const documentData = {
      ...req.body,
      uploaded_by: userId
    };

    const document = await pfService.addPfDocument(documentData);

    res.status(201).json({
      message: 'PF document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('[payroll-pf] Add PF document error:', error);
    res.status(500).json({
      error: 'Failed to upload PF document',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get payroll audit log
 */
export async function getPayrollAuditLog(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can view audit logs'
      });
    }

    const filters = {
      user_id: req.query.user_id,
      action: req.query.action,
      entity_type: req.query.entity_type,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const auditLog = await pfService.getPayrollAuditLog(filters);
    res.json({ audit_log: auditLog });
  } catch (error) {
    console.error('[payroll-pf] Get audit log error:', error);
    res.status(500).json({
      error: 'Failed to get audit log',
      message: error.message || 'Internal server error'
    });
  }
}

