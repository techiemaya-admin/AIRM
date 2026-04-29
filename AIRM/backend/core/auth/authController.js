/**
 * Authentication Controller
 * Handles HTTP requests for authentication
 */

import { body, validationResult } from 'express-validator';
import * as authService from './authService.js';

/**
 * Send magic link
 * POST /api/auth/send-magic-link
 */
export async function sendMagicLink(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const result = await authService.sendMagicLink(email);
      
      if (result.emailSent) {
        console.log('📧 Magic link email sent successfully');
        res.json({
          message: 'Magic link sent to your email successfully! Please check your inbox.',
          emailSent: true,
          previewUrl: result.previewUrl
        });
      } else {
        // Email service not configured - return magic link for testing
        console.log('⚠️ Email service not configured, returning magic link directly');
        res.json({
          message: 'Magic link generated (email service unavailable)',
          emailSent: false,
          note: 'Email service is not configured. Please contact your administrator.'
        });
      }
    } catch (emailError) {
      if (emailError.message === 'User not found') {
        return res.status(404).json({ 
          error: 'User not found',
          message: 'No account found with this email address. Please contact your administrator.' 
        });
      }

      console.error('📧 Failed to send magic link email:', emailError);
      
      // Fallback: try to get magic link from service even on error
      try {
        const fallbackResult = await authService.sendMagicLink(email);
        res.json({
          message: 'Magic link generated (email service unavailable)',
          emailSent: false,
          note: 'Email service is not configured.'
        });
      } catch (fallbackError) {
        res.status(500).json({
          error: 'Failed to generate magic link',
          message: fallbackError.message || 'Internal server error'
        });
      }
    }
  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify magic link and login
 * POST /api/auth/verify-magic-link
 */
export async function verifyMagicLink(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    try {
      const result = await authService.verifyMagicLink(token);
      
      res.json({
        message: 'Login successful'
      });
    } catch (error) {
      if (error.message === 'Invalid or expired magic link' || 
          error.message === 'Invalid token purpose' ||
          error.message === 'User not found') {
        return res.status(400).json({ 
          error: error.message,
          message: error.message === 'Invalid or expired magic link' 
            ? 'The magic link has expired or is invalid'
            : error.message
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get current user
 * GET /api/auth/me
 */
export async function getCurrentUser(req, res) {
  try {
    const user = await authService.getCurrentUser(req.userId);
    res.json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

