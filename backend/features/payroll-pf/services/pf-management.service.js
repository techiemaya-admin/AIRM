/**
 * PF Management Service
 * Business logic for PF details, contributions, documents
 * NO Express objects, NO database queries
 */

import * as pfDetailsModel from '../models/pf-details.pg.js';
import * as pfContributionsModel from '../models/pf-contributions.pg.js';
import * as pfDocumentsModel from '../models/pf-documents.pg.js';
import * as auditLogModel from '../models/payroll-audit-log.pg.js';

/**
 * Get PF details
 */
export async function getPfDetails(userId) {
  try {
    const pfDetails = await pfDetailsModel.getPfDetails(userId);
    if (!pfDetails) return null;

    return {
      id: pfDetails.id,
      user_id: pfDetails.user_id,
      email: pfDetails.email,
      full_name: pfDetails.full_name,
      uan_number: pfDetails.uan_number,
      pf_account_number: pfDetails.pf_account_number,
      enrollment_date: pfDetails.enrollment_date,
      status: pfDetails.status,
      employee_contribution_percent: parseFloat(pfDetails.employee_contribution_percent || 12),
      employer_contribution_percent: parseFloat(pfDetails.employer_contribution_percent || 12),
      pf_base_salary: parseFloat(pfDetails.pf_base_salary || 0),
      notes: pfDetails.notes,
      created_at: pfDetails.created_at,
      updated_at: pfDetails.updated_at,
      updated_by: pfDetails.updated_by,
      updated_by_name: pfDetails.updated_by_name
    };
  } catch (error) {
    console.error('[payroll-pf] Error in getPfDetails service:', error);
    throw error;
  }
}

/**
 * Create or update PF details
 */
export async function upsertPfDetails(pfData) {
  try {
    const pfDetails = await pfDetailsModel.upsertPfDetails(pfData);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: pfData.user_id,
      action: pfDetails.id ? 'pf_updated' : 'pf_created',
      entity_type: 'pf_detail',
      entity_id: pfDetails.id,
      performed_by: pfData.updated_by
    });

    return {
      id: pfDetails.id,
      user_id: pfDetails.user_id,
      uan_number: pfDetails.uan_number,
      pf_account_number: pfDetails.pf_account_number,
      enrollment_date: pfDetails.enrollment_date,
      status: pfDetails.status,
      employee_contribution_percent: parseFloat(pfDetails.employee_contribution_percent || 12),
      employer_contribution_percent: parseFloat(pfDetails.employer_contribution_percent || 12),
      pf_base_salary: parseFloat(pfDetails.pf_base_salary || 0),
      notes: pfDetails.notes,
      created_at: pfDetails.created_at,
      updated_at: pfDetails.updated_at,
      updated_by: pfDetails.updated_by
    };
  } catch (error) {
    console.error('[payroll-pf] Error in upsertPfDetails service:', error);
    throw error;
  }
}

/**
 * Get PF contributions
 */
export async function getPfContributions(filters = {}) {
  try {
    const contributions = await pfContributionsModel.getPfContributions(filters);
    return contributions.map(c => ({
      id: c.id,
      user_id: c.user_id,
      email: c.email,
      full_name: c.full_name,
      pf_detail_id: c.pf_detail_id,
      uan_number: c.uan_number,
      month: c.month,
      year: c.year,
      basic_salary: parseFloat(c.basic_salary || 0),
      employee_contribution: parseFloat(c.employee_contribution || 0),
      employer_contribution: parseFloat(c.employer_contribution || 0),
      total_contribution: parseFloat(c.total_contribution || 0),
      payslip_id: c.payslip_id,
      contribution_date: c.contribution_date,
      status: c.status,
      remarks: c.remarks,
      created_at: c.created_at,
      updated_at: c.updated_at
    }));
  } catch (error) {
    console.error('[payroll-pf] Error in getPfContributions service:', error);
    throw error;
  }
}

/**
 * Create PF contribution
 */
export async function createPfContribution(contributionData) {
  try {
    // Get PF details to calculate if needed
    if (!contributionData.employee_contribution || !contributionData.employer_contribution) {
      const pfDetails = await pfDetailsModel.getPfDetails(contributionData.user_id);
      if (pfDetails) {
        const basicSalary = contributionData.basic_salary || pfDetails.pf_base_salary || 0;
        const empPercent = pfDetails.employee_contribution_percent || 12;
        const empPercentDecimal = empPercent / 100;
        const employerPercent = pfDetails.employer_contribution_percent || 12;
        const employerPercentDecimal = employerPercent / 100;

        contributionData.employee_contribution = contributionData.employee_contribution || 
          Math.round(basicSalary * empPercentDecimal);
        contributionData.employer_contribution = contributionData.employer_contribution || 
          Math.round(basicSalary * employerPercentDecimal);
        contributionData.total_contribution = contributionData.total_contribution || 
          (contributionData.employee_contribution + contributionData.employer_contribution);
      }
    }

    const contribution = await pfContributionsModel.createPfContribution(contributionData);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: contributionData.user_id,
      action: 'pf_contribution_added',
      entity_type: 'pf_contribution',
      entity_id: contribution.id,
      performed_by: contributionData.created_by,
      details: { month: contributionData.month, year: contributionData.year }
    });

    return {
      id: contribution.id,
      user_id: contribution.user_id,
      pf_detail_id: contribution.pf_detail_id,
      month: contribution.month,
      year: contribution.year,
      basic_salary: parseFloat(contribution.basic_salary || 0),
      employee_contribution: parseFloat(contribution.employee_contribution || 0),
      employer_contribution: parseFloat(contribution.employer_contribution || 0),
      total_contribution: parseFloat(contribution.total_contribution || 0),
      payslip_id: contribution.payslip_id,
      contribution_date: contribution.contribution_date,
      status: contribution.status,
      remarks: contribution.remarks,
      created_at: contribution.created_at,
      updated_at: contribution.updated_at
    };
  } catch (error) {
    console.error('[payroll-pf] Error in createPfContribution service:', error);
    throw error;
  }
}

/**
 * Get PF documents
 */
export async function getPfDocuments(filters = {}) {
  try {
    return await pfDocumentsModel.getPfDocuments(filters);
  } catch (error) {
    console.error('[payroll-pf] Error in getPfDocuments service:', error);
    throw error;
  }
}

/**
 * Add PF document
 */
export async function addPfDocument(documentData) {
  try {
    const document = await pfDocumentsModel.addPfDocument(documentData);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: documentData.user_id,
      action: 'pf_document_uploaded',
      entity_type: 'pf_document',
      entity_id: document.id,
      performed_by: documentData.uploaded_by,
      details: { document_type: documentData.document_type }
    });

    return document;
  } catch (error) {
    console.error('[payroll-pf] Error in addPfDocument service:', error);
    throw error;
  }
}

/**
 * Get payroll audit log
 */
export async function getPayrollAuditLog(filters = {}) {
  try {
    return await auditLogModel.getPayrollAuditLog(filters);
  } catch (error) {
    console.error('[payroll-pf] Error in getPayrollAuditLog service:', error);
    throw error;
  }
}

