import pool from './shared/database/connection.js';

async function fix() {
    console.log('Running fix on database...');
    try {
        await pool.query('UPDATE erp.timesheet_entries SET mon_hours = 0 WHERE mon_hours > 24');
        await pool.query('UPDATE erp.timesheet_entries SET tue_hours = 0 WHERE tue_hours > 24');
        await pool.query('UPDATE erp.timesheet_entries SET wed_hours = 0 WHERE wed_hours > 24');
        await pool.query('UPDATE erp.timesheet_entries SET thu_hours = 0 WHERE thu_hours > 24');
        await pool.query('UPDATE erp.timesheet_entries SET fri_hours = 0 WHERE fri_hours > 24');
        console.log('Fixed oversized hours in timesheets!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

fix();
