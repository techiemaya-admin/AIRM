/**
 * Issues Routes
 * API endpoints for issue management
 */

import express from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../../../core/auth/authMiddleware.js';
import * as issuesController from '../controllers/issues.controller.js';

const router = express.Router();
router.use(authenticate);

/**
 * Get all issues
 * GET /api/issues
 */
router.get('/', issuesController.getAllIssues);

/**
 * Get single issue
 * GET /api/issues/:id
 */
router.get('/:id', issuesController.getIssueById);

/**
 * Create issue
 * POST /api/issues
 */
router.post('/', [
  body('title').trim().notEmpty(),
  body('description').optional(),
  body('status').optional().isIn(['open', 'in_progress', 'closed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  body('project_name').optional().trim(),
  body('estimate_hours').optional().isFloat({ min: 0 }),
  body('start_date').optional().isISO8601(),
  body('due_date').optional().isISO8601(),
], issuesController.createIssue);

/**
 * Update issue (Admin only)
 * PUT /api/issues/:id
 */
router.put('/:id', requireAdmin, issuesController.updateIssue);

/**
 * Add comment to issue
 * POST /api/issues/:id/comments
 */
router.post('/:id/comments', [
  body('comment').trim().notEmpty(),
], issuesController.addComment);

/**
 * Assign user(s) to issue (Admin only)
 * POST /api/issues/:id/assign
 */
router.post('/:id/assign', requireAdmin, issuesController.assignUsers);

/**
 * Unassign user from issue (Admin only)
 * DELETE /api/issues/:id/assign/:user_id
 */
router.delete('/:id/assign/:user_id', requireAdmin, issuesController.unassignUser);

/**
 * Add label to issue (Admin only)
 * POST /api/issues/:id/labels
 */
router.post('/:id/labels', requireAdmin, issuesController.addLabel);

/**
 * Remove label from issue (Admin only)
 * DELETE /api/issues/:id/labels/:label_id
 */
router.delete('/:id/labels/:label_id', requireAdmin, issuesController.removeLabel);

/**
 * Delete issue (Admin only)
 * DELETE /api/issues/:id
 */
router.delete('/:id', requireAdmin, issuesController.deleteIssue);

/**
 * Log manual time
 * POST /api/issues/:id/log-time
 */
router.post('/:id/log-time', [
  body('duration').isFloat({ min: 0 }),
  body('comment').optional().trim(),
], issuesController.logTime);

/**
 * Update activity (edit time)
 * PUT /api/issues/:id/activity/:activityId
 */
router.put('/:id/activity/:activityId', [
  body('duration').optional().isFloat({ min: 0 }),
  body('comment').optional().trim(),
], issuesController.updateActivity);

export default router;
