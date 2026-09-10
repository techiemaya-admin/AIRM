import pool from '../shared/database/connection.js';

async function inspectTimesheetData() {
  const users = await pool.query('SELECT id, email, full_name FROM erp.users');
  console.log('Users in erp.users:');
  console.table(users.rows);

  const timesheets = await pool.query(`
    SELECT t.id, t.user_id, u.email, t.week_start, t.week_end, t.status
    FROM erp.timesheets t
    LEFT JOIN erp.users u ON t.user_id = u.id
    ORDER BY t.week_start DESC
  `);
  console.log('All timesheets:');
  console.table(timesheets.rows);

  const entries = await pool.query(`
    SELECT te.id, te.timesheet_id, t.user_id, u.email, te.project, te.task, te.source, te.mon_hours, te.tue_hours, te.wed_hours, te.thu_hours
    FROM erp.timesheet_entries te
    JOIN erp.timesheets t ON te.timesheet_id = t.id
    LEFT JOIN erp.users u ON t.user_id = u.id
    ORDER BY te.created_at DESC
    LIMIT 30
  `);
  console.log('Timesheet entries:');
  console.table(entries.rows);

  const timeClock = await pool.query(`
    SELECT tc.id, tc.user_id, u.email, tc.clock_in, tc.clock_out, tc.project_name, tc.status, tc.total_hours
    FROM erp.time_clock tc
    LEFT JOIN erp.users u ON tc.user_id = u.id
    ORDER BY tc.clock_in DESC
    LIMIT 20
  `);
  console.log('Time clock entries:');
  console.table(timeClock.rows);

  process.exit(0);
}

inspectTimesheetData().catch(e => {
  console.error(e);
  process.exit(1);
});
