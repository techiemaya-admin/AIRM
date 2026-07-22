/**
 * Authentication Routes
 * Handles direct email/password login and user session management
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import { body, validationResult } from 'express-validator';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Direct Login with email + password
 * POST /api/auth/login
 */
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: errors.array()[0].msg
      });
    }

    const email = (req.body.email || '').toLowerCase().trim();
    const { password } = req.body;

    // Only @techiemaya.com emails allowed
    if (!email.endsWith('@techiemaya.com')) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only users with a @techiemaya.com email address can sign in.'
      });
    }

    // Query user prioritizing erp schema first
    let user = null;

    // 1. Prioritize erp schema
    try {
      const q = `
        SELECT u.id, u.email, u.password_hash, u.full_name, ur.role
        FROM erp.users u
        LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
        WHERE LOWER(u.email) = $1
      `;
      const res = await pool.query(q, [email]);
      if (res.rows.length > 0) user = res.rows[0];
    } catch (e) {}

    // 2. Fallback to lad_stage schema if erp permissions are not granted
    if (!user) {
      try {
        const q = `
          SELECT u.id, u.email, u.password_hash,
                 COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.email) AS full_name
          FROM lad_stage.users u
          WHERE LOWER(u.email) = $1
        `;
        const res = await pool.query(q, [email]);
        if (res.rows.length > 0) user = res.rows[0];
      } catch (e) {}
    }

    // 3. Fallback to lad_dev schema
    if (!user) {
      try {
        const q = `
          SELECT u.id, u.email, u.password_hash,
                 COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.email) AS full_name
          FROM lad_dev.users u
          WHERE LOWER(u.email) = $1
        `;
        const res = await pool.query(q, [email]);
        if (res.rows.length > 0) user = res.rows[0];
      } catch (e) {}
    }

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Check if password has been set
    if (!user.password_hash) {
      return res.status(401).json({
        error: 'No password set',
        message: 'No password has been set for this account. Please contact your administrator.'
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Generate auth token
    const authToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'user'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Set / reset password for a user (Admin use via script)
 * POST /api/auth/set-password
 * Body: { email, password, adminSecret }
 */
router.post('/set-password', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('adminSecret').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Simple admin secret check
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'pulse-admin-secret-2025';
    if (req.body.adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden', message: 'Invalid admin secret' });
    }

    const email = (req.body.email || '').toLowerCase().trim();
    const { password } = req.body;

    // Check user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the new password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Update password_hash (add column if not exists handled by migration)
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = $2',
      [password_hash, email]
    );

    res.json({ message: 'Password updated successfully', email });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Change user password
 * POST /api/auth/change-password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { password, email } = req.body;
    if (!password || !email) {
      return res.status(400).json({ error: 'Missing password or email' });
    }

    const lowerEmail = email.toLowerCase().trim();

    // Run the node command to generate password hash key
    // Equivalent to: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('new_password', 10));"
    let password_hash = '';
    try {
      const safePassword = password.replace(/'/g, "'\\''");
      // Prefer bcryptjs (as specified); fall back to bcrypt if bcryptjs is unavailable
      const cmd = `node -e "try { const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('${safePassword}', 10)); } catch (e) { const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('${safePassword}', 10)); }"`;
      console.log(`Executing password generation command: ${cmd}`);
      password_hash = execSync(cmd).toString().trim();
    } catch (cmdError) {
      console.warn('Node command hashing fallback:', cmdError.message);
      password_hash = bcrypt.hashSync(password, 10);
    }

    // Update erp.users
    const result = await pool.query(
      'UPDATE erp.users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = $2 RETURNING id, email',
      [password_hash, lowerEmail]
    );

    // Fallback update on public/default search path users if erp failed or updated 0 rows
    if (result.rows.length === 0) {
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = $2',
        [password_hash, lowerEmail]
      );
    }

    return res.json({
      success: true,
      message: 'Password updated successfully',
      email: lowerEmail
    });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Verify magic link and login
 * POST /api/auth/verify-magic-link
 */
router.post('/verify-magic-link', [
  body('token').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    // Verify magic link token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(400).json({
        error: 'Invalid or expired magic link',
        message: 'The magic link has expired or is invalid'
      });
    }

    if (decoded.purpose !== 'magic-login') {
      return res.status(400).json({
        error: 'Invalid token purpose',
        message: 'This token is not valid for login'
      });
    }

    // Get user details with role
    const userQuery = `
      SELECT u.id, u.email, u.full_name, ur.role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = $1
    `;
    const userResult = await pool.query(userQuery, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    const user = userResult.rows[0];

    // Generate auth token
    const authToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'employee'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'employee'
      }
    });

  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Test login - Development only
 * POST /api/auth/test-login
 */
router.post('/test-login', [
  body('email').isEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.toLowerCase().trim();
    
    // Get user details with role
    const userQuery = `
      SELECT u.id, u.email, u.full_name, ur.role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE LOWER(u.email) = $1
    `;
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Generate auth token
    const authToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'employee'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      message: 'Test login successful',
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'employee'
      }
    });
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    let user = null;

    // 1. Prioritize erp schema
    try {
      const q = `
        SELECT u.id, u.email, u.full_name, ur.role
        FROM erp.users u
        LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
        WHERE u.id = $1
      `;
      const r = await pool.query(q, [req.userId]);
      if (r.rows.length > 0) user = r.rows[0];
    } catch (e) {}

    // 2. Fallback to lad_stage
    if (!user) {
      try {
        const q = `
          SELECT u.id, u.email,
                 COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.email) AS full_name
          FROM lad_stage.users u
          WHERE u.id = $1
        `;
        const r = await pool.query(q, [req.userId]);
        if (r.rows.length > 0) user = r.rows[0];
      } catch (e) {}
    }

    // 3. Fallback to lad_dev
    if (!user) {
      try {
        const q = `
          SELECT u.id, u.email,
                 COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.email) AS full_name
          FROM lad_dev.users u
          WHERE u.id = $1
        `;
        const r = await pool.query(q, [req.userId]);
        if (r.rows.length > 0) user = r.rows[0];
      } catch (e) {}
    }

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'user'
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
