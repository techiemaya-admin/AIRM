/**
 * Projects Routes
 * API endpoints for project management
 */

import express from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../../../core/auth/authMiddleware.js';
import * as projectsController from '../controllers/projects.controller.js';

const router = express.Router();

/**
 * Get all projects
 * GET /api/projects
 */
router.get('/', authenticate, projectsController.getAllProjects);

/**
 * Get project by ID
 * GET /api/projects/:id
 */
router.get('/:id', authenticate, projectsController.getProjectById);

/**
 * Create project
 * POST /api/projects
 */
router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional(),
], projectsController.createProject);

/**
 * Update project
 * PUT /api/projects/:id
 */
router.put('/:id', authenticate, requireAdmin, [
  body('name').optional().trim().notEmpty(),
  body('description').optional(),
  body('visibility').optional().isIn(['private', 'internal', 'public']),
], projectsController.updateProject);

/**
 * Delete project
 * DELETE /api/projects/:id
 */
router.delete('/:id', authenticate, requireAdmin, projectsController.deleteProject);

/**
 * Get project members
 * GET /api/projects/:id/members
 */
router.get('/:id/members', authenticate, projectsController.getProjectMembers);

/**
 * Add project member
 * POST /api/projects/:id/members
 */
router.post('/:id/members', authenticate, requireAdmin, [
  body('user_id').isInt().withMessage('User ID must be an integer'),
  body('access_level').isInt().withMessage('Access level must be an integer'),
], projectsController.addProjectMember);

export default router;
