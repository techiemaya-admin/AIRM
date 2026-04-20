/**
 * Document Controller
 * Handles HTTP requests and responses for document operations
 */

import * as documentService from '../services/document.service.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getFileFromGCS } from '../../../SDK/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all documents for an employee
 */
export async function getEmployeeDocuments(req, res) {
  try {
    const { id: employeeId } = req.params;
    const documents = await documentService.getEmployeeDocuments(employeeId);

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('[document.controller] Error in getEmployeeDocuments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch employee documents'
    });
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(req, res) {
  try {
    const { docId } = req.params;
    const document = await documentService.getDocumentById(docId);

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('[document.controller] Error in getDocumentById:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch document'
    });
  }
}

/**
 * Upload a new document
 */
export async function uploadDocument(req, res) {
  try {
    const { id: employeeId } = req.params;
    const { document_category, document_type } = req.body;
    const uploadedBy = req.user?.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!document_category || !document_type) {
      return res.status(400).json({
        success: false,
        error: 'Document category and type are required'
      });
    }

    const document = await documentService.uploadDocument(
      employeeId,
      document_category,
      document_type,
      req.file,
      uploadedBy
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('[document.controller] Error in uploadDocument:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload document'
    });
  }
}

/**
 * Update document verification status
 */
export async function updateDocumentStatus(req, res) {
  try {
    const { docId } = req.params;
    const { verification_status, remarks } = req.body;
    const updatedBy = req.user?.id;

    if (!verification_status) {
      return res.status(400).json({
        success: false,
        error: 'Verification status is required'
      });
    }

    const document = await documentService.updateDocumentStatus(
      docId,
      verification_status,
      remarks,
      updatedBy
    );

    res.json({
      success: true,
      message: 'Document status updated successfully',
      document
    });
  } catch (error) {
    console.error('[document.controller] Error in updateDocumentStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update document status'
    });
  }
}

/**
 * Delete document
 */
export async function deleteDocument(req, res) {
  try {
    const { docId } = req.params;

    const document = await documentService.deleteDocument(docId);

    res.json({
      success: true,
      message: 'Document deleted successfully',
      document
    });
  } catch (error) {
    console.error('[document.controller] Error in deleteDocument:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete document'
    });
  }
}

/**
 * Get documents by verification status (admin only)
 */
export async function getDocumentsByStatus(req, res) {
  try {
    const { status } = req.params;

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be pending, approved, or rejected'
      });
    }

    const documents = await documentService.getDocumentsByStatus(status);

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('[document.controller] Error in getDocumentsByStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch documents by status'
    });
  }
}

/**
 * Get all documents (admin view)
 */
export async function getAllDocuments(req, res) {
  try {
    const documents = await documentService.getAllDocuments();

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('[document.controller] Error in getAllDocuments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch all documents'
    });
  }
}

/**
 * Get documents by category for an employee
 */
export async function getEmployeeDocumentsByCategory(req, res) {
  try {
    const { id: employeeId, category } = req.params;

    const documents = await documentService.getEmployeeDocumentsByCategory(employeeId, category);

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('[document.controller] Error in getEmployeeDocumentsByCategory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch documents by category'
    });
  }
}

/**
 * Get document categories and types
 */
export async function getDocumentCategories(req, res) {
  try {
    const categories = documentService.getDocumentCategories();

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('[document.controller] Error in getDocumentCategories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch document categories'
    });
  }
}

/**
 * Download document
 */
export async function downloadDocument(req, res) {
  try {
    const { docId } = req.params;

    const document = await documentService.getDocumentById(docId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Type', document.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);

    // Stream the file
    if (document.file_path && document.file_path.startsWith('https://storage.googleapis.com')) {
      // It's a GCS file
      try {
        const file = getFileFromGCS(document.file_path);
        const fileStream = file.createReadStream();

        fileStream.on('error', (err) => {
          console.error('[document.controller] GCS Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Failed to stream from Cloud Storage' });
          } else {
            res.end();
          }
        });

        fileStream.pipe(res);
      } catch (gcsError) {
        console.error('[document.controller] GCS error:', gcsError);
        return res.status(500).json({ success: false, error: 'Invalid Cloud Storage URL' });
      }
    } else {
      // It's a local fallback file
      const baseDir = process.env.K_SERVICE ? '/tmp' : path.join(__dirname, '../../../');
      const filePath = path.join(baseDir, document.file_path);
      const fileStream = fs.createReadStream(filePath);

      fileStream.on('error', (err) => {
        console.error('[document.controller] Local Stream error:', err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: 'File not found locally' });
        } else {
          res.end();
        }
      });

      fileStream.pipe(res);
    }

  } catch (error) {
    console.error('[document.controller] Error in downloadDocument:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download document'
    });
  }
}

/**
 * Get document preview URL
 */
export async function getDocumentPreview(req, res) {
  try {
    const { docId } = req.params;

    const document = await documentService.getDocumentById(docId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // For security, only allow preview for certain file types
    const allowedPreviewTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedPreviewTypes.includes(document.file_type)) {
      return res.status(400).json({
        success: false,
        error: 'Preview not available for this file type'
      });
    }

    // Return the file path for frontend to handle
    res.json({
      success: true,
      previewUrl: document.file_path,
      fileType: document.file_type
    });

  } catch (error) {
    console.error('[document.controller] Error in getDocumentPreview:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get document preview'
    });
  }
}

/**
 * Upload a document (simplified endpoint)
 * Accepts user_id, type, and file in the request body
 */
export async function uploadDocumentSimplified(req, res) {
  try {
    const { user_id, type } = req.body;
    const uploadedBy = req.user?.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!user_id || !type) {
      return res.status(400).json({
        success: false,
        error: 'user_id and type are required'
      });
    }

    // Map type to category and document type
    const documentCategory = 'employee_documents';
    const documentType = type;

    const document = await documentService.uploadDocument(
      user_id,
      documentCategory,
      documentType,
      req.file,
      uploadedBy || user_id
    );

    res.status(201).json({
      success: true,
      message: `${type} uploaded successfully`,
      document
    });
  } catch (error) {
    console.error('[document.controller] Error in uploadDocumentSimplified:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload document'
    });
  }
}
