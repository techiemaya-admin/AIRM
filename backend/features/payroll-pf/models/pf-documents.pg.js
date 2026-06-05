/**
 * PF Documents Model
 * PostgreSQL queries for PF documents only
 * NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get PF documents
 */
export async function getPfDocuments(filters = {}) {
  let query = `
    SELECT 
      pfd.*,
      u.email,
      u.full_name,
      upd.full_name as uploaded_by_name
    FROM pf_documents pfd
    LEFT JOIN users u ON pfd.user_id = u.id
    LEFT JOIN users upd ON pfd.uploaded_by = upd.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.user_id) {
    query += ` AND pfd.user_id = $${paramCount}`;
    params.push(filters.user_id);
    paramCount++;
  }

  if (filters.document_type) {
    query += ` AND pfd.document_type = $${paramCount}`;
    params.push(filters.document_type);
    paramCount++;
  }

  query += ` ORDER BY pfd.uploaded_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Add PF document
 */
export async function addPfDocument(documentData) {
  const {
    user_id,
    pf_detail_id,
    document_type,
    document_name,
    document_url,
    uploaded_by
  } = documentData;

  const result = await pool.query(
    `INSERT INTO pf_documents (
      user_id, pf_detail_id, document_type, document_name, document_url, uploaded_by
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [user_id, pf_detail_id || null, document_type, document_name, document_url, uploaded_by || null]
  );
  return result.rows[0];
}

