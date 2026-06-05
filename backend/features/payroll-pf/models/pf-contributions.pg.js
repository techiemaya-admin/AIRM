/**
 * PF Contributions Model
 * PostgreSQL queries for PF contributions only
 * NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get PF contributions
 */
export async function getPfContributions(filters = {}) {
  let query = `
    SELECT 
      pfc.*,
      u.email,
      u.full_name,
      pf.uan_number
    FROM pf_contributions pfc
    LEFT JOIN users u ON pfc.user_id = u.id
    LEFT JOIN pf_details pf ON pfc.pf_detail_id = pf.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.user_id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(filters.user_id)) {
      query += ` AND pfc.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }
  }

  if (filters.month) {
    query += ` AND pfc.month = $${paramCount}`;
    params.push(filters.month);
    paramCount++;
  }

  if (filters.year) {
    query += ` AND pfc.year = $${paramCount}`;
    params.push(filters.year);
    paramCount++;
  }

  query += ` ORDER BY pfc.year DESC, pfc.month DESC, pfc.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Create PF contribution
 */
export async function createPfContribution(contributionData) {
  const {
    user_id,
    pf_detail_id,
    month,
    year,
    basic_salary,
    employee_contribution,
    employer_contribution,
    total_contribution,
    payslip_id,
    contribution_date,
    status,
    remarks
  } = contributionData;

  const result = await pool.query(
    `INSERT INTO pf_contributions (
      user_id, pf_detail_id, month, year, basic_salary,
      employee_contribution, employer_contribution, total_contribution,
      payslip_id, contribution_date, status, remarks
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (user_id, month, year) DO UPDATE SET
      basic_salary = EXCLUDED.basic_salary,
      employee_contribution = EXCLUDED.employee_contribution,
      employer_contribution = EXCLUDED.employer_contribution,
      total_contribution = EXCLUDED.total_contribution,
      payslip_id = EXCLUDED.payslip_id,
      contribution_date = EXCLUDED.contribution_date,
      status = EXCLUDED.status,
      remarks = EXCLUDED.remarks,
      updated_at = NOW()
    RETURNING *`,
    [
      user_id,
      pf_detail_id,
      month,
      year,
      basic_salary,
      employee_contribution || 0,
      employer_contribution || 0,
      total_contribution || 0,
      payslip_id || null,
      contribution_date || null,
      status || 'pending',
      remarks || null
    ]
  );
  return result.rows[0];
}

