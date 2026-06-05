/**
 * Profiles Routes
 * Define API endpoints only
 * Wire middleware and controllers
 * NO business logic
 */

import express from 'express';
import { authenticate } from '../../../core/auth/authMiddleware.js';
import * as profilesController from '../controllers/profiles.controller.js';
import * as documentController from '../controllers/document.controller.js';
import * as extractionController from '../controllers/profile-extraction.controller.js';
import * as templateController from '../controllers/template.controller.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware.js';

const router = express.Router();

// Diagnostic middleware: log when requests reach the profiles router
router.use((req, res, next) => {
  console.log(`[profiles.router] Entered router: ${req.method} ${req.path}`);
  next();
});

// All routes require authentication EXCEPT profile extraction routes
router.use((req, res, next) => {
  // Skip authentication for profile extraction routes
  if (req.path.startsWith('/extract') || req.path.startsWith('/template') || req.path === '/save-edited') {
    return next();
  }
  authenticate(req, res, next);
});

/**
 * GET /api/profiles
 * Get all employee profiles
 */
router.get('/', profilesController.getAllProfiles);

/**
 * GET /api/profiles/template/download
 * Download employee profile upload template
 * NOTE: Must be before /:id route to avoid route conflict
 */
router.get('/template/download', templateController.downloadTemplate);

/**
 * POST /api/profiles/extract
 * Extract profile from uploaded file (single file)
 */
router.post('/extract', uploadSingle, extractionController.extractProfile);

/**
 * POST /api/profiles/extract/batch
 * Extract profiles from multiple uploaded files
 */
router.post('/extract/batch', uploadMultiple, extractionController.extractProfilesBatch);

/**
 * POST /api/profiles/save-edited
 * Save edited profile data
 */
router.post('/save-edited', extractionController.saveEditedProfile);

/**
 * POST /api/profiles/upload-batch
 * Upload and save multiple profiles from Excel/CSV file
 */
router.post('/upload-batch', uploadSingle, extractionController.uploadBatchProfiles);

/**
 * POST /api/profiles/upload-document
 * Upload a single document (simplified endpoint)
 */
router.post('/upload-document', uploadSingle, documentController.uploadDocumentSimplified);

/**
 * GET /api/profiles/categories
 * Get document categories and types
 */
router.get('/categories', documentController.getDocumentCategories);

/**
 * GET /api/profiles/documents/status/:status
 * Get documents by verification status (admin only)
 */
router.get('/documents/status/:status', documentController.getDocumentsByStatus);

/**
 * GET /api/profiles/documents/all
 * Get all documents (admin only)
 */
router.get('/documents/all', documentController.getAllDocuments);

/**
 * GET /api/profiles/:id/documents
 * Get all documents for an employee
 */
router.get('/:id/documents', documentController.getEmployeeDocuments);

/**
 * GET /api/profiles/:id/documents/category/:category
 * Get documents by category for an employee
 */
router.get('/:id/documents/category/:category', documentController.getEmployeeDocumentsByCategory);

/**
 * POST /api/profiles/:id/documents
 * Upload a new document for an employee
 */
router.post('/:id/documents', uploadSingle, documentController.uploadDocument);

/**
 * GET /api/profiles/documents/:docId
 * Get document by ID
 */
router.get('/documents/:docId', documentController.getDocumentById);

/**
 * PUT /api/profiles/documents/:docId/status
 * Update document verification status
 */
router.put('/documents/:docId/status', documentController.updateDocumentStatus);

/**
 * DELETE /api/profiles/documents/:docId
 * Delete document
 */
router.delete('/documents/:docId', documentController.deleteDocument);

/**
 * GET /api/profiles/documents/:docId/download
 * Download document
 */
router.get('/documents/:docId/download', documentController.downloadDocument);

/**
 * GET /api/profiles/documents/:docId/preview
 * Get document preview
 */
router.get('/documents/:docId/preview', documentController.getDocumentPreview);

/**
 * GET /api/profiles/:id
 * Get single employee profile
 * NOTE: Must be after specific routes to avoid conflicts
 */
router.get('/:id', profilesController.getProfileById);

/**
 * PUT /api/profiles/:id
 * Update employee profile
 */
router.put('/:id', profilesController.updateProfile);

/**
 * DELETE /api/profiles/:id
 * Delete employee profile (owner or admin)
 */
router.delete('/:id', profilesController.deleteProfile);

export default router;

