/**
 * Move Thursday hours from previous week to current week
 * This fixes entries that were saved to the wrong week due to timezone issues
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function moveThursdayHours() {
  try {
    console.log('\n🔧 Moving Thursday hours to correct week...\n');

    // Current week (Nov 3-9, 2025)
    const currentWeekStart = '2025-11-03';
    const previousWeekStart = '2025-10-27';

    console.log(`Current week: ${currentWeekStart} to 2025-11-09`);
    console.log(`Previous week: ${previousWeekStart} to 2025-11-02\n`);

    // Find timesheets in previous week with Thursday hours
    const previousWeekTimesheets = await pool.query(
      `SELECT t.id, t.user_id, u.email
       FROM timesheets t
       JOIN users u ON t.user_id = u.id
       WHERE CAST(t.week_start AS DATE) = CAST($1 AS DATE)`,
      [previousWeekStart]
    );

    console.log(`Found ${previousWeekTimesheets.rows.length} timesheet(s) in previous week\n`);

    for (const timesheet of previousWeekTimesheets.rows) {
      // Get entries with Thursday hours
      const entries = await pool.query(
        `SELECT id, project, task, source, thu_hours
         FROM timesheet_entries
         WHERE timesheet_id = $1 AND thu_hours > 0`,
        [timesheet.id]
      );

      if (entries.rows.length === 0) {
        console.log(`No Thursday hours found in timesheet ${timesheet.id} (${timesheet.email})`);
        continue;
      }

      console.log(`📋 User: ${timesheet.email}`);
      console.log(`   Found ${entries.rows.length} entry/entries with Thursday hours:\n`);

      // Get or create timesheet for current week
      let currentWeekTimesheet = await pool.query(
        `SELECT id FROM timesheets 
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)`,
        [timesheet.user_id, currentWeekStart]
      );

      let currentTimesheetId;
      if (currentWeekTimesheet.rows.length > 0) {
        currentTimesheetId = currentWeekTimesheet.rows[0].id;
        console.log(`   ✅ Found existing timesheet for current week: ${currentTimesheetId}`);
      } else {
        const newTimesheet = await pool.query(
          `INSERT INTO timesheets (user_id, week_start, week_end, status)
           VALUES ($1, $2, $3, 'draft')
           RETURNING id`,
          [timesheet.user_id, currentWeekStart, '2025-11-09']
        );
        currentTimesheetId = newTimesheet.rows[0].id;
        console.log(`   ✅ Created new timesheet for current week: ${currentTimesheetId}`);
      }

      // Move entries to current week
      for (const entry of entries.rows) {
        console.log(`   📝 Entry: ${entry.project} / ${entry.task} (${entry.thu_hours} hours)`);

        // Check if entry already exists in current week
        const existingEntry = await pool.query(
          `SELECT id, thu_hours FROM timesheet_entries
           WHERE timesheet_id = $1 AND project = $2 AND task = $3 AND source = $4`,
          [currentTimesheetId, entry.project, entry.task, entry.source]
        );

        if (existingEntry.rows.length > 0) {
          // Update existing entry - add Thursday hours
          const currentHours = parseFloat(existingEntry.rows[0].thu_hours) || 0;
          const newHours = Math.round((currentHours + parseFloat(entry.thu_hours)) * 100) / 100;
          
          await pool.query(
            `UPDATE timesheet_entries 
             SET thu_hours = $1, updated_at = NOW()
             WHERE id = $2`,
            [newHours, existingEntry.rows[0].id]
          );
          
          console.log(`      ✅ Updated existing entry: ${currentHours} + ${entry.thu_hours} = ${newHours} hours`);
        } else {
          // Create new entry in current week with only Thursday hours
          await pool.query(
            `INSERT INTO timesheet_entries 
            (timesheet_id, project, task, source, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 0, 0, 0, $5, 0, 0, 0, NOW(), NOW())`,
            [currentTimesheetId, entry.project, entry.task, entry.source, entry.thu_hours]
          );
          
          console.log(`      ✅ Created new entry with ${entry.thu_hours} Thursday hours`);
        }

        // Remove Thursday hours from previous week entry (set to 0)
        await pool.query(
          `UPDATE timesheet_entries 
           SET thu_hours = 0, updated_at = NOW()
           WHERE id = $1`,
          [entry.id]
        );
        
        console.log(`      ✅ Removed Thursday hours from previous week entry\n`);
      }
    }

    console.log('✅ All Thursday hours moved to current week!\n');

    // Verify
    const verifyResult = await pool.query(
      `SELECT 
        te.id,
        te.project,
        te.task,
        te.source,
        te.thu_hours,
        t.week_start,
        u.email
      FROM timesheet_entries te
      JOIN timesheets t ON te.timesheet_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE CAST(t.week_start AS DATE) = CAST($1 AS DATE)
        AND te.thu_hours > 0
      ORDER BY te.updated_at DESC`,
      [currentWeekStart]
    );

    console.log(`📊 Verification - Thursday hours in current week (${currentWeekStart}):\n`);
    if (verifyResult.rows.length === 0) {
      console.log('   ⚠️  No Thursday hours found in current week');
    } else {
      verifyResult.rows.forEach((entry) => {
        console.log(`   ✅ ${entry.email}: ${entry.project} / ${entry.task} - ${entry.thu_hours} hours`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

moveThursdayHours();

