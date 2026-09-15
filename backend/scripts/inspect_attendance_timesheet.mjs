import pool from '../shared/database/connection.js';

async function main() {
  const tcCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'time_clock'`);
  console.log('TIME_CLOCK COLUMNS:', tcCols.rows.map(c => c.column_name));

  const tseCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'timesheet_entries'`);
  console.log('TIMESHEET_ENTRIES COLUMNS:', tseCols.rows.map(c => c.column_name));

  const recentTc = await pool.query(`SELECT * FROM time_clock ORDER BY clock_in DESC LIMIT 10`);
  console.log('RECENT TIME CLOCK ENTRIES:', recentTc.rows);

  const chethanEntries = await pool.query(`
    SELECT te.* 
    FROM timesheet_entries te 
    JOIN timesheets t ON te.timesheet_id = t.id 
    WHERE t.user_id = 'bb3d7f11-5e51-40dd-9766-e76cd8a1bfbd' 
      AND t.week_start = '2026-09-07'
  `);
  console.log('CHETHAN 2026-09-07 ENTRIES:', chethanEntries.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
