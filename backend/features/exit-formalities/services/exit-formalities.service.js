/**
 * Exit Formalities Service
 * Business logic and workflow orchestration
 * NO Express objects, NO database queries
 */

import * as exitModel from '../models/exit-formalities.pg.js';

/**
 * Transform raw database exit request to DTO
 */
function transformExitRequest(exitRequest) {
  if (!exitRequest) return null;

  return {
    id: exitRequest.id,
    user_id: exitRequest.user_id,
    employee_id: exitRequest.employee_id,
    full_name: exitRequest.full_name || exitRequest.user_full_name,
    email: exitRequest.email,
    department: exitRequest.department,
    manager_id: exitRequest.manager_id,
    manager_name: exitRequest.manager_name,
    manager_email: exitRequest.manager_email,
    resignation_date: exitRequest.resignation_date,
    last_working_day: exitRequest.last_working_day,
    reason_category: exitRequest.reason_category,
    reason_details: exitRequest.reason_details,
    resignation_letter_url: exitRequest.resignation_letter_url,
    exit_type: exitRequest.exit_type || 'Resignation',
    exit_progress_percentage: exitRequest.exit_progress_percentage || 0,
    initiated_by: exitRequest.initiated_by,
    status: exitRequest.status,
    initiated_at: exitRequest.initiated_at,
    manager_approved_at: exitRequest.manager_approved_at,
    hr_approved_at: exitRequest.hr_approved_at,
    clearance_completed_at: exitRequest.clearance_completed_at,
    settlement_completed_at: exitRequest.settlement_completed_at,
    completed_at: exitRequest.completed_at,
    cancelled_at: exitRequest.cancelled_at,
    created_at: exitRequest.created_at,
    updated_at: exitRequest.updated_at,
  };
}

/**
 * Get all exit requests
 */
export async function getAllExitRequests(filters = {}) {
  try {
    const exitRequests = await exitModel.getAllExitRequests(filters);
    return exitRequests.map(transformExitRequest).filter(er => er !== null);
  } catch (error) {
    console.error('[exit-formalities] Error in getAllExitRequests service:', error);
    throw error;
  }
}

/**
 * Get exit request by ID
 */
export async function getExitRequestById(exitRequestId) {
  try {
    if (!exitRequestId) {
      throw new Error('Exit request ID is required');
    }
    
    const exitRequest = await exitModel.getExitRequestById(exitRequestId);
    
    if (!exitRequest) {
      return null;
    }
    
    return transformExitRequest(exitRequest);
  } catch (error) {
    console.error('[exit-formalities] Error in getExitRequestById service:', error);
    throw error;
  }
}

/**
 * Create exit request
 */
export async function createExitRequest(exitData) {
  try {
    // Validate required fields
    if (!exitData.user_id || !exitData.resignation_date || !exitData.last_working_day) {
      throw new Error('User ID, resignation date, and last working day are required');
    }

    // Check if user already has an active exit request
    const existingRequest = await exitModel.getExitRequestByUserId(exitData.user_id);
    if (existingRequest) {
      throw new Error('User already has an active exit request');
    }

    // Set default exit_type if not provided
    if (!exitData.exit_type) {
      exitData.exit_type = 'Resignation';
    }

    // Set initiated_by if not provided (defaults to user_id for employee-initiated)
    if (!exitData.initiated_by) {
      exitData.initiated_by = exitData.user_id;
    }

    // Create exit request
    const exitRequest = await exitModel.createExitRequest(exitData);

    // Add activity log
    await exitModel.addActivityLog({
      exit_request_id: exitRequest.id,
      action: 'initiated',
      performed_by: exitData.initiated_by,
      details: { 
        reason_category: exitData.reason_category,
        exit_type: exitData.exit_type
      }
    });

    return transformExitRequest(exitRequest);
  } catch (error) {
    console.error('[exit-formalities] Error in createExitRequest service:', error);
    throw error;
  }
}

/**
 * Update exit request
 */
export async function updateExitRequest(exitRequestId, updateData) {
  try {
    const exitRequest = await exitModel.updateExitRequest(exitRequestId, updateData);
    return transformExitRequest(exitRequest);
  } catch (error) {
    console.error('[exit-formalities] Error in updateExitRequest service:', error);
    throw error;
  }
}

/**
 * Update exit request status
 */
export async function updateExitRequestStatus(exitRequestId, status, performedBy, details = {}) {
  try {
    const updateData = { status }; // Don't include updated_at here - model handles it

    // Set timestamp based on status
    switch (status) {
      case 'manager_approved':
        updateData.manager_approved_at = new Date();
        break;
      case 'hr_approved':
        updateData.hr_approved_at = new Date();
        break;
      case 'clearance_completed':
        updateData.clearance_completed_at = new Date();
        break;
      case 'settlement_completed':
        updateData.settlement_completed_at = new Date();
        break;
      case 'completed':
        updateData.completed_at = new Date();
        break;
      case 'cancelled':
        updateData.cancelled_at = new Date();
        break;
    }

    const exitRequest = await exitModel.updateExitRequest(exitRequestId, updateData);

    // Add activity log
    await exitModel.addActivityLog({
      exit_request_id: exitRequestId,
      action: status,
      performed_by: performedBy,
      details
    });

    return transformExitRequest(exitRequest);
  } catch (error) {
    console.error('[exit-formalities] Error in updateExitRequestStatus service:', error);
    throw error;
  }
}

/**
 * Get clearance checklist
 */
export async function getClearanceChecklist(exitRequestId) {
  try {
    return await exitModel.getClearanceChecklist(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getClearanceChecklist service:', error);
    throw error;
  }
}

/**
 * Update clearance item
 */
export async function updateClearanceItem(clearanceData) {
  try {
    const clearanceItem = await exitModel.upsertClearanceItem(clearanceData);

    // Check if all clearances are approved
    const allClearances = await exitModel.getClearanceChecklist(clearanceData.exit_request_id);
    const allApproved = allClearances.every(c => c.status === 'approved');

    if (allApproved && allClearances.length > 0) {
      await updateExitRequestStatus(
        clearanceData.exit_request_id,
        'clearance_completed',
        clearanceData.approver_id,
        { department: clearanceData.department }
      );
    }

    return clearanceItem;
  } catch (error) {
    console.error('[exit-formalities] Error in updateClearanceItem service:', error);
    throw error;
  }
}

/**
 * Get exit interview
 */
export async function getExitInterview(exitRequestId) {
  try {
    const interview = await exitModel.getExitInterview(exitRequestId);
    if (interview && interview.feedback_questions) {
      interview.feedback_questions = typeof interview.feedback_questions === 'string'
        ? JSON.parse(interview.feedback_questions)
        : interview.feedback_questions;
    }
    return interview;
  } catch (error) {
    console.error('[exit-formalities] Error in getExitInterview service:', error);
    throw error;
  }
}

/**
 * Save exit interview
 */
export async function saveExitInterview(interviewData) {
  try {
    const interview = await exitModel.upsertExitInterview(interviewData);
    if (interview && interview.feedback_questions) {
      interview.feedback_questions = typeof interview.feedback_questions === 'string'
        ? JSON.parse(interview.feedback_questions)
        : interview.feedback_questions;
    }
    return interview;
  } catch (error) {
    console.error('[exit-formalities] Error in saveExitInterview service:', error);
    throw error;
  }
}

/**
 * Get exit documents
 */
export async function getExitDocuments(exitRequestId) {
  try {
    return await exitModel.getExitDocuments(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getExitDocuments service:', error);
    throw error;
  }
}

/**
 * Add exit document
 */
export async function addExitDocument(documentData) {
  try {
    return await exitModel.addExitDocument(documentData);
  } catch (error) {
    console.error('[exit-formalities] Error in addExitDocument service:', error);
    throw error;
  }
}

/**
 * Get activity log
 */
export async function getActivityLog(exitRequestId) {
  try {
    const activities = await exitModel.getExitActivityLog(exitRequestId);
    return activities.map(activity => ({
      ...activity,
      details: activity.details ? (typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details) : null
    }));
  } catch (error) {
    console.error('[exit-formalities] Error in getActivityLog service:', error);
    throw error;
  }
}

/**
 * Delete exit request
 */
export async function deleteExitRequest(exitRequestId) {
  try {
    if (!exitRequestId) {
      throw new Error('Exit request ID is required');
    }

    // Check if exit request exists
    const exitRequest = await exitModel.getExitRequestById(exitRequestId);
    if (!exitRequest) {
      throw new Error('Exit request not found');
    }

    // Delete exit request (cascade will delete related records)
    const deleted = await exitModel.deleteExitRequest(exitRequestId);
    return deleted;
  } catch (error) {
    console.error('[exit-formalities] Error in deleteExitRequest service:', error);
    throw error;
  }
}

// ============================================
// ASSET RECOVERY & HANDOVER
// ============================================

/**
 * Get employee assets
 */
export async function getEmployeeAssets(userId) {
  try {
    return await exitModel.getEmployeeAssets(userId);
  } catch (error) {
    console.error('[exit-formalities] Error in getEmployeeAssets service:', error);
    throw error;
  }
}

/**
 * Create employee asset
 */
export async function createEmployeeAsset(assetData) {
  try {
    if (!assetData.user_id || !assetData.asset_name || !assetData.assigned_date) {
      throw new Error('User ID, asset name, and assigned date are required');
    }
    return await exitModel.createEmployeeAsset(assetData);
  } catch (error) {
    console.error('[exit-formalities] Error in createEmployeeAsset service:', error);
    throw error;
  }
}

/**
 * Get asset recovery for exit request
 */
export async function getAssetRecovery(exitRequestId) {
  try {
    return await exitModel.getAssetRecovery(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getAssetRecovery service:', error);
    throw error;
  }
}

/**
 * Update asset recovery
 */
export async function updateAssetRecovery(recoveryData) {
  try {
    const recovery = await exitModel.upsertAssetRecovery(recoveryData);
    
    // If asset is lost or damaged, create recoverable due
    if (recovery.recovery_status === 'lost' || recovery.recovery_status === 'damaged') {
      if (recovery.cost_recovery > 0) {
        await exitModel.upsertRecoverableDue({
          exit_request_id: recoveryData.exit_request_id,
          due_type: recovery.recovery_status === 'lost' ? 'unreturned_assets' : 'damaged_assets',
          description: `Asset: ${recovery.asset_name} - ${recovery.recovery_status}`,
          amount: recovery.cost_recovery,
          calculated_by: recoveryData.recovered_by
        });
      }
    }
    
    return recovery;
  } catch (error) {
    console.error('[exit-formalities] Error in updateAssetRecovery service:', error);
    throw error;
  }
}

/**
 * Get asset handover
 */
export async function getAssetHandover(exitRequestId) {
  try {
    return await exitModel.getAssetHandover(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getAssetHandover service:', error);
    throw error;
  }
}

/**
 * Generate asset handover document
 */
export async function generateAssetHandover(exitRequestId, handoverData) {
  try {
    // In a real implementation, this would generate a PDF
    // For now, we'll just store the metadata
    return await exitModel.upsertAssetHandover({
      ...handoverData,
      exit_request_id: exitRequestId
    });
  } catch (error) {
    console.error('[exit-formalities] Error in generateAssetHandover service:', error);
    throw error;
  }
}

// ============================================
// DE-PROVISIONING (SYSTEM ACCESS)
// ============================================

/**
 * Get access de-provisioning checklist
 */
export async function getAccessDeprovisioning(exitRequestId) {
  try {
    return await exitModel.getAccessDeprovisioning(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getAccessDeprovisioning service:', error);
    throw error;
  }
}

/**
 * Update access de-provisioning
 */
export async function updateAccessDeprovisioning(deprovisionData) {
  try {
    return await exitModel.upsertAccessDeprovisioning(deprovisionData);
  } catch (error) {
    console.error('[exit-formalities] Error in updateAccessDeprovisioning service:', error);
    throw error;
  }
}

/**
 * Auto-revoke access on last working day
 */
export async function autoRevokeAccess(exitRequestId) {
  try {
    const exitRequest = await exitModel.getExitRequestById(exitRequestId);
    if (!exitRequest) {
      throw new Error('Exit request not found');
    }

    const today = new Date();
    const lastWorkingDay = new Date(exitRequest.last_working_day);

    // Only auto-revoke if today is the last working day or after
    if (today >= lastWorkingDay) {
      // Default systems to revoke
      const defaultSystems = [
        { system_name: 'Email', system_type: 'Email' },
        { system_name: 'Git Repository', system_type: 'Version Control' },
        { system_name: 'VPN', system_type: 'Network' },
        { system_name: 'CRM', system_type: 'CRM' },
        { system_name: 'ERP', system_type: 'ERP' },
        { system_name: 'Cloud Platform', system_type: 'Cloud' }
      ];

      const revoked = [];
      for (const system of defaultSystems) {
        const result = await exitModel.upsertAccessDeprovisioning({
          exit_request_id: exitRequestId,
          system_name: system.system_name,
          system_type: system.system_type,
          status: 'revoked',
          auto_revoked: true
        });
        revoked.push(result);
      }

      return revoked;
    }

    return [];
  } catch (error) {
    console.error('[exit-formalities] Error in autoRevokeAccess service:', error);
    throw error;
  }
}

// ============================================
// EMPLOYEE DUES & FINAL SETTLEMENT
// ============================================

/**
 * Get payable dues
 */
export async function getPayableDues(exitRequestId) {
  try {
    return await exitModel.getPayableDues(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getPayableDues service:', error);
    throw error;
  }
}

/**
 * Add or update payable due
 */
export async function upsertPayableDue(dueData) {
  try {
    return await exitModel.upsertPayableDue(dueData);
  } catch (error) {
    console.error('[exit-formalities] Error in upsertPayableDue service:', error);
    throw error;
  }
}

/**
 * Get recoverable dues
 */
export async function getRecoverableDues(exitRequestId) {
  try {
    return await exitModel.getRecoverableDues(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getRecoverableDues service:', error);
    throw error;
  }
}

/**
 * Add or update recoverable due
 */
export async function upsertRecoverableDue(dueData) {
  try {
    return await exitModel.upsertRecoverableDue(dueData);
  } catch (error) {
    console.error('[exit-formalities] Error in upsertRecoverableDue service:', error);
    throw error;
  }
}

/**
 * Calculate and update settlement
 */
export async function calculateSettlement(exitRequestId, calculatedBy) {
  try {
    // Get all payable dues
    const payableDues = await exitModel.getPayableDues(exitRequestId);
    const totalPayable = payableDues.reduce((sum, due) => sum + parseFloat(due.amount || 0), 0);

    // Get all recoverable dues
    const recoverableDues = await exitModel.getRecoverableDues(exitRequestId);
    const totalRecoverable = recoverableDues.reduce((sum, due) => sum + parseFloat(due.amount || 0), 0);

    // Calculate net settlement
    const netSettlement = totalPayable - totalRecoverable;

    // Create or update settlement
    const settlement = await exitModel.upsertSettlement({
      exit_request_id: exitRequestId,
      total_payable: totalPayable,
      total_recoverable: totalRecoverable,
      net_settlement_amount: netSettlement,
      settlement_status: 'calculated',
      calculated_by: calculatedBy
    });

    // Update exit request status if needed
    const exitRequest = await exitModel.getExitRequestById(exitRequestId);
    if (exitRequest.status === 'clearance_completed') {
      await updateExitRequestStatus(exitRequestId, 'settlement_pending', calculatedBy);
    }

    return settlement;
  } catch (error) {
    console.error('[exit-formalities] Error in calculateSettlement service:', error);
    throw error;
  }
}

/**
 * Get settlement
 */
export async function getSettlement(exitRequestId) {
  try {
    return await exitModel.getSettlement(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getSettlement service:', error);
    throw error;
  }
}

/**
 * Update settlement status
 */
export async function updateSettlementStatus(exitRequestId, status, updatedBy, paymentReference = null) {
  try {
    const settlement = await exitModel.getSettlement(exitRequestId);
    if (!settlement) {
      throw new Error('Settlement not found. Please calculate settlement first.');
    }

    const updateData = {
      exit_request_id: exitRequestId,
      total_payable: settlement.total_payable,
      total_recoverable: settlement.total_recoverable,
      net_settlement_amount: settlement.net_settlement_amount,
      settlement_status: status,
      payment_reference: paymentReference || settlement.payment_reference
    };

    if (status === 'approved') {
      updateData.approved_by = updatedBy;
    } else if (status === 'paid') {
      updateData.paid_by = updatedBy;
    }

    return await exitModel.upsertSettlement(updateData);
  } catch (error) {
    console.error('[exit-formalities] Error in updateSettlementStatus service:', error);
    throw error;
  }
}

// ============================================
// PF, GRATUITY & COMPLIANCE
// ============================================

/**
 * Get PF management
 */
export async function getPFManagement(exitRequestId) {
  try {
    return await exitModel.getPFManagement(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getPFManagement service:', error);
    throw error;
  }
}

/**
 * Initiate PF exit
 */
export async function initiatePFExit(exitRequestId, initiatedBy, pfDetailId = null) {
  try {
    return await exitModel.upsertPFManagement({
      exit_request_id: exitRequestId,
      pf_detail_id: pfDetailId,
      pf_exit_initiated: true,
      pf_exit_initiated_by: initiatedBy,
      pf_withdrawal_status: 'initiated'
    });
  } catch (error) {
    console.error('[exit-formalities] Error in initiatePFExit service:', error);
    throw error;
  }
}

/**
 * Get gratuity
 */
export async function getGratuity(exitRequestId) {
  try {
    return await exitModel.getGratuity(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getGratuity service:', error);
    throw error;
  }
}

/**
 * Calculate gratuity
 */
export async function calculateGratuity(exitRequestId, calculatedBy, lastDrawnSalary, joinDate, lastWorkingDay) {
  try {
    // Calculate years of service
    const join = new Date(joinDate);
    const exit = new Date(lastWorkingDay);
    const yearsOfService = (exit - join) / (1000 * 60 * 60 * 24 * 365.25);

    // Gratuity eligibility: 5+ years of continuous service
    const eligible = yearsOfService >= 5;

    let gratuityAmount = 0;
    if (eligible) {
      // Gratuity = (Last drawn salary / 26) * 15 * Years of service
      const dailyWage = lastDrawnSalary / 26;
      gratuityAmount = dailyWage * 15 * yearsOfService;
    }

    return await exitModel.upsertGratuity({
      exit_request_id: exitRequestId,
      eligible,
      years_of_service: yearsOfService,
      last_drawn_salary: lastDrawnSalary,
      gratuity_amount: gratuityAmount,
      calculated_by: calculatedBy
    });
  } catch (error) {
    console.error('[exit-formalities] Error in calculateGratuity service:', error);
    throw error;
  }
}

/**
 * Get compliance checklist
 */
export async function getComplianceChecklist(exitRequestId) {
  try {
    return await exitModel.getComplianceChecklist(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getComplianceChecklist service:', error);
    throw error;
  }
}

/**
 * Update compliance item
 */
export async function updateComplianceItem(complianceData) {
  try {
    return await exitModel.upsertComplianceItem(complianceData);
  } catch (error) {
    console.error('[exit-formalities] Error in updateComplianceItem service:', error);
    throw error;
  }
}

/**
 * Get compliance documents
 */
export async function getComplianceDocuments(exitRequestId) {
  try {
    return await exitModel.getComplianceDocuments(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getComplianceDocuments service:', error);
    throw error;
  }
}

/**
 * Add compliance document
 */
export async function addComplianceDocument(documentData) {
  try {
    return await exitModel.addComplianceDocument(documentData);
  } catch (error) {
    console.error('[exit-formalities] Error in addComplianceDocument service:', error);
    throw error;
  }
}

// ============================================
// SMART ADD-ONS
// ============================================

/**
 * Calculate exit progress percentage
 */
export async function calculateExitProgress(exitRequestId) {
  try {
    const exitRequest = await exitModel.getExitRequestById(exitRequestId);
    if (!exitRequest) {
      return 0;
    }

    let progress = 0;
    const totalSteps = 10; // Total number of steps

    // Step 1: Exit initiated (10%)
    if (exitRequest.status !== 'initiated') progress += 10;

    // Step 2: Manager approved (10%)
    if (exitRequest.manager_approved_at) progress += 10;

    // Step 3: HR approved (10%)
    if (exitRequest.hr_approved_at) progress += 10;

    // Step 4: Clearance completed (20%)
    const clearances = await exitModel.getClearanceChecklist(exitRequestId);
    if (clearances.length > 0 && clearances.every(c => c.status === 'approved')) {
      progress += 20;
    }

    // Step 5: Asset recovery (15%)
    const assets = await exitModel.getAssetRecovery(exitRequestId);
    if (assets.length > 0 && assets.every(a => a.recovery_status !== 'pending')) {
      progress += 15;
    }

    // Step 6: De-provisioning (10%)
    const deprovisioning = await exitModel.getAccessDeprovisioning(exitRequestId);
    if (deprovisioning.length > 0 && deprovisioning.every(d => d.status === 'revoked' || d.status === 'not_applicable')) {
      progress += 10;
    }

    // Step 7: Settlement calculated (10%)
    const settlement = await exitModel.getSettlement(exitRequestId);
    if (settlement) progress += 10;

    // Step 8: Compliance completed (5%)
    const compliance = await exitModel.getComplianceChecklist(exitRequestId);
    if (compliance.length > 0 && compliance.every(c => c.status === 'completed' || c.status === 'not_applicable')) {
      progress += 5;
    }

    // Step 9: Settlement approved (5%)
    if (settlement && settlement.settlement_status === 'approved') {
      progress += 5;
    }

    // Step 10: Exit completed (5%)
    if (exitRequest.status === 'completed') {
      progress += 5;
    }

    // Update progress
    await exitModel.updateExitProgress(exitRequestId, progress);

    return progress;
  } catch (error) {
    console.error('[exit-formalities] Error in calculateExitProgress service:', error);
    throw error;
  }
}

/**
 * Get exit progress
 */
export async function getExitProgress(exitRequestId) {
  try {
    return await exitModel.calculateExitProgress(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getExitProgress service:', error);
    throw error;
  }
}

/**
 * Get reminders
 */
export async function getReminders(exitRequestId) {
  try {
    return await exitModel.getReminders(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getReminders service:', error);
    throw error;
  }
}

/**
 * Create reminder
 */
export async function createReminder(reminderData) {
  try {
    return await exitModel.createReminder(reminderData);
  } catch (error) {
    console.error('[exit-formalities] Error in createReminder service:', error);
    throw error;
  }
}

/**
 * Get asset risks
 */
export async function getAssetRisks(exitRequestId) {
  try {
    return await exitModel.getAssetRisks(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getAssetRisks service:', error);
    throw error;
  }
}

/**
 * Flag asset risk
 */
export async function flagAssetRisk(riskData) {
  try {
    return await exitModel.createAssetRisk(riskData);
  } catch (error) {
    console.error('[exit-formalities] Error in flagAssetRisk service:', error);
    throw error;
  }
}

/**
 * Resolve asset risk
 */
export async function resolveAssetRisk(riskId, resolvedBy, resolutionNotes) {
  try {
    return await exitModel.resolveAssetRisk(riskId, resolvedBy, resolutionNotes);
  } catch (error) {
    console.error('[exit-formalities] Error in resolveAssetRisk service:', error);
    throw error;
  }
}

/**
 * Get exit reports
 */
export async function getExitReports(exitRequestId) {
  try {
    return await exitModel.getExitReports(exitRequestId);
  } catch (error) {
    console.error('[exit-formalities] Error in getExitReports service:', error);
    throw error;
  }
}

/**
 * Create exit report
 */
export async function createExitReport(reportData) {
  try {
    return await exitModel.createExitReport(reportData);
  } catch (error) {
    console.error('[exit-formalities] Error in createExitReport service:', error);
    throw error;
  }
}

/**
 * Get exit communications
 */
export async function getExitCommunications(exitRequestId) {
  try {
    const communications = await exitModel.getExitCommunications(exitRequestId);
    return communications.map(comm => ({
      ...comm,
      metadata: comm.metadata ? (typeof comm.metadata === 'string' ? JSON.parse(comm.metadata) : comm.metadata) : null
    }));
  } catch (error) {
    console.error('[exit-formalities] Error in getExitCommunications service:', error);
    throw error;
  }
}

/**
 * Create exit communication
 */
export async function createExitCommunication(communicationData) {
  try {
    return await exitModel.createExitCommunication(communicationData);
  } catch (error) {
    console.error('[exit-formalities] Error in createExitCommunication service:', error);
    throw error;
  }
}

/**
 * Get exit dashboard metrics
 */
export async function getExitDashboardMetrics(filters = {}) {
  try {
    // This would typically aggregate data from multiple tables
    // For now, return basic metrics
    const allExits = await exitModel.getAllExitRequests(filters);
    
    const metrics = {
      total_exits: allExits.length,
      pending_clearances: allExits.filter(e => e.status === 'clearance_pending').length,
      pending_settlements: allExits.filter(e => e.status === 'settlement_pending').length,
      completed: allExits.filter(e => e.status === 'completed').length,
      by_exit_type: {
        resignation: allExits.filter(e => e.exit_type === 'Resignation').length,
        termination: allExits.filter(e => e.exit_type === 'Termination').length,
        absconded: allExits.filter(e => e.exit_type === 'Absconded').length,
        contract_end: allExits.filter(e => e.exit_type === 'Contract End').length
      },
      average_completion_days: 0 // Would calculate from dates
    };

    return metrics;
  } catch (error) {
    console.error('[exit-formalities] Error in getExitDashboardMetrics service:', error);
    throw error;
  }
}

