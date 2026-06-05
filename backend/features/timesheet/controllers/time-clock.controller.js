/**
 * Time Clock Controller
 * Handles HTTP requests for time clock operations
 */

import { body, validationResult } from 'express-validator';
import pool from '../../../shared/database/connection.js';
import * as timeClockService from '../services/time-clock.service.js';

/**
 * Clock in
 * POST /api/timesheets/clock-in
 */
export async function clockIn(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId;
    const clockInData = req.body;
    console.log('⏱️ Clock-in request:', { userId, clockInData });

    try {
      const entry = await timeClockService.clockIn(userId, clockInData);
      console.log('✅ Clock-in successful:', entry.id);
      res.status(201).json({
        message: 'Clocked in successfully',
        entry,
      });
    } catch (error) {
      console.error('❌ Clock-in service error:', error.message);
      if (error.message === 'Already clocked in') {
        return res.status(400).json({
          error: 'Already clocked in',
          message: 'You already have an active time entry'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Clock in error:', error);
    console.error('❌ Clock in error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to clock in',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Clock out
 * POST /api/timesheets/clock-out
 */
export async function clockOut(req, res) {
  try {
    const userId = req.userId;
    const { comment } = req.body;

    try {
      const result = await timeClockService.clockOut(userId, comment);
      res.json({
        message: 'Clocked out successfully',
        ...result,
      });
    } catch (error) {
      if (error.message === 'No active entry') {
        return res.status(400).json({
          error: 'No active entry',
          message: 'You are not currently clocked in'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({
      error: 'Failed to clock out',
      message: 'Internal server error'
    });
  }
}

/**
 * Pause time
 * POST /api/timesheets/pause
 */
export async function pause(req, res) {
  try {
    const userId = req.userId;
    const { reason } = req.body;

    try {
      const entry = await timeClockService.pauseTime(userId, reason);
      res.json({
        message: 'Time paused',
        entry,
      });
    } catch (error) {
      if (error.message === 'No active entry') {
        return res.status(400).json({
          error: 'No active entry',
          message: 'You are not currently clocked in'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Pause error:', error);
    res.status(500).json({
      error: 'Failed to pause',
      message: 'Internal server error'
    });
  }
}

/**
 * Resume time
 * POST /api/timesheets/resume
 */
export async function resume(req, res) {
  try {
    const userId = req.userId;

    try {
      const entry = await timeClockService.resumeTime(userId);
      res.json({
        message: 'Time resumed',
        entry,
      });
    } catch (error) {
      if (error.message === 'No paused entry') {
        return res.status(400).json({
          error: 'No paused entry',
          message: 'You do not have a paused time entry'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Resume error:', error.message);
    console.error('❌ Resume error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to resume',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get current time entry
 * GET /api/timesheets/current
 */
export async function getCurrent(req, res) {
  try {
    const userId = req.userId;
    const entry = await timeClockService.getCurrentEntry(userId);
    res.json({ entry });
  } catch (error) {
    console.error('Get current entry error:', error);
    res.status(500).json({
      error: 'Failed to get current entry',
      message: 'Internal server error'
    });
  }
}

/**
 * Get time entries
 * GET /api/timesheets/entries
 */
export async function getEntries(req, res) {
  try {
    const userId = req.userId;

    // Check if user is admin with error handling
    let isAdmin = false;
    try {
      const roleResult = await pool.query(
        'SELECT role FROM user_roles WHERE user_id = $1',
        [userId]
      );
      isAdmin = roleResult.rows[0]?.role === 'admin' || false;
    } catch (roleError) {
      console.warn('Warning: Could not fetch user role:', roleError.message);
      isAdmin = false;
    }

    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      status: req.query.status,
      user_id: req.query.user_id,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 100,
    };

    const entries = await timeClockService.getTimeClockEntries(userId, isAdmin, filters);
    res.json({ entries });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({
      error: 'Failed to get entries',
      message: 'Internal server error'
    });
  }
}

/**
 * Get all active entries (Admin only)
 * GET /api/timesheets/active
 */
export async function getActive(req, res) {
  try {
    const entries = await timeClockService.getAllActiveEntries();
    res.json({ entries });
  } catch (error) {
    console.error('Get active entries error:', error);
    res.status(500).json({
      error: 'Failed to get active entries',
      message: error.message || 'Internal server error'
    });
  }
}

