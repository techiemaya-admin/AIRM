/**
 * Users Routes
 * API endpoints for user management
 */

import express from 'express';
import { authenticate, requireAdmin } from '../auth/authMiddleware.js';
import * as usersController from './usersController.js';

const router = express.Router();
router.use(authenticate);

/**
 * Get all users (Admin only)
 * GET /api/users
 */
router.get('/', requireAdmin, usersController.getAllUsers);

/**
 * Get all users with roles
 * GET /api/users/with-roles
 */
router.get('/with-roles', usersController.getAllUsersWithRoles);

/**
 * Get single user
 * GET /api/users/:id
 */
router.get('/:id', usersController.getUserById);

/**
 * Toggle user role (Admin only)
 * PUT /api/users/:id/role
 */
router.put('/:id/role', requireAdmin, usersController.updateUserRole);

export default router;

