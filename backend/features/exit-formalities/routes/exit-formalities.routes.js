/**
 * Exit Formalities Routes
 * Define API endpoints only
 * Wire middleware and controllers
 * NO business logic
 */

import express from 'express';
import { authenticate } from '../../../core/auth/authMiddleware.js';
import * as exitController from '../controllers/exit-formalities.controller.js';
import * as settlementController from '../controllers/final-settlement.controller.js';
import * as pdfController from '../controllers/pdf-documents.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/exit-formalities
 * Get all exit requests
 */
router.get('/', exitController.getAllExitRequests);

/**
 * POST /api/exit-formalities
 * Create exit request
 */
router.post('/', exitController.createExitRequest);

// ============================================
// ASSET RECOVERY & HANDOVER
// NOTE: /assets routes MUST come BEFORE /:id/assets routes
// ============================================

/**
 * GET /api/exit-formalities/assets
 * Get employee assets
 * NOTE: This must come BEFORE /:id/assets to avoid route conflicts
 */
router.get('/assets', exitController.getEmployeeAssets);

/**
 * POST /api/exit-formalities/assets
 * Create employee asset
 * NOTE: This must come BEFORE /:id/assets to avoid route conflicts
 */
router.post('/assets', exitController.createEmployeeAsset);

// NOTE: All specific /:id/* routes must come BEFORE the general /:id route
// Express matches routes in order, so general routes will catch everything if placed first

/**
 * PUT /api/exit-formalities/:id/approve
 * Approve exit request (manager or HR)
 */
router.put('/:id/approve', exitController.approveExitRequest);

/**
 * PUT /api/exit-formalities/:id/clearance
 * Update clearance item
 */
router.put('/:id/clearance', exitController.updateClearance);

/**
 * PUT /api/exit-formalities/:id/complete
 * Complete exit (final step)
 */
router.put('/:id/complete', exitController.completeExit);

/**
 * POST /api/exit-formalities/:id/interview
 * Save exit interview
 */
router.post('/:id/interview', exitController.saveExitInterview);

/**
 * POST /api/exit-formalities/:id/documents
 * Add exit document
 */
router.post('/:id/documents', exitController.addExitDocument);

/**
 * GET /api/exit-formalities/:id/assets
 * Get asset recovery for exit request
 */
router.get('/:id/assets', exitController.getAssetRecovery);

/**
 * PUT /api/exit-formalities/:id/assets
 * Update asset recovery
 */
router.put('/:id/assets', exitController.updateAssetRecovery);

/**
 * GET /api/exit-formalities/:id/assets/handover
 * Get asset handover document
 */
router.get('/:id/assets/handover', exitController.getAssetHandover);

/**
 * POST /api/exit-formalities/:id/assets/handover
 * Generate asset handover document
 */
router.post('/:id/assets/handover', exitController.generateAssetHandover);

// ============================================
// DE-PROVISIONING (SYSTEM ACCESS)
// ============================================

/**
 * POST /api/exit-formalities/:id/deprovisioning/auto-revoke
 * Auto-revoke access on last working day
 * NOTE: This more specific route must come BEFORE the general /:id/deprovisioning route
 */
router.post('/:id/deprovisioning/auto-revoke', exitController.autoRevokeAccess);

/**
 * GET /api/exit-formalities/:id/deprovisioning
 * Get access de-provisioning checklist
 */
router.get('/:id/deprovisioning', exitController.getAccessDeprovisioning);

/**
 * PUT /api/exit-formalities/:id/deprovisioning
 * Update access de-provisioning
 */
router.put('/:id/deprovisioning', exitController.updateAccessDeprovisioning);

// ============================================
// EMPLOYEE DUES & FINAL SETTLEMENT
// ============================================

/**
 * GET /api/exit-formalities/:id/dues/payable
 * Get payable dues
 */
router.get('/:id/dues/payable', exitController.getPayableDues);

/**
 * POST /api/exit-formalities/:id/dues/payable
 * Add or update payable due
 */
router.post('/:id/dues/payable', exitController.upsertPayableDue);

/**
 * GET /api/exit-formalities/:id/dues/recoverable
 * Get recoverable dues
 */
router.get('/:id/dues/recoverable', exitController.getRecoverableDues);

/**
 * POST /api/exit-formalities/:id/dues/recoverable
 * Add or update recoverable due
 */
router.post('/:id/dues/recoverable', exitController.upsertRecoverableDue);

/**
 * POST /api/exit-formalities/:id/settlement/calculate
 * Calculate settlement
 */
router.post('/:id/settlement/calculate', settlementController.calculateSettlement);

/**
 * GET /api/exit-formalities/:id/settlement
 * Get settlement
 */
router.get('/:id/settlement', settlementController.getSettlement);

/**
 * PUT /api/exit-formalities/:id/settlement
 * Update settlement status
 */
router.put('/:id/settlement', settlementController.updateSettlementStatus);

/**
 * GET /api/exit-formalities/:id/settlement/pdf
 * Get settlement PDF data
 */
router.get('/:id/settlement/pdf', pdfController.getSettlementPDFData);

/**
 * GET /api/exit-formalities/:id/assets/handover/pdf
 * Get asset handover PDF data
 */
router.get('/:id/assets/handover/pdf', pdfController.getAssetHandoverPDFData);

/**
 * GET /api/exit-formalities/:id/experience-letter/pdf
 * Get experience letter PDF data
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/:id/experience-letter/pdf', pdfController.getExperienceLetterPDFData);

/**
 * GET /api/exit-formalities/:id/relieving-letter/pdf
 * Get relieving letter PDF data
 */
router.get('/:id/relieving-letter/pdf', pdfController.getRelievingLetterPDFData);

// ============================================
// PF, GRATUITY & COMPLIANCE
// ============================================

/**
 * GET /api/exit-formalities/:id/pf
 * Get PF management
 */
router.get('/:id/pf', exitController.getPFManagement);

/**
 * POST /api/exit-formalities/:id/pf/initiate
 * Initiate PF exit
 */
router.post('/:id/pf/initiate', exitController.initiatePFExit);

/**
 * GET /api/exit-formalities/:id/gratuity
 * Get gratuity
 */
router.get('/:id/gratuity', exitController.getGratuity);

/**
 * POST /api/exit-formalities/:id/gratuity/calculate
 * Calculate gratuity
 */
router.post('/:id/gratuity/calculate', exitController.calculateGratuity);

/**
 * GET /api/exit-formalities/:id/compliance
 * Get compliance checklist
 */
router.get('/:id/compliance', exitController.getComplianceChecklist);

/**
 * PUT /api/exit-formalities/:id/compliance
 * Update compliance item
 */
router.put('/:id/compliance', exitController.updateComplianceItem);

/**
 * GET /api/exit-formalities/:id/compliance/documents
 * Get compliance documents
 */
router.get('/:id/compliance/documents', exitController.getComplianceDocuments);

/**
 * POST /api/exit-formalities/:id/compliance/documents
 * Add compliance document
 */
router.post('/:id/compliance/documents', exitController.addComplianceDocument);

// ============================================
// SMART ADD-ONS
// ============================================

/**
 * GET /api/exit-formalities/:id/progress
 * Get exit progress percentage
 */
router.get('/:id/progress', exitController.getExitProgress);

/**
 * GET /api/exit-formalities/:id/reminders
 * Get reminders
 */
router.get('/:id/reminders', exitController.getReminders);

/**
 * POST /api/exit-formalities/:id/reminders
 * Create reminder
 */
router.post('/:id/reminders', exitController.createReminder);

/**
 * GET /api/exit-formalities/:id/risks
 * Get asset risks
 */
router.get('/:id/risks', exitController.getAssetRisks);

/**
 * POST /api/exit-formalities/:id/risks
 * Flag asset risk
 */
router.post('/:id/risks', exitController.flagAssetRisk);

/**
 * PUT /api/exit-formalities/risks/:risk-id/resolve
 * Resolve asset risk
 */
router.put('/risks/:risk-id/resolve', exitController.resolveAssetRisk);

/**
 * GET /api/exit-formalities/:id/reports
 * Get exit reports
 */
router.get('/:id/reports', exitController.getExitReports);

/**
 * POST /api/exit-formalities/:id/reports
 * Create exit report
 */
router.post('/:id/reports', exitController.createExitReport);

/**
 * GET /api/exit-formalities/:id/communications
 * Get exit communications
 */
router.get('/:id/communications', exitController.getExitCommunications);

/**
 * GET /api/exit-formalities/dashboard/metrics
 * Get exit dashboard metrics
 */
router.get('/dashboard/metrics', exitController.getExitDashboardMetrics);

// ============================================
// GENERAL ROUTES (must come AFTER specific routes)
// ============================================

/**
 * GET /api/exit-formalities/:id
 * Get single exit request with details
 */
router.get('/:id', exitController.getExitRequestById);

/**
 * PUT /api/exit-formalities/:id
 * Update exit request
 */
router.put('/:id', exitController.updateExitRequest);

/**
 * DELETE /api/exit-formalities/:id
 * Delete exit request (admin/HR only)
 */
router.delete('/:id', exitController.deleteExitRequest);

export default router;

