/**
 * Payroll Audit Log Model
 * PostgreSQL queries for audit log only
 * NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Add payroll audit log entry
 */
export async function addPayrollAuditLog(auditData) {
  const {
    user_id,
    action,
    entity_type,
    entity_id,
    performed_by,
    details,
    ip_address
  } = auditData;

  const result = await pool.query(
    `INSERT INTO payroll_audit_log (
      user_id, action, entity_type, entity_id, performed_by, details, ip_address
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      user_id || null,
      action,
      entity_type,
      entity_id || null,
      performed_by || null,
      details ? JSON.stringify(details) : null,
      ip_address || null
    ]
  );
  return result.rows[0];
}

/**
 * Get payroll audit log
 */
export async function getPayrollAuditLog(filters = {}) {
  let query = `
    SELECT 
      pal.*,
      u.email,
      u.full_name as user_name,
      pb.full_name as performed_by_name
    FROM payroll_audit_log pal
    LEFT JOIN users u ON pal.user_id = u.id
    LEFT JOIN users pb ON pal.performed_by = pb.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.user_id) {
    query += ` AND pal.user_id = $${paramCount}`;
    params.push(filters.user_id);
    paramCount++;
  }

  if (filters.action) {
    query += ` AND pal.action = $${paramCount}`;
    params.push(filters.action);
    paramCount++;
  }

  if (filters.entity_type) {
    query += ` AND pal.entity_type = $${paramCount}`;
    params.push(filters.entity_type);
    paramCount++;
  }

  query += ` ORDER BY pal.created_at DESC LIMIT ${filters.limit || 100}`;

  const result = await pool.query(query, params);
  return result.rows.map(row => ({
    ...row,
    details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null
  }));
}

