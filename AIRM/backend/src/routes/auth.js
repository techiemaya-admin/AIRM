/**
 * Authentication Routes
 * Handles magic link login and user session management
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { sendMagicLinkEmail } from '../../shared/services/emailService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Send magic link
 * POST /api/auth/send-magic-link
 */
router.post('/send-magic-link', [
  body('email').isEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Normalize to lowercase manually (consistent with how createUser stores emails)
    const email = (req.body.email || '').toLowerCase().trim();

    // Check if user exists — case-insensitive lookup
    const userQuery = `
      SELECT u.id, u.email, u.full_name
      FROM users u
      WHERE LOWER(u.email) = $1
    `;
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account found with this email address. Please contact your administrator.'
      });
    }

    // Generate magic link token
    const magicToken = jwt.sign(
      {
        userId: userResult.rows[0].id,
        email: userResult.rows[0].email,
        purpose: 'magic-login'
      },
      JWT_SECRET,
      { expiresIn: '15m' } // Magic links expire in 15 minutes
    );

    // Create the magic link URL - use FRONTEND_URL instead of APP_BASE_URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const magicLink = `${frontendUrl}/auth?token=${magicToken}`;

    console.log('🔗 Magic link generated for:', email);

    try {
      // Send email with magic link
      const emailResult = await sendMagicLinkEmail(email, magicLink, userResult.rows[0].full_name);

      // Check if email was actually sent or if it's fallback mode
      if (emailResult.fallback || !emailResult.success) {
        console.log('⚠️ Email service not configured, returning magic link directly');
        res.json({
          message: 'Magic link generated (email service unavailable)',
          emailSent: false,
          magicLink: magicLink,
          frontendUrl: magicLink,
          note: 'Email service is not configured. Use the link below to test.'
        });
      } else {
        console.log('📧 Magic link email sent successfully');
        res.json({
          message: 'Magic link sent to your email successfully! Please check your inbox.',
          emailSent: true,
          // Always include magic link for frontend to display (useful for testing)
          magicLink: magicLink,
          frontendUrl: magicLink,
          ...(emailResult.previewUrl && { previewUrl: emailResult.previewUrl })
        });
      }

    } catch (emailError) {
      console.error('📧 Failed to send magic link email:', emailError);

      // Fallback: return the link directly (for development)
      res.json({
        message: 'Magic link generated (email service unavailable)',
        emailSent: false,
        magicLink: magicLink,
        frontendUrl: magicLink,
        note: 'Email service is not configured. Use the link below to test.'
      });
    }

  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // Get user with role
    const userResult = await pool.query(`
      SELECT u.id, u.email, u.full_name, ur.role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = $1
    `, [req.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'employee'
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
