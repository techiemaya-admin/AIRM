/**
 * Timesheet Controller
 * Handles HTTP requests for timesheet operations
 */

import { body, validationResult } from 'express-validator';
import pool from '../../../shared/database/connection.js';
import * as timesheetService from '../services/timesheet.service.js';

/**
 * Get timesheets
 * GET /api/timesheets
 */
export async function getTimesheets(req, res) {
  try {
    const userId = req.userId;
    
    // Check if user is admin with error handling
    let isAdmin = false;
    try {
      const roleResult = await pool.query(
        'SELECT role FROM user_roles WHERE user_id = $1',
        [userId]
      );
      isAdmin = roleResult.rows.length > 0 && roleResult.rows[0].role === 'admin';
    } catch (roleError) {
      console.warn('Warning: Could not fetch user role:', roleError.message);
      isAdmin = false;
    }
    
    const { week_start, user_id } = req.query;

    // Determine target user
    let targetUserId = userId;
    if (isAdmin && user_id) {
      targetUserId = user_id;
    } else if (!isAdmin && user_id && user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own timesheet'
      });
    }

    const timesheets = await timesheetService.getTimesheets(targetUserId, week_start);
    res.json({ timesheets });
  } catch (error) {
    console.error('Get timesheets error:', error);
    res.status(500).json({ 
      error: 'Failed to get timesheets',
      message: error.message || 'Internal server error' 
    });
  }
}

/**
 * Save timesheet
 * POST /api/timesheets
 */
export async function saveTimesheet(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId;
    
    // Check if user is admin with error handling
    let isAdmin = false;
    try {
      const roleResult = await pool.query(
        'SELECT role FROM user_roles WHERE user_id = $1',
        [userId]
      );
      isAdmin = roleResult.rows.length > 0 && roleResult.rows[0].role === 'admin';
    } catch (roleError) {
      console.warn('Warning: Could not fetch user role:', roleError.message);
      isAdmin = false;
    }
    
    const { week_start, entries, user_id } = req.body;

    // Determine target user
    let targetUserId = userId;
    if (isAdmin && user_id) {
      targetUserId = user_id;
    } else if (!isAdmin && user_id && user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only save your own timesheet'
      });
    }

    const result = await timesheetService.saveTimesheet(targetUserId, week_start, entries);
    res.json({
      message: 'Timesheet saved successfully',
      ...result,
    });
  } catch (error) {
    console.error('Save timesheet error:', error);
    res.status(500).json({ 
      error: 'Failed to save timesheet',
      message: error.message || 'Internal server error' 
    });
  }
}

/**
 * Get timesheet by ID
 * GET /api/timesheets/:id
 */
export async function getTimesheetById(req, res) {
  try {
    const { id } = req.params;
    const timesheet = await timesheetService.getTimesheetById(id);
    res.json({ timesheet });
  } catch (error) {
    if (error.message === 'Timesheet not found') {
      return res.status(404).json({ 
        error: 'Timesheet not found',
        message: 'The requested timesheet does not exist' 
      });
    }
    
    console.error('Get timesheet by ID error:', error);
    res.status(500).json({ 
      error: 'Failed to get timesheet',
      message: 'Internal server error' 
    });
  }
}

