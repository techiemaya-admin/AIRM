/**
 * Timesheet Routes
 * API endpoints for timesheet management
 */

import express from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../../../core/auth/authMiddleware.js';
import * as timeClockController from '../controllers/time-clock.controller.js';
import * as timesheetController from '../controllers/timesheet.controller.js';

const router = express.Router();
router.use(authenticate);

/**
 * Clock in
 * POST /api/timesheets/clock-in
 */
router.post('/clock-in', [
  body('issue_id').optional().isInt(),
  body('project_name').optional().trim(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('location_address').optional().trim(),
], timeClockController.clockIn);

/**
 * Clock out
 * POST /api/timesheets/clock-out
 */
router.post('/clock-out', [
  body('comment').optional().trim(),
], timeClockController.clockOut);

/**
 * Pause time
 * POST /api/timesheets/pause
 */
router.post('/pause', [
  body('reason').optional().trim(),
], timeClockController.pause);

/**
 * Resume time
 * POST /api/timesheets/resume
 */
router.post('/resume', timeClockController.resume);

/**
 * Get current time entry
 * GET /api/timesheets/current
 */
router.get('/current', timeClockController.getCurrent);

/**
 * Get time entries
 * GET /api/timesheets/entries
 */
router.get('/entries', timeClockController.getEntries);

/**
 * Get all active entries (Admin only)
 * GET /api/timesheets/active
 */
router.get('/active', requireAdmin, timeClockController.getActive);

/**
 * Get timesheets
 * GET /api/timesheets
 */
router.get('/', timesheetController.getTimesheets);

/**
 * Save timesheet
 * POST /api/timesheets
 */
router.post('/', [
  body('week_start').isISO8601(),
  body('entries').isArray(),
], timesheetController.saveTimesheet);

/**
 * Get timesheet by ID
 * GET /api/timesheets/:id
 */
router.get('/:id', timesheetController.getTimesheetById);

export default router;
