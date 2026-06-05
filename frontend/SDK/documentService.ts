import { api } from "@sdk/api";
import {
  EmployeeDocument,
  GetDocumentsResponse,
  UploadDocumentResponse,
  UpdateDocumentStatusResponse
} from "../features/profiles/types";

/**
 * Document Service
 * Handles all document-related API calls
 */

/**
 * Get all documents for an employee
 */
export const getEmployeeDocuments = async (employeeId: string): Promise<EmployeeDocument[]> => {
  try {
    const response = await api.get(`/profiles/${employeeId}/documents`) as GetDocumentsResponse;
    return response.documents || [];
  } catch (error) {
    console.error('Error fetching employee documents:', error);
    throw error;
  }
};

/**
 * Upload a document for an employee
 */
export const uploadDocument = async (
  employeeId: string,
  documentCategory: string,
  documentType: string,
  file: File
): Promise<EmployeeDocument> => {
  try {
    const formData = new FormData();
    formData.append('document_category', documentCategory);
    formData.append('document_type', documentType);
    formData.append('file', file);

    const response = await api.post(`/profiles/${employeeId}/documents`, formData) as UploadDocumentResponse;

    return response.document;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Update document verification status (HR only)
 */
export const updateDocumentStatus = async (
  documentId: string,
  status: 'approved' | 'rejected',
  remarks?: string
): Promise<EmployeeDocument> => {
  try {
    const response = await api.put(`/profiles/documents/${documentId}/status`, {
      verification_status: status,
      remarks
    }) as UpdateDocumentStatusResponse;

    return response.document;
  } catch (error) {
    console.error('Error updating document status:', error);
    throw error;
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    await api.delete(`/profiles/documents/${documentId}`);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Download a document
 */
export const downloadDocument = async (documentId: string): Promise<Blob> => {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const token = localStorage.getItem('auth_token');

    const res = await fetch(`${apiBase}/api/profiles/documents/${documentId}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) throw new Error('Failed to download document');
    const blob = await res.blob();
    return blob;
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

/**
 * Get document preview URL
 */
export const getDocumentPreviewUrl = (documentId: string): string => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase) throw new Error('VITE_API_BASE_URL is not set!');
  return `${apiBase}/api/profiles/documents/${documentId}/preview`;
};
