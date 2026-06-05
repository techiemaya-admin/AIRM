/**
 * Labels Routes
 * Handles label operations
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../../shared/database/connection.js';
import { authenticate, requireAdmin } from '../../core/auth/authMiddleware.js';

const router = express.Router();

// Get labels is public (no auth required)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM labels ORDER BY name'
    );

    res.json({
      labels: result.rows,
    });
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ 
      error: 'Failed to get labels',
      message: 'Internal server error' 
    });
  }
});

// Create/update/delete requires admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * Create label
 * POST /api/labels
 */
router.post('/', [
  body('name').trim().notEmpty(),
  body('color').matches(/^#[0-9A-Fa-f]{6}$/),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, color, description } = req.body;
    const userId = req.userId;

    const result = await pool.query(
      `INSERT INTO labels (name, color, description, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, color, description || null, userId]
    );

    res.status(201).json({
      message: 'Label created successfully',
      label: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        error: 'Label already exists',
        message: 'A label with this name already exists' 
      });
    }
    console.error('Create label error:', error);
    res.status(500).json({ 
      error: 'Failed to create label',
      message: 'Internal server error' 
    });
  }
});

export default router;

