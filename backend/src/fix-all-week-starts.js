/**
 * Fix all timesheet week_start dates to use Monday as week start
 * Handles duplicates by merging entries
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

function calculateCorrectWeekStart(dateStr) {
  // Parse the date
  const date = new Date(dateStr);
  
  // Get local date string
  const localDateStr = date.toLocaleDateString('en-CA');
  const [year, month, day] = localDateStr.split('-').map(Number);
  
  // Create local date object
  const localDate = new Date(year, month - 1, day);
  const dayOfWeek = localDate.getDay();
  
  // Calculate Monday of the week
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(localDate);
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  // Format as YYYY-MM-DD
  const weekStartYear = weekStart.getFullYear();
  const weekStartMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
  const weekStartDay = String(weekStart.getDate()).padStart(2, '0');
  return `${weekStartYear}-${weekStartMonth}-${weekStartDay}`;
}

async function fixAllWeekStarts() {
  try {
    console.log('\n🔧 Fixing all timesheet week_start dates...\n');

    // Get all timesheets
    const allTimesheets = await pool.query(
      `SELECT id, user_id, week_start, week_end, status
       FROM timesheets
       ORDER BY week_start, user_id`
    );

    console.log(`Found ${allTimesheets.rows.length} timesheet(s) to check\n`);

    const fixed = [];
    const merged = [];
    const errors = [];

    for (const timesheet of allTimesheets.rows) {
      const oldWeekStart = timesheet.week_start;
      const oldWeekStartStr = typeof oldWeekStart === 'string' 
        ? oldWeekStart.split('T')[0] 
        : new Date(oldWeekStart).toISOString().split('T')[0];
      
      const correctWeekStart = calculateCorrectWeekStart(oldWeekStartStr);
      
      // Calculate correct week end (Sunday, 6 days after Monday)
      const weekStartDate = new Date(correctWeekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      weekEndDate.setHours(23, 59, 59, 999);
      const correctWeekEnd = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;

      if (oldWeekStartStr === correctWeekStart) {
        console.log(`✅ Timesheet ${timesheet.id}: Already correct (${correctWeekStart})`);
        continue;
      }

      console.log(`\n📅 Timesheet ${timesheet.id}:`);
      console.log(`   Old week_start: ${oldWeekStartStr}`);
      console.log(`   New week_start: ${correctWeekStart}`);
      console.log(`   New week_end: ${correctWeekEnd}`);

      // Check if a timesheet with correct week_start already exists for this user
      const existingCorrect = await pool.query(
        `SELECT id FROM timesheets
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)`,
        [timesheet.user_id, correctWeekStart]
      );

      if (existingCorrect.rows.length > 0) {
        // Merge entries from old timesheet to existing correct timesheet
        const correctTimesheetId = existingCorrect.rows[0].id;
        console.log(`   ⚠️  Timesheet with correct week_start already exists: ${correctTimesheetId}`);
        console.log(`   🔄 Merging entries...`);

        // Get all entries from old timesheet
        const oldEntries = await pool.query(
          `SELECT * FROM timesheet_entries WHERE timesheet_id = $1`,
          [timesheet.id]
        );

        console.log(`   Found ${oldEntries.rows.length} entries to merge`);

        for (const oldEntry of oldEntries.rows) {
          // Check if entry with same project/task/source exists in correct timesheet
          const existingEntry = await pool.query(
            `SELECT id FROM timesheet_entries
             WHERE timesheet_id = $1 AND project = $2 AND task = $3 AND source = $4
             LIMIT 1`,
            [correctTimesheetId, oldEntry.project, oldEntry.task, oldEntry.source]
          );

          if (existingEntry.rows.length > 0) {
            // Update existing entry - add hours
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
                parseFloat(oldEntry.mon_hours) || 0,
                parseFloat(oldEntry.tue_hours) || 0,
                parseFloat(oldEntry.wed_hours) || 0,
                parseFloat(oldEntry.thu_hours) || 0,
                parseFloat(oldEntry.fri_hours) || 0,
                parseFloat(oldEntry.sat_hours) || 0,
                parseFloat(oldEntry.sun_hours) || 0,
                existingEntry.rows[0].id
              ]
            );
            console.log(`      ✅ Merged entry: ${oldEntry.project} / ${oldEntry.task}`);
          } else {
            // Insert as new entry
            await pool.query(
              `INSERT INTO timesheet_entries
               (timesheet_id, project, task, source, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
              [
                correctTimesheetId,
                oldEntry.project,
                oldEntry.task,
                oldEntry.source,
                parseFloat(oldEntry.mon_hours) || 0,
                parseFloat(oldEntry.tue_hours) || 0,
                parseFloat(oldEntry.wed_hours) || 0,
                parseFloat(oldEntry.thu_hours) || 0,
                parseFloat(oldEntry.fri_hours) || 0,
                parseFloat(oldEntry.sat_hours) || 0,
                parseFloat(oldEntry.sun_hours) || 0
              ]
            );
            console.log(`      ✅ Added entry: ${oldEntry.project} / ${oldEntry.task}`);
          }
        }

        // Delete old timesheet and its entries
        await pool.query('DELETE FROM timesheet_entries WHERE timesheet_id = $1', [timesheet.id]);
        await pool.query('DELETE FROM timesheets WHERE id = $1', [timesheet.id]);
        console.log(`   ✅ Deleted old timesheet ${timesheet.id}`);
        merged.push({ old: timesheet.id, new: correctTimesheetId });
      } else {
        // Update week_start and week_end
        try {
          await pool.query(
            `UPDATE timesheets
             SET week_start = $1, week_end = $2, updated_at = NOW()
             WHERE id = $3`,
            [correctWeekStart, correctWeekEnd, timesheet.id]
          );
          console.log(`   ✅ Updated week_start to ${correctWeekStart}`);
          fixed.push({ id: timesheet.id, old: oldWeekStartStr, new: correctWeekStart });
        } catch (error) {
          console.error(`   ❌ Error updating: ${error.message}`);
          errors.push({ id: timesheet.id, error: error.message });
        }
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log(`✅ Fixed: ${fixed.length} timesheet(s)`);
    console.log(`🔄 Merged: ${merged.length} timesheet(s)`);
    console.log(`❌ Errors: ${errors.length} timesheet(s)`);

    if (fixed.length > 0) {
      console.log('\nFixed timesheets:');
      fixed.forEach(f => console.log(`   ${f.id}: ${f.old} → ${f.new}`));
    }

    if (merged.length > 0) {
      console.log('\nMerged timesheets:');
      merged.forEach(m => console.log(`   ${m.old} → ${m.new}`));
    }

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`   ${e.id}: ${e.error}`));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAllWeekStarts();

