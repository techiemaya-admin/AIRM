/**
 * Leave Calendar Controller
 * Handles HTTP requests for leave management
 */

import { body, validationResult } from 'express-validator';
import * as leaveService from '../services/leave-calendar.service.js';

/**
 * Get leave requests
 * GET /api/leave-calendar
 */
export async function getAllLeaveRequests(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;

    const leaveRequests = await leaveService.getAllLeaveRequests(userId, isAdmin);
    res.json({ leave_requests: leaveRequests });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ 
      error: 'Failed to get leave requests',
      message: error.message || 'Internal server error' 
    });
  }
}

/**
 * Create leave request
 * POST /api/leave-calendar
 */
export async function createLeaveRequest(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId;
    const leaveData = req.body;

    try {
      const leaveRequest = await leaveService.createLeaveRequest(userId, leaveData);
      res.status(201).json({
        message: 'Leave request created successfully',
        leave_request: leaveRequest,
      });
    } catch (error) {
      if (error.message === 'End date must be after start date') {
        return res.status(400).json({ 
          error: 'Invalid date range',
          message: error.message
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ 
      error: 'Failed to create leave request',
      message: 'Internal server error' 
    });
  }
}

/**
 * Update leave request status
 * PUT /api/leave-calendar/:id/status
 */
export async function updateLeaveRequestStatus(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const userId = req.userId;

    try {
      const leaveRequest = await leaveService.updateLeaveRequestStatus(id, status, userId, admin_notes);
      res.json({
        message: 'Leave request updated successfully',
        leave_request: leaveRequest,
      });
    } catch (error) {
      if (error.message === 'Leave request not found') {
        return res.status(404).json({ error: 'Leave request not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({ 
      error: 'Failed to update leave request',
      message: 'Internal server error' 
    });
  }
}

/**
 * Get leave balances for the current user
 * GET /api/leave-calendar/balances
 */
export async function getLeaveBalances(req, res) {
  try {
    const userId = req.userId;
    const balances = await leaveService.getLeaveBalances(userId);
    res.json({ leave_balances: balances });
  } catch (error) {
    console.error('Get leave balances error:', error);
    res.status(500).json({ 
      error: 'Failed to get leave balances',
      message: error.message || 'Internal server error' 
    });
  }
}

/**
 * Get leave balance for a specific user (Admin only)
 * GET /api/leave-calendar/balances/:userId
 */
export async function getLeaveBalanceForUser(req, res) {
    try {
        const { userId } = req.params;
        const balances = await leaveService.getLeaveBalances(userId);
        res.json({ leave_balances: balances });
    } catch (error) {
        console.error('Get leave balance for user error:', error);
        res.status(500).json({
            error: 'Failed to get leave balance for user',
            message: error.message || 'Internal server error'
        });
    }
}

/**
 * Update leave balance (Admin only)
 * PUT /api/leave-calendar/balances
 */
export async function updateLeaveBalance(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const balanceData = req.body;
    const updatedBalance = await leaveService.updateLeaveBalance(balanceData);
    res.json({
      message: 'Leave balance updated successfully',
      leave_balance: updatedBalance,
    });
  } catch (error) {
    console.error('Update leave balance error:', error);
    res.status(500).json({ 
      error: 'Failed to update leave balance',
      message: error.message || 'Internal server error' 
    });
  }
}

/**
 * Get shift roster
 * GET /api/leave-calendar/shifts
 */
export async function getShiftRoster(req, res) {
  try {
    const { start_date, end_date } = req.query;
    const roster = await leaveService.getShiftRoster(start_date, end_date);
    res.json({ shift_roster: roster });
  } catch (error) {
    console.error('Get shift roster error:', error);
    res.status(500).json({ 
      error: 'Failed to get shift roster',
      message: error.message || 'Internal server error' 
    });
  }
}

/**
 * Update shift roster
 * POST /api/leave-calendar/shifts
 */
export async function updateShiftRoster(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const shiftData = req.body;
    const updatedShift = await leaveService.updateShiftRoster(shiftData);
    res.json({
      message: 'Shift roster updated successfully',
      shift: updatedShift,
    });
  } catch (error) {
    console.error('Update shift roster error:', error);
    res.status(500).json({ 
      error: 'Failed to update shift roster',
      message: error.message || 'Internal server error' 
    });
  }
}

/**
 * Get attendance records
 * GET /api/leave-calendar/attendance
 */
export async function getAttendance(req, res) {
  try {
    const { start_date, end_date } = req.query;
    const attendance = await leaveService.getAttendance(start_date, end_date);
    res.json({ attendance_records: attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ 
      error: 'Failed to get attendance records',
      message: error.message || 'Internal server error' 
    });
  }
}

/**
 * Update attendance record
 * POST /api/leave-calendar/attendance
 */
export async function updateAttendanceRecord(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const attendanceData = req.body;
        const updatedRecord = await leaveService.updateAttendanceRecord(attendanceData);
        res.json({
            message: 'Attendance record updated successfully',
            attendance_record: updatedRecord,
        });
    } catch (error) {
        console.error('Update attendance record error:', error);
        res.status(500).json({
            error: 'Failed to update attendance record',
            message: error.message || 'Internal server error'
        });
    }
}

/**
 * Get leave history for the current user
 * GET /api/leave-calendar/history
 */
export async function getLeaveHistory(req, res) {
    try {
        const userId = req.userId;
        const history = await leaveService.getLeaveHistory(userId);
        res.json({ leave_history: history });
    } catch (error) {
        console.error('Get leave history error:', error);
        res.status(500).json({
            error: 'Failed to get leave history',
            message: error.message || 'Internal server error'
        });
    }
}

/**
 * Get monthly attendance report (Admin only)
 * GET /api/leave-calendar/reports/monthly-attendance
 */
export async function getMonthlyAttendanceReport(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { month, year } = req.query;
        const report = await leaveService.getMonthlyAttendanceReport(month, year);
        res.json({ monthly_attendance_report: report });
    } catch (error) {
        console.error('Get monthly attendance report error:', error);
        res.status(500).json({
            error: 'Failed to get monthly attendance report',
            message: error.message || 'Internal server error'
        });
    }
}

/**
 * Get shift-wise attendance analysis (Admin only)
 * GET /api/leave-calendar/reports/shift-analysis
 */
export async function getShiftWiseAttendanceAnalysis(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { start_date, end_date } = req.query;
        const analysis = await leaveService.getShiftWiseAttendanceAnalysis(start_date, end_date);
        res.json({ shift_wise_attendance_analysis: analysis });
    } catch (error) {
        console.error('Get shift-wise attendance analysis error:', error);
        res.status(500).json({
            error: 'Failed to get shift-wise attendance analysis',
            message: error.message || 'Internal server error'
        });
    }
}

