/**
 * Final Settlement Calculation Service
 * HR + Finance Safe Calculation Logic
 * NO Express objects, NO database queries
 */

/**
 * Calculate salary payable till last working day
 */
function calculateSalaryPayable(monthlyGross, lastWorkingDay, month, year) {
  // Get total days in the month
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  
  // Calculate per day salary
  const perDaySalary = monthlyGross / totalDaysInMonth;
  
  // Calculate days worked in last month
  const daysWorked = lastWorkingDay.getDate();
  
  // Payable salary
  const payableSalary = perDaySalary * daysWorked;
  
  return {
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    daysWorked,
    totalDaysInMonth,
    payableSalary: Math.round(payableSalary * 100) / 100
  };
}

/**
 * Calculate leave encashment
 * @param {number} eligibleLeaves - Remaining paid leaves
 * @param {number} basicSalary - Monthly basic salary
 * @param {string} encashmentType - 'basic' or 'gross' (default: 'basic')
 */
function calculateLeaveEncashment(eligibleLeaves, basicSalary, encashmentType = 'basic') {
  if (eligibleLeaves <= 0) {
    return {
      eligibleLeaves: 0,
      perDayBasic: 0,
      encashmentAmount: 0
    };
  }
  
  // Per day basic = Basic Salary / 30
  const perDayBasic = basicSalary / 30;
  
  // Leave encashment = Eligible Leaves × Per Day Basic
  const encashmentAmount = eligibleLeaves * perDayBasic;
  
  return {
    eligibleLeaves,
    perDayBasic: Math.round(perDayBasic * 100) / 100,
    encashmentAmount: Math.round(encashmentAmount * 100) / 100,
    encashmentType
  };
}

/**
 * Calculate notice period recovery
 */
function calculateNoticeRecovery(requiredNoticeDays, servedNoticeDays, perDayGross) {
  if (servedNoticeDays >= requiredNoticeDays) {
    return {
      shortfallDays: 0,
      recoveryAmount: 0
    };
  }
  
  const shortfallDays = requiredNoticeDays - servedNoticeDays;
  const recoveryAmount = perDayGross * shortfallDays;
  
  return {
    shortfallDays,
    recoveryAmount: Math.round(recoveryAmount * 100) / 100
  };
}

/**
 * Calculate asset recovery
 */
function calculateAssetRecovery(assetCost, depreciation, assetStatus) {
  if (assetStatus === 'returned' || assetStatus === 'good') {
    return {
      recoveryAmount: 0,
      reason: 'Asset returned in good condition'
    };
  }
  
  if (assetStatus === 'damaged') {
    // Recovery = Asset Cost - Depreciation
    const recoveryAmount = Math.max(0, assetCost - depreciation);
    return {
      recoveryAmount: Math.round(recoveryAmount * 100) / 100,
      reason: 'Asset damaged - recovery based on depreciation'
    };
  }
  
  if (assetStatus === 'lost') {
    // Full recovery if lost
    return {
      recoveryAmount: Math.round(assetCost * 100) / 100,
      reason: 'Asset lost - full recovery'
    };
  }
  
  return {
    recoveryAmount: 0,
    reason: 'No recovery required'
  };
}

/**
 * Calculate statutory deductions
 */
function calculateStatutoryDeductions(payslipData, isLastMonth = true) {
  const deductions = {
    pf_employee: payslipData.pf_employee || 0,
    pf_employer: payslipData.pf_employer || 0,
    esi_employee: payslipData.esi_employee || 0,
    esi_employer: payslipData.esi_employer || 0,
    professional_tax: payslipData.professional_tax || 0,
    tds: isLastMonth ? (payslipData.tds || 0) : 0, // TDS only in final month
    other_deductions: payslipData.other_deductions || 0
  };
  
  const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
  
  return {
    ...deductions,
    totalDeductions: Math.round(totalDeductions * 100) / 100
  };
}

/**
 * Main Final Settlement Calculation
 * @param {Object} inputs - All required inputs for calculation
 */
export function calculateFinalSettlement(inputs) {
  const {
    // Employee Info
    employeeInfo: {
      monthlyCTC,
      basicSalary,
      grossSalary,
      dateOfJoining,
      lastWorkingDay,
      employmentType,
      leaveBalance
    },
    // Payroll Inputs
    payrollInputs: {
      salaryPaidTillDate,
      pfApplicable = true,
      esiApplicable = false,
      bonusAmount = 0,
      incentivesAmount = 0,
      reimbursements = 0,
      lastPayslip
    },
    // Exit Inputs
    exitInputs: {
      assets = [],
      noticePeriodRequired = 0,
      noticePeriodServed = 0,
      loans = [],
      advances = [],
      pendingRecoveries = []
    }
  } = inputs;
  
  // 1. Salary Payable (Till Last Working Day)
  const lwd = new Date(lastWorkingDay);
  const salaryCalculation = calculateSalaryPayable(
    grossSalary || monthlyCTC,
    lwd,
    lwd.getMonth() + 1,
    lwd.getFullYear()
  );
  
  // 2. Leave Encashment
  const leaveEncashment = calculateLeaveEncashment(
    leaveBalance || 0,
    basicSalary,
    'basic' // Configurable: 'basic' or 'gross'
  );
  
  // 3. Bonus / Incentives
  const totalBonus = (bonusAmount || 0) + (incentivesAmount || 0);
  
  // 4. Reimbursements
  const totalReimbursements = reimbursements || 0;
  
  // 5. TOTAL PAYABLE
  const totalPayable = 
    salaryCalculation.payableSalary +
    leaveEncashment.encashmentAmount +
    totalBonus +
    totalReimbursements;
  
  // 6. Employer Deductions (Recoverables)
  
  // a) Notice Period Shortfall
  const perDayGross = (grossSalary || monthlyCTC) / 30;
  const noticeRecovery = calculateNoticeRecovery(
    noticePeriodRequired,
    noticePeriodServed,
    perDayGross
  );
  
  // b) Asset Recovery
  let totalAssetRecovery = 0;
  const assetRecoveries = assets.map(asset => {
    const recovery = calculateAssetRecovery(
      asset.cost || 0,
      asset.depreciation || 0,
      asset.status || 'returned'
    );
    totalAssetRecovery += recovery.recoveryAmount;
    return {
      ...asset,
      ...recovery
    };
  });
  
  // c) Loans / Advances
  const totalLoans = (loans || []).reduce((sum, loan) => sum + (loan.outstanding || 0), 0);
  const totalAdvances = (advances || []).reduce((sum, advance) => sum + (advance.outstanding || 0), 0);
  
  // d) Other Pending Recoveries
  const totalPendingRecoveries = (pendingRecoveries || []).reduce(
    (sum, recovery) => sum + (recovery.amount || 0),
    0
  );
  
  // 7. Statutory Deductions (from last payslip if available)
  const statutoryDeductions = lastPayslip 
    ? calculateStatutoryDeductions(lastPayslip, true)
    : { totalDeductions: 0 };
  
  // 8. TOTAL RECOVERABLE
  const totalRecoverable = 
    noticeRecovery.recoveryAmount +
    totalAssetRecovery +
    totalLoans +
    totalAdvances +
    totalPendingRecoveries +
    statutoryDeductions.totalDeductions;
  
  // 9. NET SETTLEMENT
  const netSettlement = totalPayable - totalRecoverable;
  
  // 10. Settlement Status
  let settlementStatus = 'fully_settled';
  if (netSettlement > 0) {
    settlementStatus = 'company_pays_employee';
  } else if (netSettlement < 0) {
    settlementStatus = 'employee_pays_company';
  }
  
  return {
    // Earnings Breakdown
    earnings: {
      salaryPayable: Math.round(salaryCalculation.payableSalary * 100) / 100,
      leaveEncashment: Math.round(leaveEncashment.encashmentAmount * 100) / 100,
      bonus: Math.round(totalBonus * 100) / 100,
      incentives: Math.round((incentivesAmount || 0) * 100) / 100,
      reimbursements: Math.round(totalReimbursements * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100
    },
    
    // Deductions Breakdown
    deductions: {
      noticeRecovery: Math.round(noticeRecovery.recoveryAmount * 100) / 100,
      assetRecovery: Math.round(totalAssetRecovery * 100) / 100,
      loans: Math.round(totalLoans * 100) / 100,
      advances: Math.round(totalAdvances * 100) / 100,
      pendingRecoveries: Math.round(totalPendingRecoveries * 100) / 100,
      statutoryDeductions: Math.round(statutoryDeductions.totalDeductions * 100) / 100,
      totalRecoverable: Math.round(totalRecoverable * 100) / 100
    },
    
    // Net Settlement
    netSettlement: Math.round(netSettlement * 100) / 100,
    settlementStatus,
    
    // Detailed Breakdowns
    details: {
      salaryCalculation,
      leaveEncashment,
      noticeRecovery,
      assetRecoveries,
      statutoryDeductions
    },
    
    // Metadata
    metadata: {
      calculatedAt: new Date().toISOString(),
      lastWorkingDay: lwd.toISOString(),
      dateOfJoining: new Date(dateOfJoining).toISOString(),
      employmentType,
      noticePeriodRequired,
      noticePeriodServed
    }
  };
}

/**
 * Validate settlement inputs
 */
export function validateSettlementInputs(inputs) {
  const errors = [];
  
  if (!inputs.employeeInfo) {
    errors.push('Employee info is required');
  } else {
    const { monthlyCTC, basicSalary, lastWorkingDay, dateOfJoining } = inputs.employeeInfo;
    
    if (!monthlyCTC && !basicSalary) {
      errors.push('Monthly CTC or Basic Salary is required');
    }
    
    if (!lastWorkingDay) {
      errors.push('Last Working Day is required');
    }
    
    if (!dateOfJoining) {
      errors.push('Date of Joining is required');
    }
  }
  
  if (!inputs.payrollInputs) {
    errors.push('Payroll inputs are required');
  }
  
  if (!inputs.exitInputs) {
    errors.push('Exit inputs are required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

