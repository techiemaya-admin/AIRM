/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

import jwt from 'jsonwebtoken';
import pool from '../../shared/database/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Short-lived in-memory cache for user verification (2 seconds)
const userCache = new Map();
const CACHE_TTL = 2000;

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Check cache first
    const cached = userCache.get(token);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      req.user = cached.user;
      req.userId = cached.userId;
      req.isAdmin = cached.isAdmin;
      req.isHR = cached.isHR;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user and roles prioritizing erp schema first
    let userRow = null;

    // 1. Prioritize erp schema
    try {
      const q = `
        SELECT u.id, u.email, u.full_name, array_agg(ur.role) as roles
        FROM erp.users u
        LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
        WHERE u.id = $1
        GROUP BY u.id, u.email, u.full_name
      `;
      const r = await pool.query(q, [decoded.userId]);
      if (r.rows.length > 0) userRow = r.rows[0];
    } catch (e) {}

    // 2. Fallback to lad_stage schema
    if (!userRow) {
      try {
        const q = `
          SELECT u.id, u.email,
                 COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.email) AS full_name
          FROM lad_stage.users u WHERE u.id = $1
        `;
        const r = await pool.query(q, [decoded.userId]);
        if (r.rows.length > 0) userRow = { ...r.rows[0], roles: ['user'] };
      } catch (e) {}
    }

    // 3. Fallback to lad_dev schema
    if (!userRow) {
      try {
        const q = `
          SELECT u.id, u.email,
                 COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.email) AS full_name
          FROM lad_dev.users u WHERE u.id = $1
        `;
        const r = await pool.query(q, [decoded.userId]);
        if (r.rows.length > 0) userRow = { ...r.rows[0], roles: ['user'] };
      } catch (e) {}
    }

    if (!userRow) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }
    const roles = userRow.roles || [];
    const isAdmin = roles.includes('admin');
    const isHR = roles.includes('hr') || isAdmin;

    // Attach user to request
    req.user = { id: userRow.id, email: userRow.email, full_name: userRow.full_name };
    req.userId = userRow.id;
    req.isAdmin = isAdmin;
    req.isHR = isHR;

    // Update cache
    userCache.set(token, {
      user: req.user,
      userId: req.userId,
      isAdmin: req.isAdmin,
      isHR: req.isHR,
      timestamp: Date.now()
    });

    // Cleanup old cache entries occasionally
    if (userCache.size > 1000) {
      const now = Date.now();
      for (const [key, val] of userCache.entries()) {
        if (now - val.timestamp > CACHE_TTL) userCache.delete(key);
      }
    }

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

    if (req.isAdmin) {
      return next();
    }

    let isAdmin = false;
    try {
      const result = await pool.query(
        'SELECT role FROM erp.user_roles WHERE user_id = $1 AND role = $2',
        [req.userId, 'admin']
      );
      if (result.rows.length > 0) isAdmin = true;
    } catch (e) {
      console.error('ERP requireAdmin lookup error:', e.message);
    }

    if (!isAdmin) {
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

