/**
 * Exit Formalities Service
 * Main service file - re-exports from specialized services
 * HTTP calls to backend
 * Feature-prefixed endpoints
 * Typed responses
 */

// Re-export all services from specialized modules
export * from './exit-requestService';
export * from './exit-assetService';
export * from './exit-settlementService';
export * from './exit-deprovisioningService';
export * from './exit-complianceService';
export * from './exit-pdfService';
export * from './exit-smartService';

