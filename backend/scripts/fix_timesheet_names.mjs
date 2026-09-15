import pool from '../shared/database/connection.js';

async function main() {
  console.log('Fixing existing corrupted entries in database...');
  
  // Fix time_clock entries
  const tcRes = await pool.query(`
    UPDATE time_clock 
    SET project_name = '[LAD-Story-1] Testing the story',
        notes = '[Task] LAD-Task-1: Story testing & execution'
    WHERE project_name LIKE '%[Task] LAD-Task-1: undefined%'
    RETURNING id, project_name, notes
  `);
  console.log('Updated time_clock rows:', tcRes.rows.length);

  // Fix timesheet_entries
  const tseRes = await pool.query(`
    UPDATE timesheet_entries
    SET project = '[LAD-Story-1] Testing the story',
        task = '[Task] LAD-Task-1: Story testing & execution'
    WHERE project LIKE '%[Task] LAD-Task-1: undefined%'
    RETURNING id, project, task, mon_hours, tue_hours, wed_hours, thu_hours
  `);
  console.log('Updated timesheet_entries rows:', tseRes.rows.length);

  // Normalize issue 30 task title
  await pool.query(`
    UPDATE timesheet_entries
    SET task = '#30 - testing'
    WHERE task = 'Issue #30: testing'
  `);

  console.log('Database normalization complete.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
