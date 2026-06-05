/**
 * Time Clock Model
 * PostgreSQL queries for time clock operations
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get active time clock entry
 */
export async function getActiveEntry(userId) {
  const result = await pool.query(
    `SELECT * FROM time_clock 
     WHERE user_id = $1 AND status IN ('clocked_in', 'paused')
     ORDER BY clock_in DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Create clock-in entry
 */
export async function createClockIn(userId, issueId, projectName, latitude, longitude, locationAddress) {
  const result = await pool.query(
    `INSERT INTO time_clock (
      id, user_id, issue_id, project_name, status,
      latitude, longitude, location_address, location_timestamp
    )
    VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *`,
    [
      userId,
      issueId || null,
      projectName || null,
      'clocked_in',
      latitude || null,
      longitude || null,
      locationAddress || null,
    ]
  );
  return result.rows[0];
}

/**
 * Update clock-out
 */
export async function updateClockOut(entryId, clockOutTime, totalHours) {
  const result = await pool.query(
    `UPDATE time_clock 
     SET clock_out = $1,
         total_hours = $2,
         status = 'clocked_out',
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [clockOutTime, totalHours, entryId]
  );
  return result.rows[0];
}

/**
 * Pause time entry
 */
export async function pauseEntry(entryId, reason) {
  const result = await pool.query(
    `UPDATE time_clock 
     SET status = 'paused',
         pause_start = NOW(),
         pause_reason = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [reason || null, entryId]
  );
  return result.rows[0];
}

/**
 * Resume time entry
 */
export async function resumeEntry(entryId, totalPausedHours) {
  const result = await pool.query(
    `UPDATE time_clock 
     SET status = 'clocked_in',
         paused_duration = $1,
         pause_start = NULL,
         pause_reason = NULL,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [totalPausedHours, entryId]
  );
  return result.rows[0];
}

/**
 * Get current entry with issue details
 */
export async function getCurrentEntry(userId) {
  const result = await pool.query(
    `SELECT 
      tc.*,
      i.title as issue_title,
      i.project_name as issue_project
     FROM time_clock tc
     LEFT JOIN issues i ON tc.issue_id = i.id
     WHERE tc.user_id = $1 AND tc.status IN ('clocked_in', 'paused')
     ORDER BY tc.clock_in DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Get time clock entries with filters
 */
export async function getTimeClockEntries(userId, isAdmin, filters) {
  const { start_date, end_date, status, limit = 100 } = filters;

  let query = `
    SELECT 
      tc.*,
      i.title as issue_title,
      i.project_name as issue_project,
      u.email as user_email
    FROM time_clock tc
    LEFT JOIN issues i ON tc.issue_id = i.id
    LEFT JOIN users u ON tc.user_id = u.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidUserId = filters.user_id && uuidRegex.test(filters.user_id);

  if (isAdmin && isValidUserId) {
    query += ` AND tc.user_id = $${paramCount++}`;
    params.push(filters.user_id);
  } else if (!isAdmin) {
    query += ` AND tc.user_id = $${paramCount++}`;
    params.push(userId);
  }

  if (start_date) {
    query += ` AND tc.clock_in >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND tc.clock_in <= $${paramCount++}`;
    params.push(end_date);
  }

  if (status) {
    query += ` AND tc.status = $${paramCount++}`;
    params.push(status);
  }

  query += ` ORDER BY tc.clock_in DESC LIMIT $${paramCount++}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get all active entries (admin only)
 */
export async function getAllActiveEntries() {
  const result = await pool.query(
    `SELECT 
      tc.*,
      i.title as issue_title,
      i.project_name as issue_project,
      u.email as user_email,
      COALESCE(u.full_name, '') as user_full_name
    FROM time_clock tc
    LEFT JOIN issues i ON tc.issue_id = i.id
    LEFT JOIN users u ON tc.user_id = u.id
    WHERE tc.status IN ('clocked_in', 'paused')
    ORDER BY tc.clock_in DESC`
  );
  return result.rows;
}

