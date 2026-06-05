/**
 * Backfill timesheet entries from existing clock-out records
 * This fixes the issue where clock-outs exist but timesheet entries don't
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

function getWeekStartMonday(dateStr) {
  const date = new Date(dateStr);
  const localDateStr = date.toLocaleDateString('en-CA');
  const [year, month, day] = localDateStr.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  const dayOfWeek = localDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(localDate);
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const yearStr = weekStart.getFullYear();
  const monthStr = String(weekStart.getMonth() + 1).padStart(2, '0');
  const dayStr = String(weekStart.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

function getWeekEnd(weekStartStr) {
  const weekStart = new Date(weekStartStr);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const year = weekEnd.getFullYear();
  const month = String(weekEnd.getMonth() + 1).padStart(2, '0');
  const day = String(weekEnd.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function backfillTimesheetEntries() {
  try {
    console.log('\n🔧 Backfilling timesheet entries from clock-out records...\n');

    // Get all clock-out entries
    const clockOuts = await pool.query(
      `SELECT id, user_id, issue_id, project_name, clock_out, total_hours
       FROM time_clock
       WHERE status = 'clocked_out' AND clock_out IS NOT NULL AND total_hours > 0
       ORDER BY clock_out DESC`
    );

    console.log(`Found ${clockOuts.rows.length} clock-out entries to process\n`);

    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const clockOut of clockOuts.rows) {
      try {
        const clockOutTime = new Date(clockOut.clock_out);
        const weekStartStr = getWeekStartMonday(clockOut.clock_out);
        const weekEndStr = getWeekEnd(weekStartStr);
        
        const localDateStr = clockOutTime.toLocaleDateString('en-CA');
        const [year, month, day] = localDateStr.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        const dayOfWeek = localDate.getDay();
        
        const dayColumnMap = {
          0: 'sun_hours',
          1: 'mon_hours',
          2: 'tue_hours',
          3: 'wed_hours',
          4: 'thu_hours',
          5: 'fri_hours',
          6: 'sat_hours',
        };
        const dayColumn = dayColumnMap[dayOfWeek] || 'mon_hours';
        
        // Get or create timesheet
        let timesheetResult = await pool.query(
          `SELECT id FROM timesheets
           WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)
           LIMIT 1`,
          [clockOut.user_id, weekStartStr]
        );

        let timesheetId;
        if (timesheetResult.rows.length > 0) {
          timesheetId = timesheetResult.rows[0].id;
        } else {
          const newTimesheet = await pool.query(
            `INSERT INTO timesheets (user_id, week_start, week_end, status)
             VALUES ($1, $2, $3, 'draft')
             RETURNING id`,
            [clockOut.user_id, weekStartStr, weekEndStr]
          );
          timesheetId = newTimesheet.rows[0].id;
          console.log(`✅ Created timesheet ${timesheetId} for user ${clockOut.user_id}`);
        }

        // Determine project and task
        let project = clockOut.project_name || 'General';
        let task = 'General Work';

        if (clockOut.issue_id) {
          const issueResult = await pool.query(
            `SELECT title, project_name FROM issues WHERE id = $1`,
            [clockOut.issue_id]
          );
          if (issueResult.rows.length > 0) {
            const issue = issueResult.rows[0];
            project = issue.project_name || clockOut.project_name || 'General';
            task = `Issue #${clockOut.issue_id}: ${issue.title || 'Untitled'}`;
          } else {
            task = `Issue #${clockOut.issue_id}`;
          }
        }

        project = (project || 'General').trim();
        task = (task || 'General Work').trim();
        const roundedHours = Math.round(parseFloat(clockOut.total_hours) * 100) / 100;

        // Check if entry exists
        const existingEntry = await pool.query(
          `SELECT id, ${dayColumn} as current_hours FROM timesheet_entries
           WHERE timesheet_id = $1 AND project = $2 AND task = $3 AND source = 'time_clock'
           LIMIT 1`,
          [timesheetId, project, task]
        );

        if (existingEntry.rows.length > 0) {
          // Update existing entry
          const entryId = existingEntry.rows[0].id;
          const currentHours = parseFloat(existingEntry.rows[0].current_hours) || 0;
          const newHours = Math.round((currentHours + roundedHours) * 100) / 100;
          
          await pool.query(
            `UPDATE timesheet_entries
             SET ${dayColumn} = $1, updated_at = NOW()
             WHERE id = $2`,
            [newHours, entryId]
          );
          updated++;
        } else {
          // Insert new entry
          const hoursArray = {
            mon_hours: [roundedHours, 0, 0, 0, 0, 0, 0],
            tue_hours: [0, roundedHours, 0, 0, 0, 0, 0],
            wed_hours: [0, 0, roundedHours, 0, 0, 0, 0],
            thu_hours: [0, 0, 0, roundedHours, 0, 0, 0],
            fri_hours: [0, 0, 0, 0, roundedHours, 0, 0],
            sat_hours: [0, 0, 0, 0, 0, roundedHours, 0],
            sun_hours: [0, 0, 0, 0, 0, 0, roundedHours],
          };
          
          const hours = hoursArray[dayColumn] || [0, 0, 0, 0, 0, 0, 0];
          
          await pool.query(
            `INSERT INTO timesheet_entries
             (timesheet_id, project, task, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, source, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'time_clock', NOW(), NOW())`,
            [timesheetId, project, task, ...hours]
          );
          created++;
        }
        
        processed++;
      } catch (error) {
        console.error(`❌ Error processing clock-out ${clockOut.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== BACKFILL SUMMARY ===');
    console.log(`✅ Processed: ${processed}`);
    console.log(`✅ Created: ${created} new entries`);
    console.log(`✅ Updated: ${updated} existing entries`);
    console.log(`❌ Errors: ${errors}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

backfillTimesheetEntries();

