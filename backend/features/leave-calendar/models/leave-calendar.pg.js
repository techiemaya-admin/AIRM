/**
 * Leave Calendar Model
 * PostgreSQL queries only - NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get leave balances for a user
 */
export async function getLeaveBalances(userId) {
  const result = await pool.query(
    `SELECT * FROM leave_balances
     WHERE user_id = $1
     ORDER BY leave_type, financial_year DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get user join date
 */
export async function getUserJoinDate(userId) {
  const result = await pool.query(
    `SELECT 
      COALESCE(p.join_date, (CASE WHEN e.joining_date IS NOT NULL AND e.joining_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN e.joining_date::date ELSE NULL END)) as join_date
     FROM users u
     LEFT JOIN profiles p ON u.id = p.id
     LEFT JOIN employee e ON p.id = e.profile_id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0]?.join_date;
}

/**
 * Update leave balance
 */
export async function updateLeaveBalance(balanceData) {
  const { user_id, leave_type, financial_year, opening_balance, availed, balance } = balanceData;

  const result = await pool.query(
    `INSERT INTO leave_balances (
      user_id, leave_type, financial_year, opening_balance, availed, balance
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, leave_type, financial_year)
    DO UPDATE SET
      opening_balance = EXCLUDED.opening_balance,
      availed = EXCLUDED.availed,
      balance = EXCLUDED.balance,
      updated_at = NOW()
    RETURNING *`,
    [user_id, leave_type, financial_year, opening_balance, availed, balance]
  );
  return result.rows[0];
}

/**
 * Get shift roster for a date range
 */
export async function getShiftRoster(startDate, endDate) {
  const result = await pool.query(
    `SELECT sr.*, u.email, u.full_name
     FROM shift_roster sr
     JOIN users u ON sr.user_id = u.id
     WHERE sr.date BETWEEN $1 AND $2
     ORDER BY sr.date, u.full_name`,
    [startDate, endDate]
  );
  return result.rows;
}

/**
 * Update shift roster
 */
export async function updateShiftRoster(shiftData) {
  const { user_id, date, shift_type, start_time, end_time } = shiftData;
  const result = await pool.query(
    `INSERT INTO shift_roster (user_id, date, shift_type, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, date)
     DO UPDATE SET
       shift_type = EXCLUDED.shift_type,
       start_time = EXCLUDED.start_time,
       end_time = EXCLUDED.end_time,
       updated_at = NOW()
     RETURNING *`,
    [user_id, date, shift_type, start_time, end_time]
  );
  return result.rows[0];
}

/**
 * Get attendance records for a date range
 * Fetches from time_clock table and aggregates by date
 */
export async function getAttendance(startDate, endDate) {
  // Generate all dates in range
  const dateRows = await pool.query(
    `SELECT generate_series($1::date, $2::date, interval '1 day') AS date`,
    [startDate, endDate]
  );
  const dates = dateRows.rows.map(r => r.date);

  // Get all employees (active profiles with join_date)
  const userRows = await pool.query(`
    SELECT u.id, u.email, u.full_name
    FROM users u
  `);
  const users = userRows.rows;

  // Build attendance map: { [user_id_date]: attendanceRow }
  const attendanceRows = await pool.query(
    `SELECT 
       tc.user_id,
       u.email,
       u.full_name,
       DATE(tc.clock_in) as date,
       MIN(tc.clock_in) as clock_in,
       MAX(tc.clock_out) as clock_out,
       COALESCE(SUM(tc.total_hours), 0) as total_hours,
       sr.shift_type,
       CASE 
         WHEN (MIN(tc.clock_in) AT TIME ZONE 'Asia/Kolkata')::time > '11:00:00' THEN 'half_day'
         WHEN COALESCE(SUM(tc.total_hours), 0) >= 8 THEN 'present'
         WHEN COALESCE(SUM(tc.total_hours), 0) >= 4 THEN 'half_day'
         WHEN COALESCE(SUM(tc.total_hours), 0) > 0 THEN 'present'
         WHEN MAX(tc.clock_out) IS NULL THEN 'present'
         ELSE 'absent'
       END as status
     FROM time_clock tc
     JOIN users u ON tc.user_id = u.id
     LEFT JOIN shift_roster sr ON tc.user_id = sr.user_id AND DATE(tc.clock_in) = sr.date
     WHERE DATE(tc.clock_in) BETWEEN $1 AND $2
     GROUP BY tc.user_id, u.email, u.full_name, DATE(tc.clock_in), sr.shift_type
     ORDER BY DATE(tc.clock_in) DESC, u.full_name`,
    [startDate, endDate]
  );
  const attendanceMap = {};
  for (const row of attendanceRows.rows) {
    attendanceMap[`${row.user_id}_${row.date.toISOString().slice(0, 10)}`] = row;
  }

  // Get all approved leave requests in the range
  const leaveRows = await pool.query(
    `SELECT user_id, start_date, end_date FROM leave_requests WHERE status = 'approved' AND start_date <= $2 AND end_date >= $1`,
    [startDate, endDate]
  );
  const leaveMap = {};
  for (const row of leaveRows.rows) {
    const leaveDates = [];
    let d = new Date(row.start_date);
    const end = new Date(row.end_date);
    while (d <= end) {
      leaveDates.push(d.toISOString().slice(0, 10));
      d = new Date(d.getTime() + 86400000);
    }
    for (const ld of leaveDates) {
      leaveMap[`${row.user_id}_${ld}`] = true;
    }
  }

  // Build full result: all users x all dates
  const result = [];
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (const user of users) {
    for (const date of dates) {
      // Process all dates including future ones
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const key = `${user.id}_${date.toISOString().slice(0, 10)}`;
      if (attendanceMap[key]) {
        // Ensure real records have an id (from db or fallback)
        result.push({
          id: attendanceMap[key].id || key,
          ...attendanceMap[key],
        });
      } else {
        // Only mark as 'absent' for past dates, but check leave
        const today = new Date();
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

        let status = '';
        if (leaveMap[key]) {
          status = 'on_leave';
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
          status = 'week_off';
        } else if (dateOnly < todayOnly) {
          status = 'absent';
        } else if (dateOnly.getTime() === todayOnly.getTime()) {
          status = 'upcoming'; // today
        } else {
          status = 'upcoming'; // future
        }
        result.push({
          id: key,
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          date: date,
          clock_in: null,
          clock_out: null,
          total_hours: 0,
          shift_type: null,
          status: status,
        });
      }
    }
  }
  // Sort by date desc, then user name
  result.sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return (a.full_name || a.email).localeCompare(b.full_name || b.email);
  });
  return result;
}

/**
 * Update attendance record
 */
export async function updateAttendanceRecord(attendanceData) {
  const { user_id, date, shift_id, clock_in, clock_out, total_hours, status, notes } = attendanceData;

  const result = await pool.query(
    `INSERT INTO attendance (
      user_id, date, shift_id, clock_in, clock_out, total_hours, status, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      shift_id = EXCLUDED.shift_id,
      clock_in = EXCLUDED.clock_in,
      clock_out = EXCLUDED.clock_out,
      total_hours = EXCLUDED.total_hours,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [user_id, date, shift_id, clock_in, clock_out, total_hours, status, notes]
  );
  return result.rows[0];
}

/**
 * Get all leave requests
 */
export async function getAllLeaveRequests(userId, isAdmin) {
  let query = `
    SELECT 
      lr.*,
      u.email as user_email,
      COALESCE(u.full_name, '') as user_full_name
    FROM leave_requests lr
    LEFT JOIN users u ON lr.user_id = u.id
  `;

  const params = [];

  if (!isAdmin) {
    query += ` WHERE lr.user_id = $1`;
    params.push(userId);
  }

  query += ` ORDER BY lr.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Create leave request
 */
export async function createLeaveRequest(userId, startDate, endDate, leaveType, reason, session) {
  const result = await pool.query(
    `INSERT INTO leave_requests (
      id, user_id, start_date, end_date, leave_type, reason, status, session
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending', $6)
    RETURNING *`,
    [userId, startDate, endDate, leaveType, reason || null, session || 'Full Day']
  );
  return result.rows[0];
}

/**
 * Update leave request status
 */
export async function updateLeaveRequestStatus(id, status, reviewedBy, adminNotes) {
  const result = await pool.query(
    `UPDATE leave_requests 
     SET status = $1,
         reviewed_by = $2,
         reviewed_at = NOW(),
         admin_notes = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, reviewedBy, adminNotes || null, id]
  );
  return result.rows[0];
}

/**
 * Get leave history for a user
 */
export async function getLeaveHistory(userId) {
  const query = `
    SELECT 
      id,
      start_date,
      end_date,
      leave_type,
      session,
      reason,
      status,
      admin_notes,
      created_at
    FROM leave_requests
    WHERE user_id = $1
    ORDER BY start_date DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
}

/**
 * Get monthly attendance report (Admin only)
 */
export async function getMonthlyAttendanceReport(month, year) {
  const query = `
    SELECT
      u.id as user_id,
      u.full_name,
      u.email,
      d.date,
      a.status,
      a.clock_in,
      a.clock_out,
      lr.leave_type,
      lr.session
    FROM
      (SELECT generate_series(
        make_date($2, $1, 1),
        (make_date($2, $1, 1) + '1 month'::interval - '1 day'::interval)::date,
        '1 day'::interval
      )::date AS date) AS d
    CROSS JOIN users u
    LEFT JOIN attendance a ON d.date = a.date AND u.id = a.user_id
    LEFT JOIN leave_requests lr ON u.id = lr.user_id AND d.date BETWEEN lr.start_date AND lr.end_date AND lr.status = 'approved'
    ORDER BY u.id, d.date;
  `;
  console.log(`[payroll-model] Running report query for ${month}/${year}`);
  const result = await pool.query(query, [month, year]);
  console.log(`[payroll-model] Query returned ${result.rows.length} rows`);
  return result.rows;
}

/**
 * Get shift-wise attendance analysis (Admin only)
 */
export async function getShiftWiseAttendanceAnalysis(startDate, endDate) {
  const query = `
    SELECT
      sr.shift_type,
      sr.date,
      COUNT(a.id) as present_count,
      (SELECT COUNT(DISTINCT u.id) FROM shift_roster u WHERE u.date = sr.date AND u.shift_type = sr.shift_type) - COUNT(a.id) as absent_count
    FROM shift_roster sr
    LEFT JOIN attendance a ON sr.user_id = a.user_id AND sr.date = a.date AND a.status = 'present'
    WHERE sr.date BETWEEN $1 AND $2
    GROUP BY sr.date, sr.shift_type
    ORDER BY sr.date, sr.shift_type;
  `;
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
}

