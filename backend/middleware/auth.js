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
 */
export const authenticateUserOrService = async (req, res, next) => {
  const serviceToken = process.env.AIRM_SERVICE_TOKEN;
  const authHeader = req.headers.authorization || '';
  if (serviceToken && authHeader.startsWith('Bearer ')) {
    const given = Buffer.from(authHeader.substring(7));
    const expected = Buffer.from(serviceToken);
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
      req.user = { id: null, email: 'service@airm', full_name: 'Service', service: true };
      req.userId = null;
      return next();
    }
  }
  return authenticate(req, res, next);
};
