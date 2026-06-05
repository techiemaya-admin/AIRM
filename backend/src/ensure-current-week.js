/**
 * Ensure timesheet exists for current week (Nov 3-9, 2025)
 * This creates the timesheet if it doesn't exist
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function ensureCurrentWeek() {
  try {
    console.log('\n🔧 Ensuring current week timesheet exists...\n');

    const currentWeekStart = '2025-11-03'; // Monday Nov 3, 2025
    const currentWeekEnd = '2025-11-09';   // Sunday Nov 9, 2025

    // Get all users
    const users = await pool.query('SELECT id, email FROM users ORDER BY email');

    console.log(`Found ${users.rows.length} user(s)\n`);

    for (const user of users.rows) {
      // Check if timesheet exists
      const existing = await pool.query(
        `SELECT id FROM timesheets
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)`,
        [user.id, currentWeekStart]
      );

      if (existing.rows.length === 0) {
        // Create timesheet
        const result = await pool.query(
          `INSERT INTO timesheets (user_id, week_start, week_end, status)
           VALUES ($1, $2, $3, 'draft')
           RETURNING id`,
          [user.id, currentWeekStart, currentWeekEnd]
        );
        console.log(`✅ Created timesheet for ${user.email}: ${result.rows[0].id}`);
      } else {
        console.log(`✓ Timesheet exists for ${user.email}`);
      }
    }

    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

ensureCurrentWeek();

