/**
 * Authentication Service
 * Business logic for authentication operations
 */

import jwt from 'jsonwebtoken';
import pool from '../../shared/database/connection.js';
import { sendMagicLinkEmail } from '../../shared/services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Send magic link to user
 */
export async function sendMagicLink(email) {
  // Check if user exists
  const userQuery = `
    SELECT u.id, u.email, u.full_name
    FROM users u
    WHERE LOWER(u.email) = LOWER($1)
  `;
  let userResult;
  try {
    userResult = await pool.query(userQuery, [email]);
  } catch (dbErr) {
    console.error('⚠️ Database query failed while looking up user:', dbErr.message);
    // In development, provide a fallback magic link so frontend can continue testing
    if (process.env.NODE_ENV === 'development') {
      const pseudoId = `dev-${Buffer.from(email).toString('hex').slice(0, 8)}`;
      const magicToken = jwt.sign(
        {
          userId: pseudoId,
          email: email,
          purpose: 'magic-login'
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Use FRONTEND_URL for local development (frontend runs on 5173)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const magicLink = `${frontendUrl}/auth/verify?token=${magicToken}`;

      return {
        emailSent: false,
        magicLink,
        previewUrl: null,
        note: 'Database unavailable - development fallback magic link generated'
      };
    }

    // In production propagate the error so controllers can return 500
    throw dbErr;
  }

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  // Generate magic link token
  const magicToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      purpose: 'magic-login'
    },
    JWT_SECRET,
    { expiresIn: '15m' } // Magic links expire in 15 minutes
  );

  // Create the magic link URL - FRONTEND_URL must point to the frontend app (not backend)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const magicLink = `${frontendUrl}/auth/verify?token=${magicToken}`;

  // Send email with magic link
  let emailResult;
  try {
    emailResult = await sendMagicLinkEmail(email, magicLink, user.full_name);
  } catch (emailError) {
    console.error('📧 Email service error:', emailError);
    // If email fails, still return the magic link for development/testing
    emailResult = { success: false, fallback: true };
  }

  return {
    emailSent: !emailResult.fallback && emailResult.success,
    magicLink: magicLink, // Always return magic link (frontend will handle display logic)
    previewUrl: emailResult.previewUrl
  };
}

/**
 * Verify magic link token and generate auth token
 */
export async function verifyMagicLink(token) {
  // Verify magic link token
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (jwtError) {
    throw new Error('Invalid or expired magic link');
  }

  if (decoded.purpose !== 'magic-login') {
    throw new Error('Invalid token purpose');
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
    throw new Error('User not found');
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

  return {
    token: authToken,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'employee'
    }
  };
}

/**
 * Get current user from token
 */
export async function getCurrentUser(userId) {
  const userQuery = `
    SELECT u.id, u.email, u.full_name, ur.role
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    WHERE u.id = $1
  `;
  const userResult = await pool.query(userQuery, [userId]);

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role || 'employee'
  };
}

