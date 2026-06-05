/**
 * Fix ALL timesheet week_start dates to ensure they're all Monday
 * This is a comprehensive fix that recalculates week_start for every timesheet
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

async function fixAllTimesheetWeeks() {
  try {
    console.log('\n🔧 Fixing ALL timesheet week_start dates...\n');

    const allTimesheets = await pool.query(
      `SELECT id, user_id, week_start, week_end
       FROM timesheets
       ORDER BY week_start, user_id`
    );

    console.log(`Found ${allTimesheets.rows.length} timesheet(s)\n`);

    const fixed = [];
    const merged = [];

    for (const ts of allTimesheets.rows) {
      const oldWeekStart = typeof ts.week_start === 'string' 
        ? ts.week_start.split('T')[0] 
        : new Date(ts.week_start).toISOString().split('T')[0];
      
      const correctWeekStart = getWeekStartMonday(oldWeekStart);
      const correctWeekEnd = getWeekEnd(correctWeekStart);

      if (oldWeekStart === correctWeekStart) {
        continue; // Already correct
      }

      console.log(`\n📅 Timesheet ${ts.id}:`);
      console.log(`   Old: ${oldWeekStart} to ${ts.week_end}`);
      console.log(`   New: ${correctWeekStart} to ${correctWeekEnd}`);

      // Check if timesheet with correct week_start already exists
      const existing = await pool.query(
        `SELECT id FROM timesheets
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)`,
        [ts.user_id, correctWeekStart]
      );

      if (existing.rows.length > 0) {
        // Merge entries
        const entries = await pool.query(
          `SELECT * FROM timesheet_entries WHERE timesheet_id = $1`,
          [ts.id]
        );

        for (const entry of entries.rows) {
          const existingEntry = await pool.query(
            `SELECT id FROM timesheet_entries
             WHERE timesheet_id = $1 AND project = $2 AND task = $3 AND source = $4
             LIMIT 1`,
            [existing.rows[0].id, entry.project, entry.task, entry.source]
          );

          if (existingEntry.rows.length > 0) {
            // Add hours
            await pool.query(
              `UPDATE timesheet_entries
               SET mon_hours = mon_hours + $1,
                   tue_hours = tue_hours + $2,
                   wed_hours = wed_hours + $3,
                   thu_hours = thu_hours + $4,
                   fri_hours = fri_hours + $5,
                   sat_hours = sat_hours + $6,
                   sun_hours = sun_hours + $7,
                   updated_at = NOW()
               WHERE id = $8`,
              [
                parseFloat(entry.mon_hours) || 0,
                parseFloat(entry.tue_hours) || 0,
                parseFloat(entry.wed_hours) || 0,
                parseFloat(entry.thu_hours) || 0,
                parseFloat(entry.fri_hours) || 0,
                parseFloat(entry.sat_hours) || 0,
                parseFloat(entry.sun_hours) || 0,
                existingEntry.rows[0].id
              ]
            );
          } else {
            await pool.query(
              `UPDATE timesheet_entries SET timesheet_id = $1 WHERE id = $2`,
              [existing.rows[0].id, entry.id]
            );
          }
        }

        await pool.query('DELETE FROM timesheets WHERE id = $1', [ts.id]);
        console.log(`   ✅ Merged into timesheet ${existing.rows[0].id}`);
        merged.push({ from: ts.id, to: existing.rows[0].id });
      } else {
        // Update week_start
        await pool.query(
          `UPDATE timesheets
           SET week_start = $1, week_end = $2, updated_at = NOW()
           WHERE id = $3`,
          [correctWeekStart, correctWeekEnd, ts.id]
        );
        console.log(`   ✅ Updated week_start`);
        fixed.push({ id: ts.id, old: oldWeekStart, new: correctWeekStart });
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log(`✅ Fixed: ${fixed.length} timesheet(s)`);
    console.log(`🔄 Merged: ${merged.length} timesheet(s)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAllTimesheetWeeks();

