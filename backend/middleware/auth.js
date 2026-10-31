/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../shared/database/connection.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No token provided' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, full_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found' 
      });
    }

    // Attach user to request
    req.user = result.rows[0];
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is malformed' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please login again' 
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error' 
    });
  }
};

/**
 * Check if user is admin
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    // Check if user is admin
    const result = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1 AND role = $2',
      [req.userId, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin access required' 
      });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error' 
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const result = await pool.query(
        'SELECT id, email, full_name FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
        req.userId = decoded.userId;
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};


/**
 * A signed-in user, or a trusted service presenting AIRM_SERVICE_TOKEN as its
 * bearer token (Mr LAD Debug Assist reads the board and writes task progress
 * this way — a user JWT would expire under it). The service token is compared
 * in constant time and only accepted when AIRM_SERVICE_TOKEN is set.
 *
 * ACTING USER. Mr LAD shows this board to its own signed-in people. With the
 * service token it may name the person it acts for in X-Acting-User-Email;
 * the request then runs AS that Pulse user (req.user is their row, no
 * `service` flag), so comments, reporters and notifications name them rather
 * than "Service". An email that matches no Pulse user, or several, is refused
 * (403): a write must never be attributed to a guess. Only the service token
 * can assert an identity this way; a user JWT ignores the header.
 */
export const authenticateUserOrService = async (req, res, next) => {
  const serviceToken = process.env.AIRM_SERVICE_TOKEN;
  const authHeader = req.headers.authorization || '';
  if (serviceToken && authHeader.startsWith('Bearer ')) {
    const given = Buffer.from(authHeader.substring(7));
    const expected = Buffer.from(serviceToken);
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
      const acting = String(req.headers['x-acting-user-email'] || '').trim().toLowerCase();
      if (acting) {
        try {
          const result = await pool.query(
            'SELECT id, email, full_name FROM users WHERE LOWER(email) = $1 LIMIT 2',
            [acting]
          );
          if (result.rows.length !== 1) {
            return res.status(403).json({ success: false, message: 'No Pulse user for the acting email' });
          }
          req.user = { ...result.rows[0], viaService: true };
          req.userId = result.rows[0].id;
          return next();
        } catch (error) {
          return res.status(503).json({ success: false, message: 'Could not resolve the acting user' });
        }
      }
      req.user = { id: null, email: 'service@airm', full_name: 'Service', service: true };
      req.userId = null;
      return next();
    }
  }
  return authenticate(req, res, next);
};

/** The service token itself, with no acting user: for service-only lookups. */
export const requireService = (req, res, next) => authenticateUserOrService(req, res, () => {
  if (req.user?.service) return next();
  return res.status(403).json({ success: false, message: 'Service token required' });
});

/** A real person: a signed-in user, or the service acting for one. */
export const requirePerson = (req, res, next) => authenticateUserOrService(req, res, () => {
  if (req.user?.id) return next();
  return res.status(403).json({ success: false, message: 'Act as a Pulse user (X-Acting-User-Email) for this action' });
});
