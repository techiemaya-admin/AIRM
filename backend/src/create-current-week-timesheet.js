/**
 * Create timesheet for current week (Nov 3-9, 2025) and move entries
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function createCurrentWeekTimesheet() {
  try {
    console.log('\n🔧 Creating timesheet for current week (Nov 3-9, 2025)...\n');

    const currentWeekStart = '2025-11-03';
    const currentWeekEnd = '2025-11-09';

    // Get all users
    const users = await pool.query('SELECT id, email FROM users');

    for (const user of users.rows) {
      console.log(`\n👤 User: ${user.email} (${user.id})`);

      // Check if timesheet for current week already exists
      const existing = await pool.query(
        `SELECT id FROM timesheets
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)`,
        [user.id, currentWeekStart]
      );

      if (existing.rows.length > 0) {
        console.log(`   ✅ Timesheet already exists: ${existing.rows[0].id}`);
        continue;
      }

      // Check if there's a timesheet for Oct 27 - Nov 2 that might have entries for Nov 3-9
      const previousWeek = await pool.query(
        `SELECT id FROM timesheets
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)`,
        [user.id, '2025-10-27']
      );

      let timesheetId;
      if (previousWeek.rows.length > 0) {
        // Check if it has entries that should be in current week
        const entries = await pool.query(
          `SELECT * FROM timesheet_entries WHERE timesheet_id = $1`,
          [previousWeek.rows[0].id]
        );

        if (entries.rows.length > 0) {
          console.log(`   📋 Found ${entries.rows.length} entries in previous week timesheet`);
          
          // Create new timesheet for current week
          const newTimesheet = await pool.query(
            `INSERT INTO timesheets (user_id, week_start, week_end, status)
             VALUES ($1, $2, $3, 'draft')
             RETURNING id`,
            [user.id, currentWeekStart, currentWeekEnd]
          );
          timesheetId = newTimesheet.rows[0].id;
          console.log(`   ✅ Created new timesheet: ${timesheetId}`);

          // Copy entries that have hours for days in current week (Mon-Fri of Nov 3-7)
          // For now, copy all entries - they might have hours for current week
          for (const entry of entries.rows) {
            // Check if entry has any hours that could be for current week
            const hasCurrentWeekHours = 
              (parseFloat(entry.mon_hours) || 0) > 0 ||
              (parseFloat(entry.tue_hours) || 0) > 0 ||
              (parseFloat(entry.wed_hours) || 0) > 0 ||
              (parseFloat(entry.thu_hours) || 0) > 0 ||
              (parseFloat(entry.fri_hours) || 0) > 0;

            if (hasCurrentWeekHours) {
              // Check if entry already exists in new timesheet
              const existingEntry = await pool.query(
                `SELECT id FROM timesheet_entries
                 WHERE timesheet_id = $1 AND project = $2 AND task = $3 AND source = $4
                 LIMIT 1`,
                [timesheetId, entry.project, entry.task, entry.source]
              );

              if (existingEntry.rows.length === 0) {
                // Insert entry with only Mon-Fri hours (current week days)
                await pool.query(
                  `INSERT INTO timesheet_entries
                   (timesheet_id, project, task, source, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
                  [
                    timesheetId,
                    entry.project,
                    entry.task,
                    entry.source,
                    parseFloat(entry.mon_hours) || 0,
                    parseFloat(entry.tue_hours) || 0,
                    parseFloat(entry.wed_hours) || 0,
                    parseFloat(entry.thu_hours) || 0,
                    parseFloat(entry.fri_hours) || 0,
                    0, // sat_hours - current week Saturday is Nov 8
                    0  // sun_hours - current week Sunday is Nov 9
                  ]
                );
                console.log(`      ✅ Copied entry: ${entry.project} / ${entry.task}`);
              }
            }
          }
        } else {
          // No entries, just create empty timesheet
          const newTimesheet = await pool.query(
            `INSERT INTO timesheets (user_id, week_start, week_end, status)
             VALUES ($1, $2, $3, 'draft')
             RETURNING id`,
            [user.id, currentWeekStart, currentWeekEnd]
          );
          console.log(`   ✅ Created empty timesheet: ${newTimesheet.rows[0].id}`);
        }
      } else {
        // No previous week timesheet, create empty one
        const newTimesheet = await pool.query(
          `INSERT INTO timesheets (user_id, week_start, week_end, status)
           VALUES ($1, $2, $3, 'draft')
           RETURNING id`,
          [user.id, currentWeekStart, currentWeekEnd]
        );
        console.log(`   ✅ Created empty timesheet: ${newTimesheet.rows[0].id}`);
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

createCurrentWeekTimesheet();

