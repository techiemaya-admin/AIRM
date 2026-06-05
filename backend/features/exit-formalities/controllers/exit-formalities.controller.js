/**
 * Exit Formalities Controller - Barrel Export
 * Re-exports all controller functions from split controller files
 * This maintains backward compatibility for existing imports
 */

// Exit Request operations
export {
  getAllExitRequests,
  getExitRequestById,
  createExitRequest,
  updateExitRequest,
  approveExitRequest,
  updateClearance,
  completeExit,
  saveExitInterview,
  addExitDocument,
  deleteExitRequest
} from './exit-request.controller.js';

// Asset Recovery operations
export {
  getEmployeeAssets,
  createEmployeeAsset,
  getAssetRecovery,
  updateAssetRecovery,
  getAssetHandover,
  generateAssetHandover
} from './asset-recovery.controller.js';

// Deprovisioning operations
export {
  getAccessDeprovisioning,
  updateAccessDeprovisioning,
  autoRevokeAccess
} from './deprovisioning.controller.js';

// Dues operations
export {
  getPayableDues,
  upsertPayableDue,
  getRecoverableDues,
  upsertRecoverableDue
} from './dues-settlement.controller.js';

// PF & Compliance operations
export {
  getPFManagement,
  initiatePFExit,
  getGratuity,
  calculateGratuity,
  getComplianceChecklist,
  updateComplianceItem,
  getComplianceDocuments,
  addComplianceDocument
} from './pf-compliance.controller.js';

// Smart Add-ons operations
export {
  getExitProgress,
  getReminders,
  createReminder,
  getAssetRisks,
  flagAssetRisk,
  resolveAssetRisk,
  getExitReports,
  createExitReport,
  getExitCommunications,
  getExitDashboardMetrics
} from './smart-addons.controller.js';
