/**
 * Document Model
 * PostgreSQL queries only - NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Ensure the employee_documents table exists
 */
async function ensureTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_category VARCHAR(100),
      document_type VARCHAR(100),
      file_name VARCHAR(255),
      file_path TEXT,
      file_type VARCHAR(100),
      uploaded_at TIMESTAMPTZ DEFAULT now(),
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      verification_status VARCHAR(50) DEFAULT 'pending',
      remarks TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

/**
 * Get all documents for an employee
 */
export async function getEmployeeDocuments(employeeId) {
  try {
    await ensureTableExists();
    const result = await pool.query(
      `SELECT
        d.id,
        d.employee_id,
        d.document_category,
        d.document_type,
        d.file_name,
        d.file_path,
        d.file_type,
        d.uploaded_at,
        d.uploaded_by,
        d.verification_status,
        d.remarks,
        d.created_at,
        d.updated_at,
        u.email as uploaded_by_email,
        u.full_name as uploaded_by_name
      FROM employee_documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.employee_id = $1
      ORDER BY d.created_at DESC`,
      [employeeId]
    );
    return result.rows;
  } catch (error) {
    console.error('[document] Error in getEmployeeDocuments model:', error);
    return []; // Return empty array instead of crashing
  }
}


/**
 * Get document by ID
 */
export async function getDocumentById(documentId) {
  const result = await pool.query(
    `SELECT
      d.id,
      d.employee_id,
      d.document_category,
      d.document_type,
      d.file_name,
      d.file_path,
      d.file_type,
      d.uploaded_at,
      d.uploaded_by,
      d.verification_status,
      d.remarks,
      d.created_at,
      d.updated_at,
      u.email as uploaded_by_email,
      u.full_name as uploaded_by_name
    FROM employee_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = $1`,
    [documentId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new document record
 */
export async function createDocument(documentData) {
  const {
    employee_id,
    document_category,
    document_type,
    file_name,
    file_path,
    file_type,
    uploaded_by
  } = documentData;

  const result = await pool.query(
    `INSERT INTO employee_documents (
      employee_id,
      document_category,
      document_type,
      file_name,
      file_path,
      file_type,
      uploaded_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      employee_id,
      document_category,
      document_type,
      file_name,
      file_path,
      file_type,
      uploaded_by
    ]
  );
  return result.rows[0];
}

/**
 * Update document verification status
 */
export async function updateDocumentStatus(documentId, verificationStatus, remarks = null) {
  const result = await pool.query(
    `UPDATE employee_documents
     SET verification_status = $1,
         remarks = $2,
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [verificationStatus, remarks, documentId]
  );
  return result.rows[0] || null;
}

/**
 * Delete document by ID
 */
export async function deleteDocument(documentId) {
  const result = await pool.query(
    'DELETE FROM employee_documents WHERE id = $1 RETURNING *',
    [documentId]
  );
  return result.rows[0] || null;
}

/**
 * Get documents by verification status
 */
export async function getDocumentsByStatus(verificationStatus) {
  const result = await pool.query(
    `SELECT
      d.id,
      d.employee_id,
      d.document_category,
      d.document_type,
      d.file_name,
      d.file_path,
      d.file_type,
      d.uploaded_at,
      d.uploaded_by,
      d.verification_status,
      d.remarks,
      d.created_at,
      d.updated_at,
      u.email as employee_email,
      u.full_name as employee_name,
      up.email as uploaded_by_email,
      up.full_name as uploaded_by_name
    FROM employee_documents d
    LEFT JOIN users u ON d.employee_id = u.id
    LEFT JOIN users up ON d.uploaded_by = up.id
    WHERE d.verification_status = $1
    ORDER BY d.created_at DESC`,
    [verificationStatus]
  );
  return result.rows;
}

/**
 * Get all documents (for admin view)
 */
export async function getAllDocuments() {
  const result = await pool.query(
    `SELECT
      d.id,
      d.employee_id,
      d.document_category,
      d.document_type,
      d.file_name,
      d.file_path,
      d.file_type,
      d.uploaded_at,
      d.uploaded_by,
      d.verification_status,
      d.remarks,
      d.created_at,
      d.updated_at,
      u.email as employee_email,
      u.full_name as employee_name,
      up.email as uploaded_by_email,
      up.full_name as uploaded_by_name
    FROM employee_documents d
    LEFT JOIN users u ON d.employee_id = u.id
    LEFT JOIN users up ON d.uploaded_by = up.id
    ORDER BY d.created_at DESC`
  );
  return result.rows;
}

/**
 * Check if document exists
 */
export async function documentExists(documentId) {
  const result = await pool.query(
    'SELECT id FROM employee_documents WHERE id = $1',
    [documentId]
  );
  return result.rows.length > 0;
}

/**
 * Get documents by category for an employee
 */
export async function getEmployeeDocumentsByCategory(employeeId, category) {
  const result = await pool.query(
    `SELECT
      d.id,
      d.employee_id,
      d.document_category,
      d.document_type,
      d.file_name,
      d.file_path,
      d.file_type,
      d.uploaded_at,
      d.uploaded_by,
      d.verification_status,
      d.remarks,
      d.created_at,
      d.updated_at,
      u.email as uploaded_by_email,
      u.full_name as uploaded_by_name
    FROM employee_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.employee_id = $1 AND d.document_category = $2
    ORDER BY d.created_at DESC`,
    [employeeId, category]
  );
  return result.rows;
}
