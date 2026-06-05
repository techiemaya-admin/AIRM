/**
 * Timesheet Model
 * PostgreSQL queries for timesheet operations
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get timesheet by user and week
 */
export async function getTimesheetByWeek(userId, weekStart) {
  const result = await pool.query(
    `SELECT id FROM timesheets 
     WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)
     LIMIT 1`,
    [userId, weekStart]
  );
  return result.rows[0] || null;
}

/**
 * Create timesheet
 */
export async function createTimesheet(userId, weekStart, weekEnd) {
  const result = await pool.query(
    `INSERT INTO timesheets (id, user_id, week_start, week_end, status)
     VALUES (gen_random_uuid(), $1, $2, $3, 'draft')
     RETURNING id`,
    [userId, weekStart, weekEnd]
  );
  return result.rows[0].id;
}

/**
 * Get timesheets with filters
 */
export async function getTimesheets(userId, weekStart) {
  let query = `
    SELECT 
      t.id,
      t.user_id,
      t.week_start,
      t.week_end,
      t.status,
      t.created_at,
      t.updated_at
    FROM timesheets t
    WHERE t.user_id = $1
  `;

  const params = [userId];

  if (weekStart) {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEndStr = weekEndDate.toISOString().split('T')[0];

    query += ` AND (
      CAST(t.week_start AS DATE) = CAST($2 AS DATE) OR
      (CAST(t.week_start AS DATE) <= CAST($3 AS DATE) AND CAST(t.week_end AS DATE) >= CAST($2 AS DATE))
    )`;
    params.push(weekStart, weekEndStr);
  }

  query += ` ORDER BY t.week_start DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get timesheet entries
 */
export async function getTimesheetEntries(timesheetId) {
  const result = await pool.query(
    `SELECT 
      id,
      project,
      task,
      mon_hours,
      tue_hours,
      wed_hours,
      thu_hours,
      fri_hours,
      sat_hours,
      sun_hours,
      source
    FROM timesheet_entries
    WHERE timesheet_id = $1
    ORDER BY created_at ASC`,
    [timesheetId]
  );
  return result.rows;
}

/**
 * Get timesheet by ID with entries
 */
export async function getTimesheetById(timesheetId) {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      json_agg(
        jsonb_build_object(
          'id', te.id,
          'project', te.project,
          'task', te.task,
          'mon_hours', te.mon_hours,
          'tue_hours', te.tue_hours,
          'wed_hours', te.wed_hours,
          'thu_hours', te.thu_hours,
          'fri_hours', te.fri_hours,
          'sat_hours', te.sat_hours,
          'sun_hours', te.sun_hours,
          'source', te.source
        )
      ) FILTER (WHERE te.id IS NOT NULL) as entries
    FROM timesheets t
    LEFT JOIN timesheet_entries te ON t.id = te.timesheet_id
    WHERE t.id = $1
    GROUP BY t.id
    `,
    [timesheetId]
  );
  return result.rows[0] || null;
}

/**
 * Delete manual entries from timesheet
 */
export async function deleteManualEntries(timesheetId) {
  await pool.query(
    `DELETE FROM timesheet_entries 
     WHERE timesheet_id = $1 AND source = 'manual'`,
    [timesheetId]
  );
}

/**
 * Create timesheet entry
 */
export async function createTimesheetEntry(timesheetId, entry) {
  const result = await pool.query(
    `INSERT INTO timesheet_entries (
      id, timesheet_id, project, task, source,
      mon_hours, tue_hours, wed_hours, thu_hours,
      fri_hours, sat_hours, sun_hours,
      created_at, updated_at
    ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    RETURNING id`,
    [
      timesheetId,
      entry.project.trim(),
      entry.task.trim(),
      'manual',
      entry.mon_hours || 0,
      entry.tue_hours || 0,
      entry.wed_hours || 0,
      entry.thu_hours || 0,
      entry.fri_hours || 0,
      entry.sat_hours || 0,
      entry.sun_hours || 0,
    ]
  );
  return result.rows[0].id;
}

/**
 * Get or create timesheet entry for time clock
 */
export async function getOrCreateTimeClockEntry(timesheetId, project, task) {
  const result = await pool.query(
    `SELECT id, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, project, task
     FROM timesheet_entries 
     WHERE timesheet_id = $1 AND project = $2 AND task = $3 AND source = 'time_clock'
     LIMIT 1`,
    [timesheetId, project, task]
  );
  return result.rows[0] || null;
}

/**
 * Update timesheet entry hours for specific day
 */
export async function updateTimesheetEntryHours(entryId, dayColumn, hours) {
  const validDayColumns = ['mon_hours', 'tue_hours', 'wed_hours', 'thu_hours', 'fri_hours', 'sat_hours', 'sun_hours'];
  if (!validDayColumns.includes(dayColumn)) {
    throw new Error(`Invalid day column: ${dayColumn}`);
  }

  const result = await pool.query(
    `UPDATE timesheet_entries 
     SET ${dayColumn} = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, ${dayColumn}`,
    [hours, entryId]
  );
  return result.rows[0];
}

/**
 * Create timesheet entry with hours for specific day
 */
export async function createTimesheetEntryForDay(timesheetId, project, task, dayColumn, hours) {
  const validDayColumns = ['mon_hours', 'tue_hours', 'wed_hours', 'thu_hours', 'fri_hours', 'sat_hours', 'sun_hours'];
  if (!validDayColumns.includes(dayColumn)) {
    throw new Error(`Invalid day column: ${dayColumn}`);
  }

  const hoursArray = {
    mon_hours: [hours, 0, 0, 0, 0, 0, 0],
    tue_hours: [0, hours, 0, 0, 0, 0, 0],
    wed_hours: [0, 0, hours, 0, 0, 0, 0],
    thu_hours: [0, 0, 0, hours, 0, 0, 0],
    fri_hours: [0, 0, 0, 0, hours, 0, 0],
    sat_hours: [0, 0, 0, 0, 0, hours, 0],
    sun_hours: [0, 0, 0, 0, 0, 0, hours],
  };

  const hoursValues = hoursArray[dayColumn] || [0, 0, 0, 0, 0, 0, 0];

  const result = await pool.query(
    `INSERT INTO timesheet_entries 
     (id, timesheet_id, project, task, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, source, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'time_clock', NOW(), NOW())
     RETURNING id, ${dayColumn}`,
    [timesheetId, project, task, ...hoursValues]
  );
  return result.rows[0];
}

/**
 * Get issue details
 */
export async function getIssueDetails(issueId) {
  const result = await pool.query(
    `SELECT title, project_name, estimated_hours FROM issues WHERE id = $1`,
    [issueId]
  );
  return result.rows[0] || null;
}

/**
 * Add comment to issue
 */
export async function addIssueComment(issueId, userId, comment) {
  try {
    await pool.query(
      `INSERT INTO issue_comments (id, issue_id, user_id, comment)
       VALUES (gen_random_uuid(), $1, $2, $3)`,
      [issueId, userId, comment]
    );
  } catch (err) {
    // Fallback if gen_random_uuid() is not available
    await pool.query(
      `INSERT INTO issue_comments (issue_id, user_id, comment)
       VALUES ($1, $2, $3)`,
      [issueId, userId, comment]
    );
  }
}

/**
 * Add issue activity
 */
export async function addIssueActivity(issueId, userId, action, details) {
  try {
    await pool.query(
      `INSERT INTO issue_activity (id, issue_id, user_id, action, details)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [issueId, userId, action, JSON.stringify(details)]
    );
  } catch (err) {
    // Fallback
    await pool.query(
      `INSERT INTO issue_activity (issue_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [issueId, userId, action, JSON.stringify(details)]
    );
  }
}

