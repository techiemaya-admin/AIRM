/**
 * Merge duplicate timesheets for the same user and week
 * This fixes cases where multiple timesheets exist for the same week
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function mergeDuplicateTimesheets() {
  try {
    console.log('\n🔧 Merging duplicate timesheets...\n');

    // Find duplicate timesheets (same user, same week_start)
    const duplicates = await pool.query(
      `SELECT user_id, week_start, COUNT(*) as count, array_agg(id) as timesheet_ids
       FROM timesheets
       GROUP BY user_id, CAST(week_start AS DATE)
       HAVING COUNT(*) > 1
       ORDER BY user_id, week_start`
    );

    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicate timesheets found!');
      return;
    }

    console.log(`Found ${duplicates.rows.length} duplicate group(s)\n`);

    for (const dup of duplicates.rows) {
      const timesheetIds = dup.timesheet_ids;
      const keepId = timesheetIds[0]; // Keep the first one
      const mergeIds = timesheetIds.slice(1); // Merge the rest

      console.log(`\n📋 User: ${dup.user_id}, Week: ${dup.week_start}`);
      console.log(`   Keeping timesheet: ${keepId}`);
      console.log(`   Merging ${mergeIds.length} timesheet(s): ${mergeIds.join(', ')}`);

      // Get all entries from timesheets to merge
      for (const mergeId of mergeIds) {
        const entries = await pool.query(
          `SELECT * FROM timesheet_entries WHERE timesheet_id = $1`,
          [mergeId]
        );

        console.log(`   Found ${entries.rows.length} entries in timesheet ${mergeId}`);

        for (const entry of entries.rows) {
          // Check if entry with same project/task/source exists in kept timesheet
          const existing = await pool.query(
            `SELECT id FROM timesheet_entries
             WHERE timesheet_id = $1 AND project = $2 AND task = $3 AND source = $4
             LIMIT 1`,
            [keepId, entry.project, entry.task, entry.source]
          );

          if (existing.rows.length > 0) {
            // Merge hours - add all hours together
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
                existing.rows[0].id
              ]
            );
            console.log(`      ✅ Merged entry: ${entry.project} / ${entry.task}`);
          } else {
            // Move entry to kept timesheet
            await pool.query(
              `UPDATE timesheet_entries
               SET timesheet_id = $1, updated_at = NOW()
               WHERE id = $2`,
              [keepId, entry.id]
            );
            console.log(`      ✅ Moved entry: ${entry.project} / ${entry.task}`);
          }
        }

        // Delete merged timesheet
        await pool.query('DELETE FROM timesheets WHERE id = $1', [mergeId]);
        console.log(`   ✅ Deleted timesheet ${mergeId}`);
      }
    }

    console.log('\n✅ All duplicates merged!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

mergeDuplicateTimesheets();

