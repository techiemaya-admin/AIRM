/**
 * Dues Controller
 * Handle request/response for employee dues (payable and recoverable)
 * Call services
 * NO database queries, NO business logic
 */

import * as exitService from '../services/exit-formalities.service.js';

/**
 * Get payable dues
 */
export async function getPayableDues(req, res) {
  try {
    const { id } = req.params;
    const dues = await exitService.getPayableDues(id);
    res.json({ dues });
  } catch (error) {
    console.error('[exit-formalities] Get payable dues error:', error);
    res.status(500).json({
      error: 'Failed to get payable dues',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Add or update payable due
 */
export async function upsertPayableDue(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can manage payable dues'
      });
    }

    const due = await exitService.upsertPayableDue({
      ...req.body,
      exit_request_id: id,
      calculated_by: userId
    });

    res.json({
      message: 'Payable due updated successfully',
      due
    });
  } catch (error) {
    console.error('[exit-formalities] Upsert payable due error:', error);
    res.status(500).json({
      error: 'Failed to update payable due',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get recoverable dues
 */
export async function getRecoverableDues(req, res) {
  try {
    const { id } = req.params;
    const dues = await exitService.getRecoverableDues(id);
    res.json({ dues });
  } catch (error) {
    console.error('[exit-formalities] Get recoverable dues error:', error);
    res.status(500).json({
      error: 'Failed to get recoverable dues',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Add or update recoverable due
 */
export async function upsertRecoverableDue(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can manage recoverable dues'
      });
    }

    const due = await exitService.upsertRecoverableDue({
      ...req.body,
      exit_request_id: id,
      calculated_by: userId
    });

    res.json({
      message: 'Recoverable due updated successfully',
      due
    });
  } catch (error) {
    console.error('[exit-formalities] Upsert recoverable due error:', error);
    res.status(500).json({
      error: 'Failed to update recoverable due',
      message: error.message || 'Internal server error'
    });
  }
}


