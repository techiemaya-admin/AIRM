/**
 * Final Settlement Controller
 * Handle request/response for final settlement calculations
 * Call services
 * NO database queries, NO business logic
 */

import * as settlementService from '../services/final-settlement.service.js';
import * as exitModel from '../models/exit-formalities.pg.js';
import * as payslipModel from '../../payroll-pf/models/payslips.pg.js';
import * as profileModel from '../../profiles/models/profiles.pg.js';

/**
 * Calculate final settlement
 */
export async function calculateSettlement(req, res) {
  try {
    const { id: exit_request_id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    
    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR, Finance, or Admin can calculate settlements'
      });
    }
    
    // Get exit request
    const exitRequest = await exitModel.getExitRequestById(exit_request_id);
    if (!exitRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Exit request not found'
      });
    }
    
    // Get employee profile
    const profile = await profileModel.getProfileById(exitRequest.user_id);
    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Employee profile not found'
      });
    }
    
    // Get last payslip
    const payslips = await payslipModel.getPayslips({
      user_id: exitRequest.user_id,
      year: new Date(exitRequest.last_working_day).getFullYear(),
      month: new Date(exitRequest.last_working_day).getMonth() + 1
    });
    const lastPayslip = payslips.length > 0 ? payslips[0] : null;
    
    // Get assets
    const assets = await exitModel.getEmployeeAssets(exitRequest.user_id);
    const assetRecoveries = await exitModel.getAssetRecovery(exit_request_id);
    
    // Get payable and recoverable dues
    const payableDues = await exitModel.getPayableDues(exit_request_id);
    const recoverableDues = await exitModel.getRecoverableDues(exit_request_id);
    
    // Prepare inputs for calculation
    const inputs = {
      employeeInfo: {
        monthlyCTC: profile.monthly_ctc || profile.basic_salary || 0,
        basicSalary: profile.basic_salary || (profile.monthly_ctc ? profile.monthly_ctc * 0.4 : 0),
        grossSalary: profile.monthly_ctc || profile.basic_salary || 0,
        dateOfJoining: profile.join_date || exitRequest.resignation_date,
        lastWorkingDay: exitRequest.last_working_day,
        employmentType: profile.employment_type || 'Full-time',
        leaveBalance: req.body.leaveBalance || 0 // Should come from leave management system
      },
      payrollInputs: {
        salaryPaidTillDate: lastPayslip ? lastPayslip.net_pay : 0,
        pfApplicable: true,
        esiApplicable: false,
        bonusAmount: req.body.bonusAmount || 0,
        incentivesAmount: req.body.incentivesAmount || 0,
        reimbursements: req.body.reimbursements || 0,
        lastPayslip: lastPayslip
      },
      exitInputs: {
        assets: assetRecoveries.map(recovery => ({
          assetName: recovery.asset_name,
          assetId: recovery.asset_id,
          cost: recovery.cost_recovery || 0,
          depreciation: 0, // Should be calculated based on asset age
          status: recovery.recovery_status || 'returned'
        })),
        noticePeriodRequired: req.body.noticePeriodRequired || 30,
        noticePeriodServed: req.body.noticePeriodServed || 0,
        loans: recoverableDues.filter(d => d.due_type === 'loan').map(d => ({
          outstanding: d.amount || 0
        })),
        advances: recoverableDues.filter(d => d.due_type === 'advance').map(d => ({
          outstanding: d.amount || 0
        })),
        pendingRecoveries: recoverableDues.filter(d => 
          !['loan', 'advance'].includes(d.due_type)
        ).map(d => ({
          amount: d.amount || 0
        }))
      }
    };
    
    // Validate inputs
    const validation = settlementService.validateSettlementInputs(inputs);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid settlement inputs',
        errors: validation.errors
      });
    }
    
    // Calculate settlement
    const settlement = settlementService.calculateFinalSettlement(inputs);
    
    // Save settlement to database
    const savedSettlement = await exitModel.upsertSettlement({
      exit_request_id,
      total_payable: settlement.earnings.totalPayable,
      total_recoverable: settlement.deductions.totalRecoverable,
      net_settlement_amount: settlement.netSettlement,
      settlement_status: settlement.settlementStatus,
      calculated_by: userId,
      notes: JSON.stringify(settlement.details)
    });
    
    res.json({
      message: 'Settlement calculated successfully',
      settlement: {
        ...settlement,
        id: savedSettlement.id,
        exit_request_id
      }
    });
  } catch (error) {
    console.error('[exit-formalities] Calculate settlement error:', error);
    res.status(500).json({
      error: 'Failed to calculate settlement',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get settlement
 */
export async function getSettlement(req, res) {
  try {
    const { id } = req.params;
    const settlement = await exitModel.getSettlement(id);
    res.json({ settlement });
  } catch (error) {
    console.error('[exit-formalities] Get settlement error:', error);
    res.status(500).json({
      error: 'Failed to get settlement',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Update settlement status
 */
export async function updateSettlementStatus(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    const { status, payment_reference } = req.body;

    if (!isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only HR or Admin can update settlement status'
      });
    }

    const settlement = await exitModel.updateSettlementStatus(id, status, userId, payment_reference);

    res.json({
      message: 'Settlement status updated successfully',
      settlement
    });
  } catch (error) {
    console.error('[exit-formalities] Update settlement status error:', error);
    res.status(500).json({
      error: 'Failed to update settlement status',
      message: error.message || 'Internal server error'
    });
  }
}

