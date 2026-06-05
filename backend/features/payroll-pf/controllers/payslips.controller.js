/**
 * Payslips Controller
 * Handle request/response for payslips
 * Call services
 * NO database queries, NO business logic
 */

import * as payslipService from '../services/payslips.service.js';

/**
 * Get payslips
 */
export async function getPayslips(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    const filters = {
      month: req.query.month ? parseInt(req.query.month) : undefined,
      year: req.query.year ? parseInt(req.query.year) : undefined,
      status: req.query.status,
      department: req.query.department,
      upcoming_only: req.query.upcoming_only === 'true' || req.query.upcoming_only === true,
    };

    // Employees can only see their own payslips
    if (!isAdmin && !isHR) {
      filters.user_id = userId;
    } else if (req.query.user_id) {
      filters.user_id = req.query.user_id;
    }

    const payslips = await payslipService.getPayslips(filters);
    res.json({ payslips });
  } catch (error) {
    console.error('[payroll-pf] Get payslips error:', error);
    res.status(500).json({
      error: 'Failed to get payslips',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get payslip by ID
 */
export async function getPayslipById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    const payslip = await payslipService.getPayslipById(id);

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    // Authorization: Employee can only view their own, HR/Admin can view all
    if (payslip.user_id !== userId && !isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this payslip'
      });
    }

    res.json({ payslip });
  } catch (error) {
    console.error('[payroll-pf] Get payslip error:', error);
    res.status(500).json({
      error: 'Failed to get payslip',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Create or update payslip
 */
export async function upsertPayslip(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can create/update payslips'
      });
    }

    // Validate UUID format for user_id and employee_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Ensure user_id is provided and is a valid UUID
    if (!req.body.user_id) {
      return res.status(400).json({
        error: 'Missing user ID',
        message: 'user_id is required and must be a valid UUID format'
      });
    }

    if (!uuidRegex.test(req.body.user_id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'user_id must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)'
      });
    }

    // Validate employee_id if provided - it must be a valid UUID or null/undefined
    if (req.body.employee_id && req.body.employee_id.trim() !== '') {
      if (!uuidRegex.test(req.body.employee_id)) {
        return res.status(400).json({
          error: 'Invalid employee ID',
          message: 'employee_id must be a valid UUID format or left empty. Employee numbers are not supported - use user_id instead.'
        });
      }
    }

    const adminStatus = isAdmin || isHR;
    console.log('[payroll-pf] Controller - isAdmin:', isAdmin, 'isHR:', isHR, 'adminStatus:', adminStatus, 'payslipId:', req.body.id);

    const payslipData = {
      ...req.body,
      created_by: userId,
      isAdmin: adminStatus // Pass admin status to allow editing locked payslips
    };

    // Ensure user_id is set - it's required
    if (!payslipData.user_id) {
      return res.status(400).json({
        error: 'Missing user ID',
        message: 'user_id is required and must be a valid UUID'
      });
    }

    const payslip = await payslipService.upsertPayslip(payslipData);

    res.json({
      message: 'Payslip saved successfully',
      payslip
    });
  } catch (error) {
    console.error('[payroll-pf] Upsert payslip error:', error);

    // Check if it's a UUID validation error from PostgreSQL
    if (error.message && error.message.includes('invalid input syntax for type uuid')) {
      return res.status(400).json({
        error: 'Invalid UUID format',
        message: 'One of the provided IDs (user_id or employee_id) is not a valid UUID format. Please ensure you are using the correct user UUID, not an employee number.'
      });
    }

    res.status(500).json({
      error: 'Failed to save payslip',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Release payslip
 */
export async function releasePayslip(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can release payslips'
      });
    }

    const payslip = await payslipService.releasePayslip(id, userId);

    res.json({
      message: 'Payslip released successfully',
      payslip
    });
  } catch (error) {
    console.error('[payroll-pf] Release payslip error:', error);
    res.status(500).json({
      error: 'Failed to release payslip',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Lock payslip
 */
export async function lockPayslip(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can lock payslips'
      });
    }

    const payslip = await payslipService.lockPayslip(id, userId);

    res.json({
      message: 'Payslip locked successfully',
      payslip
    });
  } catch (error) {
    console.error('[payroll-pf] Lock payslip error:', error);
    res.status(500).json({
      error: 'Failed to lock payslip',
      message: error.message || 'Internal server error'
    });
  }
}


/**
 * Generate payslips based on attendance
 */
export async function generatePayslips(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    // Only Admin/HR can generate
    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can generate payslips'
      });
    }

    const { month, year, user_id } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'month and year are required'
      });
    }

    const results = await payslipService.generatePayslipsFromAttendance(month, year, userId, user_id);

    res.json({
      message: `Generated ${results.length} payslips successfully`,
      payslips: results
    });
  } catch (error) {
    console.error('[payroll-pf] Generate payslips error:', error);
    res.status(500).json({
      error: 'Failed to generate payslips',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get all employees with salary and bank details
 */
export async function getEmployeesSalaryInfo(req, res) {
  try {
    const employees = await payslipService.getEmployeesSalaryInfo();
    res.json({ employees });
  } catch (error) {
    console.error('[payroll-pf] Get employees salary info error:', error);
    res.status(500).json({
      error: 'Failed to get employees salary information',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Generate payslip for specific employee from attendance
 */
export async function generatePayslipForEmployee(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can generate payslips'
      });
    }

    const { employee_id, month, year } = req.body;

    if (!employee_id || !month || !year) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'employee_id, month and year are required'
      });
    }

    const results = await payslipService.generatePayslipsFromAttendance(month, year, userId, employee_id);

    res.json({
      message: results.length > 0 ? 'Payslip generated successfully' : 'No payslip generated',
      payslips: results
    });
  } catch (error) {
    console.error('[payroll-pf] Generate payslip for employee error:', error);
    res.status(500).json({
      error: 'Failed to generate payslip',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Update employee salary
 */
export async function updateEmployeeSalary(req, res) {
  try {
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can update salary'
      });
    }

    const { userId: targetUserId } = req.params;
    const { pf_base_salary } = req.body;

    if (!pf_base_salary || isNaN(pf_base_salary)) {
      return res.status(400).json({
        error: 'Invalid salary',
        message: 'pf_base_salary must be a valid number'
      });
    }

    const result = await payslipService.updateEmployeeSalary(targetUserId, pf_base_salary, userId);

    res.json({
      message: 'Salary updated successfully',
      pf_details: result
    });
  } catch (error) {
    console.error('[payroll-pf] Update employee salary error:', error);
    res.status(500).json({
      error: 'Failed to update salary',
      message: error.message || 'Internal server error'
    });
  }
}
