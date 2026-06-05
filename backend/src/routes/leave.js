/**
 * Leave Requests Routes
 * Handles leave/PTO request operations
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../../shared/database/connection.js';
import { authenticate, requireAdmin } from '../../core/auth/authMiddleware.js';

const router = express.Router();
router.use(authenticate);

/**
 * Get leave requests
 * GET /api/leave
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    // Check if admin
    const roleResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );
    const isAdmin = roleResult.rows[0]?.role === 'admin';

    let query = `
      SELECT 
        lr.*,
        u.email as user_email,
        COALESCE(u.full_name, '') as user_full_name
      FROM leave_requests lr
      LEFT JOIN users u ON lr.user_id = u.id
    `;

    const params = [];

    if (!isAdmin) {
      query += ` WHERE lr.user_id = $1`;
      params.push(userId);
    }

    query += ` ORDER BY lr.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      leave_requests: result.rows,
    });
  } catch (error) {
    console.error('❌ Get leave requests error:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get leave requests',
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * Create leave request
 * POST /api/leave
 */
router.post('/', [
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
  body('leave_type').isIn(['Casual Leave', 'Privilege Leave', 'Sick Leave', 'Unpaid Leave', 'Compensatory Off']),
  body('session').optional().isIn(['Full Day', 'First Half', 'Second Half']),
  body('reason').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId;
    const { start_date, end_date, leave_type, reason, session } = req.body;

    // Validate date range
    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ 
        error: 'Invalid date range',
        message: 'End date must be after start date' 
      });
    }

    const result = await pool.query(
      `INSERT INTO leave_requests (
        id, user_id, start_date, end_date, leave_type, session, reason, status
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *`,
      [userId, start_date, end_date, leave_type, session || 'Full Day', reason || null]
    );

    res.status(201).json({
      message: 'Leave request created successfully',
      leave_request: result.rows[0],
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ 
      error: 'Failed to create leave request',
      message: 'Internal server error' 
    });
  }
});

/**
 * Update leave request status (Admin only)
 * PUT /api/leave/:id/status
 */
router.put('/:id/status', requireAdmin, [
  body('status').isIn(['approved', 'rejected']),
  body('admin_notes').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const userId = req.userId;

    const result = await pool.query(
      `UPDATE leave_requests 
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           admin_notes = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, userId, admin_notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    res.json({
      message: 'Leave request updated successfully',
      leave_request: result.rows[0],
    });
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({ 
      error: 'Failed to update leave request',
      message: 'Internal server error' 
    });
  }
});

export default router;

