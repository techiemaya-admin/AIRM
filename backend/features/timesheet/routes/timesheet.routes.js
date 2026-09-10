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
  body('issue_id').optional({ nullable: true, checkFalsy: true }),
  body('project_name').optional({ nullable: true, checkFalsy: true }).trim(),
  body('latitude').optional({ nullable: true, checkFalsy: true }).isFloat(),
  body('longitude').optional({ nullable: true, checkFalsy: true }).isFloat(),
  body('location_address').optional({ nullable: true, checkFalsy: true }).trim(),
], timeClockController.clockIn);

/**
 * Clock out
 * POST /api/timesheets/clock-out
 */
router.post('/clock-out', [
  body('comment').optional({ nullable: true, checkFalsy: true }).trim(),
], timeClockController.clockOut);

/**
 * Pause time
 * POST /api/timesheets/pause
 */
router.post('/pause', [
  body('reason').optional({ nullable: true, checkFalsy: true }).trim(),
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
