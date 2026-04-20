/**
 * Document Service
 * Business logic for document operations
 */

import * as documentModel from '../models/document.pg.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { uploadFileToGCS, deleteFileFromGCS } from '../../../SDK/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all documents for an employee
 */
export async function getEmployeeDocuments(employeeId) {
  try {
    const documents = await documentModel.getEmployeeDocuments(employeeId);
    return documents;
  } catch (error) {
    console.error('[document.service] Error in getEmployeeDocuments:', error);
    throw error;
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId) {
  try {
    const document = await documentModel.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  } catch (error) {
    console.error('[document.service] Error in getDocumentById:', error);
    throw error;
  }
}

/**
 * Upload a new document — saves to GCP Cloud Storage bucket
 */
export async function uploadDocument(employeeId, documentCategory, documentType, fileData, uploadedBy) {
  try {
    // Validate file type and size
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(fileData.mimetype)) {
      throw new Error('Invalid file type. Only PDF, JPG, PNG, DOC, DOCX are allowed.');
    }

    if (fileData.size > maxSize) {
      throw new Error('File size exceeds 10MB limit.');
    }

    // Upload to Google Cloud Storage
    const publicUrl = await uploadFileToGCS(fileData.buffer, fileData.originalname, fileData.mimetype, 'documents');

    // Create document record in database
    const documentData = {
      employee_id: employeeId,
      document_category: documentCategory,
      document_type: documentType,
      file_name: fileData.originalname,
      file_path: publicUrl,
      file_type: fileData.mimetype,
      uploaded_by: uploadedBy
    };

    const document = await documentModel.createDocument(documentData);
    return document;
  } catch (error) {
    console.error('[document.service] Error in uploadDocument:', error);
    throw error;
  }
}

/**
 * Update document verification status
 */
export async function updateDocumentStatus(documentId, verificationStatus, remarks = null, updatedBy = null) {
  try {
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(verificationStatus)) {
      throw new Error('Invalid verification status');
    }

    const document = await documentModel.updateDocumentStatus(documentId, verificationStatus, remarks);
    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  } catch (error) {
    console.error('[document.service] Error in updateDocumentStatus:', error);
    throw error;
  }
}

/**
 * Delete document — removes from GCS if it's a GCS URL, otherwise from local disk
 */
export async function deleteDocument(documentId) {
  try {
    const document = await documentModel.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete file from GCS or local filesystem
    if (document.file_path) {
      if (document.file_path.startsWith('https://storage.googleapis.com')) {
        await deleteFileFromGCS(document.file_path);
      } else {
        const baseDir = process.env.K_SERVICE ? '/tmp' : path.join(__dirname, '../../../');
        const fullPath = path.join(baseDir, document.file_path);
        try {
          await fs.unlink(fullPath);
        } catch (fileError) {
          console.warn('[document.service] Could not delete local file:', fileError);
        }
      }
    }

    // Delete from database
    const deletedDocument = await documentModel.deleteDocument(documentId);
    return deletedDocument;
  } catch (error) {
    console.error('[document.service] Error in deleteDocument:', error);
    throw error;
  }
}

/**
 * Get documents by verification status
 */
export async function getDocumentsByStatus(verificationStatus) {
  try {
    const documents = await documentModel.getDocumentsByStatus(verificationStatus);
    return documents;
  } catch (error) {
    console.error('[document.service] Error in getDocumentsByStatus:', error);
    throw error;
  }
}

/**
 * Get all documents (admin view)
 */
export async function getAllDocuments() {
  try {
    const documents = await documentModel.getAllDocuments();
    return documents;
  } catch (error) {
    console.error('[document.service] Error in getAllDocuments:', error);
    throw error;
  }
}

/**
 * Get documents by category for an employee
 */
export async function getEmployeeDocumentsByCategory(employeeId, category) {
  try {
    const documents = await documentModel.getEmployeeDocumentsByCategory(employeeId, category);
    return documents;
  } catch (error) {
    console.error('[document.service] Error in getEmployeeDocumentsByCategory:', error);
    throw error;
  }
}

/**
 * Get document categories and types
 */
export function getDocumentCategories() {
  return {
    'Personal': ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving License', 'Voter ID', 'Birth Certificate'],
    'Employment': ['Offer Letter', 'Appointment Letter', 'Experience Letter', 'Relieving Letter', 'Salary Slip', 'Form 16'],
    'Education': ['Degree Certificate', 'Mark Sheets', 'Diploma', 'Course Completion Certificate'],
    'Financial': ['Bank Statement', 'Salary Account Details', 'Investment Proof', 'Tax Documents'],
    'Medical': ['Medical Certificate', 'Health Insurance', 'Fitness Certificate'],
    'Other': ['Address Proof', 'Reference Letter', 'Background Verification', 'Police Clearance']
  };
}
