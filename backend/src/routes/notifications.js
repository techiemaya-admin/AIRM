/**
 * Notifications Routes
 * Handles notification operations
 */

import express from 'express';
import pool from '../../shared/database/connection.js';
import { authenticate } from '../../core/auth/authMiddleware.js';

const router = express.Router();
router.use(authenticate);

/**
 * Get notifications
 * GET /api/notifications
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { unread_only } = req.query;

    // Check if notifications table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'erp' 
        AND table_name = 'notifications'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Table doesn't exist, return empty array
      return res.json({ notifications: [] });
    }

    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;

    const params = [userId];

    if (unread_only === 'true') {
      query += ` AND read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);

    res.json({
      notifications: result.rows,
    });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    // Return empty notifications instead of error to avoid breaking the UI
    res.json({ notifications: [] });
  }
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await pool.query(
      `UPDATE notifications 
       SET read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0],
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark as read',
      message: 'Internal server error' 
    });
  }
});

/**
 * Mark all as read
 * PUT /api/notifications/read-all
 */
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.userId;

    await pool.query(
      `UPDATE notifications 
       SET read = true
       WHERE user_id = $1 AND read = false`,
      [userId]
    );

    res.json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark all as read',
      message: 'Internal server error' 
    });
  }
});

/**
 * Get unread count
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      'SELECT get_unread_notification_count($1) as count',
      [userId]
    );

    res.json({
      count: parseInt(result.rows[0].count),
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      error: 'Failed to get unread count',
      message: 'Internal server error' 
    });
  }
});

export default router;

