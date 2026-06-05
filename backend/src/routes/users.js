/**
 * Users Routes
 * Handles user management operations
 */

import express from 'express';
import pool from '../db/connection.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

/**
 * Get all users (Admin only)
 * GET /api/users
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.full_name,
        u.created_at,
        ur.role,
        p.full_name as profile_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN profiles p ON u.id = p.id
      ORDER BY u.created_at DESC`
    );

    res.json({
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.profile_name || user.full_name,
        role: user.role || 'employee',
        created_at: user.created_at,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'Internal server error'
    });
  }
});

/**
 * Get all users with roles (function)
 * GET /api/users/with-roles
 */
router.get('/with-roles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM get_all_users_with_roles()');

    res.json({
      users: result.rows,
    });
  } catch (error) {
    console.error('Get users with roles error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'Internal server error'
    });
  }
});

/**
 * Toggle user role (Admin only)
 * PUT /api/users/:id/role
 */
router.put('/:id/role', requireAdmin, async (req, res) => {
  console.log('🚀 [LEGACY_UPDATE_ROLE] Request received for ID:', req.params.id, 'Role:', req.body.role);
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'employee', 'ex-employee'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be "admin", "employee", or "ex-employee"'
      });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete existing roles to ensure user has only one role
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

    // Insert new role
    await pool.query(
      `INSERT INTO user_roles (id, user_id, role)
       VALUES (gen_random_uuid(), $1, $2)`,
      [id, role]
    );

    res.json({
      message: 'User role updated successfully',
      user_id: id,
      role,
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      error: 'Failed to update role',
      message: 'Internal server error'
    });
  }
});

/**
 * Get single user
 * GET /api/users/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Users can only see their own profile unless admin
    if (id !== userId && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own profile'
      });
    }

    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.full_name,
        u.created_at,
        ur.role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'Internal server error'
    });
  }
});

export default router;

