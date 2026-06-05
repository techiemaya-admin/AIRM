/**
 * Authentication Routes
 * API endpoints for authentication
 */

import express from 'express';
import { body } from 'express-validator';
import * as authController from './authController.js';
import { authenticate } from './authMiddleware.js';

const router = express.Router();

/**
 * Send magic link
 * POST /api/auth/send-magic-link
 */
router.post('/send-magic-link', [
  body('email').isEmail().normalizeEmail(),
], authController.sendMagicLink);

/**
 * Verify magic link and login
 * POST /api/auth/verify-magic-link
 */
router.post('/verify-magic-link', [
  body('token').notEmpty(),
], authController.verifyMagicLink);

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, authController.getCurrentUser);

export default router;

