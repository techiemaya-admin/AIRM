/**
 * PF Details Model
 * PostgreSQL queries for PF details only
 * NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get PF details for user
 */
export async function getPfDetails(userId) {
  const result = await pool.query(
    `SELECT 
      pf.*,
      u.email,
      u.full_name,
      upd.full_name as updated_by_name
    FROM pf_details pf
    LEFT JOIN users u ON pf.user_id = u.id
    LEFT JOIN users upd ON pf.updated_by = upd.id
    WHERE pf.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update PF details
 */
export async function upsertPfDetails(pfData) {
  const {
    user_id,
    uan_number,
    pf_account_number,
    enrollment_date,
    status,
    employee_contribution_percent,
    employer_contribution_percent,
    pf_base_salary,
    notes,
    updated_by
  } = pfData;

  const result = await pool.query(
    `INSERT INTO pf_details (
      user_id, uan_number, pf_account_number, enrollment_date, status,
      employee_contribution_percent, employer_contribution_percent, pf_base_salary, notes, updated_by, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      uan_number = COALESCE(EXCLUDED.uan_number, pf_details.uan_number),
      pf_account_number = COALESCE(EXCLUDED.pf_account_number, pf_details.pf_account_number),
      enrollment_date = COALESCE(EXCLUDED.enrollment_date, pf_details.enrollment_date),
      status = COALESCE(EXCLUDED.status, pf_details.status),
      employee_contribution_percent = COALESCE(EXCLUDED.employee_contribution_percent, pf_details.employee_contribution_percent),
      employer_contribution_percent = COALESCE(EXCLUDED.employer_contribution_percent, pf_details.employer_contribution_percent),
      pf_base_salary = COALESCE(EXCLUDED.pf_base_salary, pf_details.pf_base_salary),
      notes = COALESCE(EXCLUDED.notes, pf_details.notes),
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING *`,
    [
      user_id,
      uan_number || null,
      pf_account_number || null,
      enrollment_date || null,
      status || 'active',
      employee_contribution_percent || 12.00,
      employer_contribution_percent || 12.00,
      pf_base_salary || null,
      notes || null,
      updated_by || null
    ]
  );
  return result.rows[0];
}

