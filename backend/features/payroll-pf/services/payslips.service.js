/**
 * Payslips Service
 * Business logic for payslips
 * NO Express objects, NO database queries
 */

import * as payslipModel from '../models/payslips.pg.js';
import * as auditLogModel from '../models/payroll-audit-log.pg.js';
import * as leaveService from '../../leave-calendar/services/leave-calendar.service.js';
import * as pfModel from '../models/pf-details.pg.js';

console.log('🚀 Payslips Service Module Loaded');

/**
 * Transform raw payslip to DTO
 */
function transformPayslip(payslip) {
  if (!payslip) return null;

  return {
    id: payslip.id,
    user_id: payslip.user_id,
    employee_id: payslip.employee_id,
    email: payslip.email,
    full_name: payslip.full_name,
    month: payslip.month,
    year: payslip.year,
    base_salary: parseFloat(payslip.base_salary || 0),
    basic_pay: parseFloat(payslip.basic_pay || 0),
    hra: parseFloat(payslip.hra || 0),
    special_allowance: parseFloat(payslip.special_allowance || 0),
    bonus: parseFloat(payslip.bonus || 0),
    incentives: parseFloat(payslip.incentives || 0),
    other_earnings: parseFloat(payslip.other_earnings || 0),
    total_earnings: parseFloat(payslip.total_earnings || 0),
    pf_employee: parseFloat(payslip.pf_employee || 0),
    pf_employer: parseFloat(payslip.pf_employer || 0),
    esi_employee: parseFloat(payslip.esi_employee || 0),
    esi_employer: parseFloat(payslip.esi_employer || 0),
    professional_tax: parseFloat(payslip.professional_tax || 0),
    tds: parseFloat(payslip.tds || 0),
    other_deductions: parseFloat(payslip.other_deductions || 0),
    total_deductions: parseFloat(payslip.total_deductions || 0),
    net_pay: parseFloat(payslip.net_pay || 0),
    lop_days: parseFloat(payslip.lop_days || 0),
    lop_deduction: parseFloat(payslip.lop_deduction || 0),
    paid_days: parseFloat(payslip.paid_days || 0),
    attendance_summary: payslip.attendance_summary || {},
    payslip_id: payslip.payslip_id,
    document_url: payslip.document_url,
    status: payslip.status,
    is_locked: payslip.is_locked,
    released_at: payslip.released_at,
    released_by: payslip.released_by,
    released_by_name: payslip.released_by_name,
    company_name: payslip.company_name,
    company_address: payslip.company_address,
    issue_date: payslip.issue_date,
    created_at: payslip.created_at,
    updated_at: payslip.updated_at,
    created_by: payslip.created_by,
    created_by_name: payslip.created_by_name
  };
}

/**
 * Calculate payslip totals
 */
function calculatePayslipTotals(payslipData) {
  const earnings = (payslipData.basic_pay || 0) +
    (payslipData.hra || 0) +
    (payslipData.special_allowance || 0) +
    (payslipData.bonus || 0) +
    (payslipData.incentives || 0) +
    (payslipData.other_earnings || 0);

  const deductions = (payslipData.pf_employee || 0) +
    (payslipData.pf_employer || 0) +
    (payslipData.esi_employee || 0) +
    (payslipData.esi_employer || 0) +
    (payslipData.professional_tax || 0) +
    (payslipData.tds || 0) +
    (payslipData.other_deductions || 0);

  const netPay = earnings - deductions;

  return {
    total_earnings: earnings,
    total_deductions: deductions,
    net_pay: netPay
  };
}

/**
 * Get payslips
 */
export async function getPayslips(filters = {}) {
  try {
    const payslips = await payslipModel.getPayslips(filters);
    return payslips.map(transformPayslip).filter(p => p !== null);
  } catch (error) {
    console.error('[payroll-pf] Error in getPayslips service:', error);
    throw error;
  }
}

/**
 * Get payslip by ID
 */
export async function getPayslipById(payslipId) {
  try {
    const payslip = await payslipModel.getPayslipById(payslipId);
    return transformPayslip(payslip);
  } catch (error) {
    console.error('[payroll-pf] Error in getPayslipById service:', error);
    throw error;
  }
}

/**
 * Create or update payslip
 */
export async function upsertPayslip(payslipData) {
  try {
    // Calculate totals
    const totals = calculatePayslipTotals(payslipData);
    const finalData = {
      ...payslipData,
      ...totals
    };

    // Generate payslip ID if not provided
    if (!finalData.payslip_id) {
      const monthStr = String(finalData.month).padStart(2, '0');
      finalData.payslip_id = `PS-${finalData.employee_id || finalData.user_id}-${finalData.year}${monthStr}`;
    }

    // Allow admin to override locked payslips
    // Check both isAdmin from payslipData and finalData to ensure we catch it
    const isAdminUser = payslipData.isAdmin === true || payslipData.isAdmin === 'true' ||
      finalData.isAdmin === true || finalData.isAdmin === 'true';
    const hasId = !!(payslipData.id || finalData.id);
    if (isAdminUser && hasId) {
      finalData.allowAdminOverride = true;
      console.log('[payroll-pf] Admin override enabled for payslip:', payslipData.id || finalData.id, 'isAdmin:', payslipData.isAdmin);
    } else {
      console.log('[payroll-pf] Admin override NOT enabled. isAdmin:', payslipData.isAdmin, 'hasId:', hasId, 'payslipData.id:', payslipData.id, 'finalData.id:', finalData.id);
    }

    const payslip = await payslipModel.upsertPayslip(finalData);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: finalData.user_id,
      action: payslipData.id ? 'payslip_updated' : 'payslip_created',
      entity_type: 'payslip',
      entity_id: payslip.id,
      performed_by: finalData.created_by,
      details: { month: finalData.month, year: finalData.year }
    });

    return transformPayslip(payslip);
  } catch (error) {
    console.error('[payroll-pf] Error in upsertPayslip service:', error);
    throw error;
  }
}

/**
 * Release payslip
 */
export async function releasePayslip(payslipId, releasedBy) {
  try {
    const payslip = await payslipModel.updatePayslipStatus(payslipId, 'released', releasedBy);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: payslip.user_id,
      action: 'payslip_released',
      entity_type: 'payslip',
      entity_id: payslipId,
      performed_by: releasedBy
    });

    return transformPayslip(payslip);
  } catch (error) {
    console.error('[payroll-pf] Error in releasePayslip service:', error);
    throw error;
  }
}

/**
 * Lock payslip
 */
export async function lockPayslip(payslipId, lockedBy) {
  try {
    const payslip = await payslipModel.updatePayslipStatus(payslipId, 'locked', null);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: payslip.user_id,
      action: 'payslip_locked',
      entity_type: 'payslip',
      entity_id: payslipId,
      performed_by: lockedBy
    });

    return transformPayslip(payslip);
  } catch (error) {
    console.error('[payroll-pf] Error in lockPayslip service:', error);
    throw error;
  }
}

/**
 * Generate payslips based on attendance
 */
export async function generatePayslipsFromAttendance(month, year, generatedBy, targetUserId = null) {
  console.log('!!! ENTRY generatePayslipsFromAttendance !!!');
  try {
    console.log(`[payroll] Calling generatePayslipsFromAttendance for ${month}/${year}, target: ${targetUserId}`);
    console.log(`[payroll] Generating payslips for ${month}/${year}`);

    // 1. Get Attendance Report (aggregated by SQL logic in leave-calendar, but returns daily rows)
    const report = await leaveService.getMonthlyAttendanceReport(month, year);
    console.log(`[payroll] Report fetched: ${report?.length || 0} rows`);

    if (!report || report.length === 0) {
      console.log('[payroll] Report is empty');
      // Return empty result, controller will handle message
      return [];
    }

    // 2. Aggregate per user
    const userStats = {};
    const daysInMonth = new Date(year, month, 0).getDate();
    console.log(`[payroll] Days in month: ${daysInMonth}`);

    let logOnce = true;
    report.forEach(record => {
      if (logOnce) {
        console.log(`[payroll] Sample record user_id: ${record.user_id}, type: ${typeof record.user_id}`);
        logOnce = false;
      }
      if (!userStats[record.user_id]) {
        userStats[record.user_id] = {
          user_id: record.user_id,
          full_name: record.full_name,
          email: record.email,
          paid_days: 0,
          lop_days: 0,
          leave_days_taken: 0, // Track leave days separately for LOP calculation
          present_days: 0,
          half_days: 0,
          absent_days: 0,
          week_off_days: 0
        };
      }

      const stats = userStats[record.user_id];
      const dateObj = new Date(record.date);
      const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = day === 0 || day === 6;

      if (record.status === 'present') {
        stats.paid_days += 1;
        stats.present_days += 1;
      } else if (record.status === 'half_day') {
        stats.paid_days += 0.5;
        stats.lop_days += 0.5;
        stats.half_days += 1;
      } else if (record.status === 'on_leave') {
        // Track all leave days for LOP calculation
        stats.leave_days_taken += 1;
        stats.paid_days += 1; // Initially count as paid, will adjust for LOP later
      } else if (record.status === 'absent') {
        stats.lop_days += 1;
        stats.absent_days += 1;
      } else if (record.status === 'week_off') {
        stats.paid_days += 1;
        stats.week_off_days += 1;
      } else {
        // No status (NULL)
        if (isWeekend) {
          stats.paid_days += 1; // Assume paid weekend
          stats.week_off_days += 1;
        } else {
          // If it's a weekday and no record, treat as absent for generation purposes
          stats.lop_days += 1;
          stats.absent_days += 1;
        }
      }
    });

    const results = [];

    // Filter users if targetUserId is specific
    const usersToProcess = targetUserId ? [targetUserId] : Object.keys(userStats);
    console.log(`[payroll] Users to process: ${usersToProcess.length}, Target: ${targetUserId || 'All'}`);
    console.log(`[payroll] userStats keys: ${Object.keys(userStats).length}`);

    // 3. Generate Payslip for each user
    for (const userId of usersToProcess) {
      if (!userStats[userId]) {
        console.warn(`[payroll] No attendance data found for target user ${userId} in ${month}/${year}. userId in userStats: ${userId in userStats}`);
        continue;
      }
      const stats = userStats[userId];

      // Fetch Leave Balances for LOP calculation
      const leaveBalances = await leaveService.getLeaveBalances(userId);

      // Calculate monthly leave entitlement: 15 days/year = 1.25 days/month
      const monthlyLeaveEntitlement = 1.25;

      // Find Privilege Leave balance (this is the paid leave)
      const privilegeLeave = leaveBalances.find(lb =>
        lb.leave_type === 'Privilege Leave' || lb.leave_type === 'Paid Leave'
      );

      // Calculate LOP days: leave taken in excess of available balance
      let lopDaysFromLeave = 0;
      if (stats.leave_days_taken > 0) {
        const availableLeave = privilegeLeave ? parseFloat(privilegeLeave.balance || 0) : monthlyLeaveEntitlement;

        // If leave taken exceeds available balance + monthly entitlement, mark as LOP
        if (stats.leave_days_taken > monthlyLeaveEntitlement) {
          lopDaysFromLeave = stats.leave_days_taken - Math.max(monthlyLeaveEntitlement, availableLeave);
          if (lopDaysFromLeave > 0) {
            // Adjust paid_days and lop_days
            stats.paid_days -= lopDaysFromLeave;
            stats.lop_days += lopDaysFromLeave;
          }
        }
      }

      const totalDays = stats.paid_days + stats.lop_days;

      // Fetch Base Salary (from PF details or use default)
      const pfDetails = await pfModel.getPfDetails(userId);
      const baseSalary = pfDetails?.pf_base_salary ? parseFloat(pfDetails.pf_base_salary) : 15000; // Default 15k if missing

      // Standard Structure (Based on user request: Basic 5k, HRA 4.5k, Other 0.5k for 10k Gross)
      const stdGross = baseSalary;
      const stdBasic = baseSalary * 0.50;
      const stdHRA = baseSalary * 0.45;
      const stdOther = baseSalary * 0.05;

      // Proration Ratio based on paid days
      const ratio = stats.paid_days / daysInMonth;

      // Actual Earnings
      const actBasic = Math.round(stdBasic * ratio);
      const actHRA = Math.round(stdHRA * ratio);
      const actOther = Math.round(stdOther * ratio);
      const actGross = actBasic + actHRA + actOther;

      // Deductions (only Professional Tax - LOP is already accounted for in prorated earnings)
      const pt = actGross > 15000 ? 200 : 0;

      // LOP amount (informational only - already reflected in reduced earnings via proration)
      const lopDeduction = Math.round((stdGross / daysInMonth) * stats.lop_days);

      // Only PT is an actual deduction (LOP is NOT deducted again since earnings are prorated)
      const totalDeductions = pt;

      const netPay = actGross - totalDeductions;

      // Create Payslip Data
      const payslipData = {
        user_id: userId,
        month: parseInt(month),
        year: parseInt(year),
        base_salary: baseSalary, // Store base salary for editing
        basic_pay: actBasic,
        hra: actHRA,
        special_allowance: 0,
        bonus: 0,
        incentives: 0,
        other_earnings: actOther,
        total_earnings: actGross,
        pf_employee: 0,
        pf_employer: 0,
        esi_employee: 0,
        esi_employer: 0,
        professional_tax: pt,
        tds: 0,
        other_deductions: 0,
        lop_days: stats.lop_days, // Track LOP days (informational)
        lop_deduction: lopDeduction, // Track LOP amount (informational - already in prorated earnings)
        paid_days: stats.paid_days, // Track paid days
        total_deductions: totalDeductions,
        net_pay: netPay,
        status: 'draft',
        created_by: generatedBy,
        isAdmin: true,
        // Additional metadata for transparency
        attendance_summary: {
          present: stats.present_days,
          half_day: stats.half_days,
          absent: stats.absent_days,
          leave: stats.leave_days_taken,
          week_off: stats.week_off_days,
          lop_from_leave: lopDaysFromLeave,
          total_lop: stats.lop_days
        }
      };

      try {
        const payslip = await upsertPayslip(payslipData);
        results.push(payslip);
      } catch (err) {
        console.error(`Failed to generate payslip for user ${userId}:`, err);
      }
    }

    return results;

  } catch (error) {
    console.error('[payroll-pf] Error in generatePayslipsFromAttendance:', error);
    throw error;
  }
}

/**
 * Get all employees with salary and bank details
 * Uses existing profiles and pf_details tables
 */
export async function getEmployeesSalaryInfo() {
  try {
    const employees = await payslipModel.getEmployeesSalaryInfo();

    // Transform to include calculated salary breakdown
    return employees.map(emp => ({
      ...emp,
      gross_salary: emp.pf_base_salary || 0,
      basic_salary: Math.round((emp.pf_base_salary || 0) * 0.50),
      hra: Math.round((emp.pf_base_salary || 0) * 0.45),
      other_allowances: Math.round((emp.pf_base_salary || 0) * 0.05),
    }));
  } catch (error) {
    console.error('[payroll-pf] Error in getEmployeesSalaryInfo:', error);
    throw error;
  }
}

/**
 * Update employee salary
 * Updates pf_base_salary in pf_details table
 */
export async function updateEmployeeSalary(userId, pfBaseSalary, updatedBy) {
  try {
    const pfDetails = await pfModel.upsertPfDetails({
      user_id: userId,
      pf_base_salary: pfBaseSalary,
      updated_by: updatedBy
    }, updatedBy);

    // Log audit
    await auditLogModel.addPayrollAuditLog({
      user_id: userId,
      action: 'update_salary',
      entity_type: 'pf_details',
      entity_id: pfDetails.id,
      details: { old_salary: pfDetails.pf_base_salary, new_salary: pfBaseSalary },
      performed_by: updatedBy
    });

    return pfDetails;
  } catch (error) {
    console.error('[payroll-pf] Error in updateEmployeeSalary:', error);
    throw error;
  }
}
