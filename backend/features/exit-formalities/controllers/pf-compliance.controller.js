/**
 * PF & Compliance Controller
 * Handle request/response for PF, Gratuity, and Compliance operations
 * Call services
 * NO database queries, NO business logic
 */

import * as exitService from '../services/exit-formalities.service.js';

/**
 * Get PF management
 */
export async function getPFManagement(req, res) {
  try {
    const { id } = req.params;
    const pfManagement = await exitService.getPFManagement(id);
    res.json({ pf_management: pfManagement });
  } catch (error) {
    console.error('[exit-formalities] Get PF management error:', error);
    res.status(500).json({
      error: 'Failed to get PF management',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Initiate PF exit
 */
export async function initiatePFExit(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    const { pf_detail_id } = req.body;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can initiate PF exit'
      });
    }

    const pfManagement = await exitService.initiatePFExit(id, userId, pf_detail_id);

    res.json({
      message: 'PF exit initiated successfully',
      pf_management: pfManagement
    });
  } catch (error) {
    console.error('[exit-formalities] Initiate PF exit error:', error);
    res.status(500).json({
      error: 'Failed to initiate PF exit',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get gratuity
 */
export async function getGratuity(req, res) {
  try {
    const { id } = req.params;
    const gratuity = await exitService.getGratuity(id);
    res.json({ gratuity });
  } catch (error) {
    console.error('[exit-formalities] Get gratuity error:', error);
    res.status(500).json({
      error: 'Failed to get gratuity',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Calculate gratuity
 */
export async function calculateGratuity(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    const { last_drawn_salary, join_date, last_working_day } = req.body;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can calculate gratuity'
      });
    }

    if (!last_drawn_salary || !join_date || !last_working_day) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'last_drawn_salary, join_date, and last_working_day are required'
      });
    }

    const gratuity = await exitService.calculateGratuity(id, userId, last_drawn_salary, join_date, last_working_day);

    res.json({
      message: 'Gratuity calculated successfully',
      gratuity
    });
  } catch (error) {
    console.error('[exit-formalities] Calculate gratuity error:', error);
    res.status(500).json({
      error: 'Failed to calculate gratuity',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get compliance checklist
 */
export async function getComplianceChecklist(req, res) {
  try {
    const { id } = req.params;
    const compliance = await exitService.getComplianceChecklist(id);
    res.json({ compliance });
  } catch (error) {
    console.error('[exit-formalities] Get compliance checklist error:', error);
    res.status(500).json({
      error: 'Failed to get compliance checklist',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Update compliance item
 */
export async function updateComplianceItem(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can update compliance items'
      });
    }

    const compliance = await exitService.updateComplianceItem({
      ...req.body,
      exit_request_id: id,
      completed_by: userId
    });

    res.json({
      message: 'Compliance item updated successfully',
      compliance
    });
  } catch (error) {
    console.error('[exit-formalities] Update compliance item error:', error);
    res.status(500).json({
      error: 'Failed to update compliance item',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get compliance documents
 */
export async function getComplianceDocuments(req, res) {
  try {
    const { id } = req.params;
    const documents = await exitService.getComplianceDocuments(id);
    res.json({ documents });
  } catch (error) {
    console.error('[exit-formalities] Get compliance documents error:', error);
    res.status(500).json({
      error: 'Failed to get compliance documents',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Add compliance document
 */
export async function addComplianceDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can add compliance documents'
      });
    }

    const document = await exitService.addComplianceDocument({
      ...req.body,
      exit_request_id: id,
      uploaded_by: userId
    });

    res.status(201).json({
      message: 'Compliance document added successfully',
      document
    });
  } catch (error) {
    console.error('[exit-formalities] Add compliance document error:', error);
    res.status(500).json({
      error: 'Failed to add compliance document',
      message: error.message || 'Internal server error'
    });
  }
}

