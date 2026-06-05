/**
 * Leave Calendar Service
 * Business logic for leave requests
 */

import * as leaveModel from '../models/leave-calendar.pg.js';

/**
 * Get all leave requests
 */
export async function getAllLeaveRequests(userId, isAdmin) {
  return await leaveModel.getAllLeaveRequests(userId, isAdmin);
}

/**
 * Create leave request
 */
export async function createLeaveRequest(userId, leaveData) {
  const { start_date, end_date, leave_type, reason, session } = leaveData;

  // Validate date range
  if (new Date(end_date) < new Date(start_date)) {
    throw new Error('End date must be after start date');
  }

  // Enforce validation for Paid Leave
  const type = leave_type.toLowerCase();

  if (type === 'paid leave' || type === 'pl' || type === 'privilege leave') {
    const balances = await getLeaveBalances(userId);
    const plEntry = balances.find(b => {
      const t = b.leave_type.toLowerCase();
      return t === 'paid leave' || t === 'pl' || t === 'privilege leave';
    });

    // Calculate requested days
    let requestedDays = 1;

    if (session === 'First Half' || session === 'Second Half') {
      requestedDays = 0.5;
    } else {
      const start = new Date(start_date);
      const end = new Date(end_date);
      const diffTime = Math.abs(end - start);
      requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const currentBalance = plEntry ? Number(plEntry.balance) : 0;

    if (requestedDays > currentBalance) {
      throw new Error(`Insufficient leave balance. Available: ${currentBalance.toFixed(2)}, Requested: ${requestedDays}`);
    }
  }

  return await leaveModel.createLeaveRequest(userId, start_date, end_date, leave_type, reason, session);
}

/**
 * Update leave request status
 */
export async function updateLeaveRequestStatus(id, status, reviewedBy, adminNotes) {
  const result = await leaveModel.updateLeaveRequestStatus(id, status, reviewedBy, adminNotes);

  if (!result) {
    throw new Error('Leave request not found');
  }

  return result;
}

// Helper to get Financial Year bounds
function getFinancialYearBounds(date) {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  // If Jan-Mar (0-2), FY started previous April
  if (month < 3) {
    return {
      start: new Date(year - 1, 3, 1), // April 1st prev year
      end: new Date(year, 2, 31),      // March 31st current year
      fyString: `${year - 1}-${year}`
    };
  } else {
    // If Apr-Dec (3-11), FY started current April
    return {
      start: new Date(year, 3, 1),     // April 1st current year
      end: new Date(year + 1, 2, 31),  // March 31st next year
      fyString: `${year}-${year + 1}`
    };
  }
}

/**
 * Get leave balances for a user
 */
export async function getLeaveBalances(userId) {
  // 1. Get raw balances
  let balances = await leaveModel.getLeaveBalances(userId);

  // 2. Get Join Date for accrual calculation
  const joinDateRaw = await leaveModel.getUserJoinDate(userId);
  if (!joinDateRaw) return balances;

  const joinDate = new Date(joinDateRaw);
  const now = new Date();

  // Determine if in probation (90 days)
  const probationDays = 90;
  const daysSinceJoin = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
  const isProbation = daysSinceJoin < probationDays;

  // 3. Determine Current Financial Year
  const { start: fyStart, end: fyEnd, fyString } = getFinancialYearBounds(now);

  // 4. Calculate Accrual
  // Accrual starts from whichever is later: FY Start or Join Date
  let accrualStartDate = joinDate > fyStart ? joinDate : fyStart;

  // If viewing in future (unlikely) or past, restrict end date to 'now' or 'fyEnd'
  let accrualEndDate = now > fyEnd ? fyEnd : now;

  let accrued = 0;
  if (accrualStartDate <= accrualEndDate) {
    // Calculate months touched in current FY
    let monthsCount = 0;
    // Align dates to month start to safely count months
    let d = new Date(accrualStartDate.getFullYear(), accrualStartDate.getMonth(), 1);
    const endLimit = new Date(accrualEndDate.getFullYear(), accrualEndDate.getMonth(), 1);

    // Safety break
    let limitLoops = 0;
    while (d <= endLimit && limitLoops < 100) {
      monthsCount++;
      d.setMonth(d.getMonth() + 1);
      limitLoops++;
    }

    // Rule: 1.25 per month. 
    accrued = monthsCount * 1.25;
  }

  const yearlyLimit = 15;
  accrued = Math.min(yearlyLimit, accrued);

  // 5. Update/Create 'Paid Leave' (PL) balance entry
  let plEntryIndex = balances.findIndex(b => {
    const t = (b.leave_type || '').toLowerCase();
    return (t === 'paid leave' || t === 'pl' || t === 'privilege leave') &&
      String(b.financial_year) === fyString;
  });

  if (plEntryIndex >= 0) {
    const entry = balances[plEntryIndex];
    const opening = Number(entry.opening_balance) || 0;
    const availed = Number(entry.availed) || 0;
    const lapse = Number(entry.lapse) || 0;

    // Balance = Opening + Accrued - Availed - Lapse
    const newBalance = opening + accrued - availed - lapse;

    // Only update DB if balance changed significantly
    if (Math.abs(newBalance - Number(entry.balance)) > 0.01) {
      const updatedEntry = {
        ...entry,
        balance: newBalance,
        is_probation: isProbation
      };

      await leaveModel.updateLeaveBalance(updatedEntry);
      balances[plEntryIndex] = updatedEntry;
    } else {
      // Just update probation status in memory if balance hasn't changed
      balances[plEntryIndex].is_probation = isProbation;
    }
  } else {
    // Create new entry if not exists
    const newEntry = {
      user_id: userId,
      leave_type: 'Privilege Leave',
      financial_year: fyString,
      opening_balance: 0,
      availed: 0,
      balance: accrued,
      lapse: 0,
      lapse_date: null
    };

    // Save to DB (this returns the created row)
    const savedEntry = await leaveModel.updateLeaveBalance(newEntry);
    savedEntry.is_probation = isProbation;
    balances.push(savedEntry);
  }

  return balances;
}

/**
 * Update leave balance for a user (Admin only)
 */
export async function updateLeaveBalance(balanceData) {
  // Balance = Opening Balance − Availed − Lapse
  balanceData.balance = balanceData.opening_balance - balanceData.availed - (balanceData.lapse || 0);
  return await leaveModel.updateLeaveBalance(balanceData);
}

/**
 * Get shift roster for a date range
 */
export async function getShiftRoster(startDate, endDate) {
  return await leaveModel.getShiftRoster(startDate, endDate);
}

/**
 * Update shift roster
 */
export async function updateShiftRoster(shiftData) {
  return await leaveModel.updateShiftRoster(shiftData);
}

/**
 * Get attendance records for a date range
 */
export async function getAttendance(startDate, endDate) {
  return await leaveModel.getAttendance(startDate, endDate);
}

/**
 * Update attendance record
 */
export async function updateAttendanceRecord(attendanceData) {
  return await leaveModel.updateAttendanceRecord(attendanceData);
}

/**
 * Get leave history for a user
 */
export async function getLeaveHistory(userId) {
  return await leaveModel.getLeaveHistory(userId);
}

/**
 * Get monthly attendance report (Admin only)
 */
export async function getMonthlyAttendanceReport(month, year) {
  return await leaveModel.getMonthlyAttendanceReport(month, year);
}

/**
 * Get shift-wise attendance analysis (Admin only)
 */
export async function getShiftWiseAttendanceAnalysis(startDate, endDate) {
  return await leaveModel.getShiftWiseAttendanceAnalysis(startDate, endDate);
}
