/**
 * Users Routes
 * API endpoints for user management
 */

import express from 'express';
import { authenticate, requireAdmin } from '../../../core/auth/authMiddleware.js';
import * as usersController from '../controllers/users.controller.js';

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
 * Create a new user (Admin only)
 * POST /api/users
 */
router.post('/', requireAdmin, usersController.createUser);

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

/**
 * Delete user (Admin only)
 * DELETE /api/users/:id
 */
router.delete('/:id', requireAdmin, usersController.deleteUser);

export default router;

