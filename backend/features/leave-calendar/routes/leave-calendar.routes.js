/**
 * Leave Calendar Routes
 * API endpoints for leave management
 */

import express from 'express';
import { body, query } from 'express-validator';
import { authenticate, requireAdmin } from '../../../core/auth/authMiddleware.js';
import * as leaveController from '../controllers/leave-calendar.controller.js';

const router = express.Router();
router.use(authenticate);

/**
 * Get leave requests
 * GET /api/leave-calendar
 */
router.get('/', leaveController.getAllLeaveRequests);

/**
 * Create leave request
 * POST /api/leave-calendar
 */
router.post('/', [
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
  body('leave_type').isIn(['Casual Leave', 'Privilege Leave', 'Sick Leave', 'Unpaid Leave', 'Compensatory Off']),
  body('session').optional().isIn(['Full Day', 'First Half', 'Second Half']),
  body('reason').optional().trim(),
], leaveController.createLeaveRequest);

/**
 * Update leave request status (Admin only)
 * PUT /api/leave-calendar/:id/status
 */
router.put('/:id/status', requireAdmin, [
  body('status').isIn(['approved', 'rejected']),
  body('admin_notes').optional().trim(),
], leaveController.updateLeaveRequestStatus);

/**
 * Get leave balances
 * GET /api/leave-calendar/balances
 */
router.get('/balances', leaveController.getLeaveBalances);

/**
 * Update leave balance (Admin only)
 * PUT /api/leave-calendar/balances
 */
router.put('/balances', requireAdmin, [
  body('user_id').isUUID(),
  body('leave_type').isIn(['Casual Leave', 'Privilege Leave', 'Sick Leave', 'Unpaid Leave', 'Compensatory Off']),
  body('financial_year').isString().notEmpty(),
  body('opening_balance').isNumeric(),
  body('availed').isNumeric(),
  body('lapse').isNumeric(),
  body('balance').isNumeric(),
  body('lapse_date').optional().isISO8601(),
], leaveController.updateLeaveBalance);

/**
 * Get leave balance for a specific user (Admin only)
 * GET /api/leave-calendar/balances/:userId
 */
router.get('/balances/:userId', requireAdmin, leaveController.getLeaveBalanceForUser);

/**
 * Get shift roster
 * GET /api/leave-calendar/shifts
 */
router.get('/shifts', [
  query('start_date').isISO8601(),
  query('end_date').isISO8601(),
], leaveController.getShiftRoster);

/**
 * Update shift roster
 * POST /api/leave-calendar/shifts
 */
router.post('/shifts', [
  body('date').isISO8601(),
  body('shift_type').isIn(['General Shift', 'Second Shift', 'Morning', 'Afternoon', 'Night', 'Rotational']),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
], leaveController.updateShiftRoster);

/**
 * Get attendance records
 * GET /api/leave-calendar/attendance
 */
router.get('/attendance', [
  query('start_date').isISO8601(),
  query('end_date').isISO8601(),
], leaveController.getAttendance);

/**
 * Update attendance record
 * POST /api/leave-calendar/attendance
 */
router.post('/attendance', [
  body('date').isISO8601(),
  body('shift_id').optional().isUUID(),
  body('clock_in').optional().isISO8601(),
  body('clock_out').optional().isISO8601(),
  body('total_hours').optional().isNumeric(),
  body('status').optional().isIn(['present', 'absent', 'half_day', 'on_leave']),
], leaveController.updateAttendanceRecord);

/**
 * Get leave history for the current user
 * GET /api/leave-calendar/history
 */
router.get('/history', leaveController.getLeaveHistory);

/**
 * Get monthly attendance report (Admin only)
 * GET /api/leave-calendar/reports/monthly-attendance
 */
router.get('/reports/monthly-attendance', requireAdmin, [
    query('month').isInt({ min: 1, max: 12 }),
    query('year').isInt(),
], leaveController.getMonthlyAttendanceReport);

/**
 * Get shift-wise attendance analysis (Admin only)
 * GET /api/leave-calendar/reports/shift-analysis
 */
router.get('/reports/shift-analysis', requireAdmin, [
    query('start_date').isISO8601(),
    query('end_date').isISO8601(),
], leaveController.getShiftWiseAttendanceAnalysis);

export default router;
