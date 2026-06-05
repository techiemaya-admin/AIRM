/**
 * Fix week_start dates that were stored incorrectly due to timezone issues
 * This will update existing timesheets to use the correct week_start (Monday)
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixWeekStarts() {
  try {
    console.log('\n🔧 Fixing week_start dates in database...\n');

    // Get all timesheets
    const timesheets = await pool.query(
      `SELECT id, user_id, week_start, week_end, created_at 
       FROM timesheets 
       ORDER BY created_at DESC`
    );

    console.log(`Found ${timesheets.rows.length} timesheet(s) to check\n`);

    for (const timesheet of timesheets.rows) {
      const weekStart = new Date(timesheet.week_start);
      
      // Calculate the correct Monday for this week
      const dayOfWeek = weekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      // If it's already Monday, no change needed
      if (daysToMonday === 0) {
        console.log(`✅ Timesheet ${timesheet.id} already has correct week_start (Monday)`);
        continue;
      }

      // Calculate correct Monday
      const correctWeekStart = new Date(weekStart);
      correctWeekStart.setDate(correctWeekStart.getDate() - daysToMonday);
      correctWeekStart.setHours(0, 0, 0, 0);
      
      const correctWeekEnd = new Date(correctWeekStart);
      correctWeekEnd.setDate(correctWeekEnd.getDate() + 6);
      correctWeekEnd.setHours(23, 59, 59, 999);

      // Format using local date
      const year = correctWeekStart.getFullYear();
      const month = String(correctWeekStart.getMonth() + 1).padStart(2, '0');
      const day = String(correctWeekStart.getDate()).padStart(2, '0');
      const correctWeekStartStr = `${year}-${month}-${day}`;
      
      const yearEnd = correctWeekEnd.getFullYear();
      const monthEnd = String(correctWeekEnd.getMonth() + 1).padStart(2, '0');
      const dayEnd = String(correctWeekEnd.getDate()).padStart(2, '0');
      const correctWeekEndStr = `${yearEnd}-${monthEnd}-${dayEnd}`;

      const oldWeekStart = timesheet.week_start.toISOString().split('T')[0];
      
      console.log(`📅 Timesheet ${timesheet.id}:`);
      console.log(`   Old week_start: ${oldWeekStart}`);
      console.log(`   New week_start: ${correctWeekStartStr}`);
      console.log(`   New week_end: ${correctWeekEndStr}\n`);

      // Update the timesheet
      await pool.query(
        `UPDATE timesheets 
         SET week_start = $1, week_end = $2 
         WHERE id = $3`,
        [correctWeekStartStr, correctWeekEndStr, timesheet.id]
      );

      console.log(`   ✅ Updated timesheet ${timesheet.id}\n`);
    }

    console.log('✅ All timesheets updated!\n');

    // Verify the fix
    const verifyResult = await pool.query(
      `SELECT id, week_start, week_end, 
              EXTRACT(DOW FROM week_start) as day_of_week
       FROM timesheets 
       ORDER BY week_start DESC`
    );

    console.log('📊 Verification - All timesheets:\n');
    verifyResult.rows.forEach((ts) => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      console.log(`   ID: ${ts.id}`);
      console.log(`   Week start: ${ts.week_start} (${dayNames[ts.day_of_week]})`);
      console.log(`   Week end: ${ts.week_end}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixWeekStarts();

