/**
 * Timesheets Routes
 * Handles time clock and timesheet operations
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../../shared/database/connection.js';
import { authenticate, requireAdmin } from '../../core/auth/authMiddleware.js';

const router = express.Router();
router.use(authenticate);

/**
 * Clock in
 * POST /api/timesheets/clock-in
 */
router.post('/clock-in', [
  body('issue_id').optional().isInt(),
  body('project_name').optional().trim(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('location_address').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId;
    const { issue_id, project_name, latitude, longitude, location_address } = req.body;

    // Check if user already has an active clock-in
    const activeEntry = await pool.query(
      `SELECT id FROM time_clock 
       WHERE user_id = $1 AND status IN ('clocked_in', 'paused')
       ORDER BY clock_in DESC LIMIT 1`,
      [userId]
    );

    if (activeEntry.rows.length > 0) {
      return res.status(400).json({
        error: 'Already clocked in',
        message: 'You already have an active time entry'
      });
    }

    // Create new clock-in entry
    const result = await pool.query(
      `INSERT INTO time_clock (
        user_id, issue_id, project_name, status,
        latitude, longitude, location_address, location_timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        userId,
        issue_id || null,
        project_name || null,
        'clocked_in',
        latitude || null,
        longitude || null,
        location_address || null,
      ]
    );

    res.status(201).json({
      message: 'Clocked in successfully',
      entry: result.rows[0],
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({
      error: 'Failed to clock in',
      message: 'Internal server error'
    });
  }
});

/**
 * Helper function to calculate Monday of the week for any date
 * Matches frontend's startOfWeek(new Date(), { weekStartsOn: 1 })
 */
function getWeekStartMonday(date) {
  // Get local date string (YYYY-MM-DD)
  const localDateStr = date.toLocaleDateString('en-CA');
  const [year, month, day] = localDateStr.split('-').map(Number);

  // Create local date object
  const localDate = new Date(year, month - 1, day);
  const dayOfWeek = localDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate Monday: if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
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

/**
 * Helper function to get week end (Sunday) from week start
 */
function getWeekEnd(weekStartStr) {
  const weekStart = new Date(weekStartStr);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const year = weekEnd.getFullYear();
  const month = String(weekEnd.getMonth() + 1).padStart(2, '0');
  const day = String(weekEnd.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Clock out
 * POST /api/timesheets/clock-out
 */
router.post('/clock-out', [
  body('comment').optional().trim(),
], async (req, res) => {
  try {
    const userId = req.userId;
    const { comment } = req.body;

    // Get active entry
    const activeEntry = await pool.query(
      `SELECT * FROM time_clock 
       WHERE user_id = $1 AND status IN ('clocked_in', 'paused')
       ORDER BY clock_in DESC LIMIT 1`,
      [userId]
    );

    if (activeEntry.rows.length === 0) {
      return res.status(400).json({
        error: 'No active entry',
        message: 'You are not currently clocked in'
      });
    }

    const entry = activeEntry.rows[0];
    const clockOutTime = new Date();
    const clockInTime = new Date(entry.clock_in);

    // Calculate total hours (excluding paused time)
    const totalMs = clockOutTime.getTime() - clockInTime.getTime();
    const pausedMs = (entry.paused_duration || 0) * 60 * 60 * 1000;
    const actualWorkMs = totalMs - pausedMs;
    let totalHours = actualWorkMs / (1000 * 60 * 60);

    // Ensure minimum of 0.01 hours (36 seconds) if there's any time difference at all
    // This handles cases where clock-in/out happens very quickly
    if (totalMs > 0 && totalHours < 0.01) {
      totalHours = 0.01;
      console.log('⚠️ Very short session detected, setting minimum to 0.01 hours');
    }

    // Update entry
    const result = await pool.query(
      `UPDATE time_clock 
       SET clock_out = $1,
           total_hours = $2,
           status = 'clocked_out',
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [clockOutTime, totalHours, entry.id]
    );

    // Add comment and activity to issue if linked
    if (entry.issue_id) {
      // Get issue details for estimated hours
      const issueResult = await pool.query(
        'SELECT title, estimated_hours FROM issues WHERE id = $1',
        [entry.issue_id]
      );
      const issue = issueResult.rows[0];
      const estimatedHours = issue ? (issue.estimated_hours || 0) : 0;

      // Construct automated time comment
      const formattedClockIn = clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedClockOut = clockOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let timeComment = `⏱️ **Time Tracked**\n`;
      timeComment += `- **Session:** ${formattedClockIn} - ${formattedClockOut}\n`;
      timeComment += `- **Duration:** ${totalHours.toFixed(2)} hours\n`;
      timeComment += `- **Estimate:** ${parseFloat(estimatedHours).toFixed(2)} hours\n`;

      if (comment) {
        timeComment += `\n**Note:** ${comment}`;
      }

      // Add comment
      await pool.query(
        `INSERT INTO issue_comments (issue_id, user_id, comment)
         VALUES ($1, $2, $3)`,
        [entry.issue_id, userId, timeComment]
      );

      // Add activity
      await pool.query(
        `INSERT INTO issue_activity (issue_id, user_id, action, details)
         VALUES ($1, $2, $3, $4)`,
        [
          entry.issue_id,
          userId,
          'work_completed',
          JSON.stringify({
            comment: comment || '',
            duration: totalHours,
            estimate: estimatedHours
          }),
        ]
      );
    }

    // Add to weekly timesheet
    // Always add hours to timesheet, even if very small (0.01h, etc.)
    console.log('\n=== STARTING TIMESHEET UPDATE ===');
    console.log('Clock-out entry ID:', entry.id);
    console.log('User ID:', userId);
    console.log('Clock in time:', clockInTime.toISOString());
    console.log('Clock out time:', clockOutTime.toISOString());
    console.log('Total hours calculated:', totalHours);

    let timesheetUpdateSuccess = false;
    let timesheetError = null;

    try {
      // Round to 2 decimal places to avoid floating point issues, but keep even very small values
      const roundedHours = Math.round(totalHours * 100) / 100;
      console.log('Rounded hours:', roundedHours);

      // Only add to timesheet if hours > 0 (even if very small like 0.01)
      // But also log if hours are 0 so we can debug
      if (roundedHours <= 0) {
        console.log('⚠️ Hours are 0 or negative, skipping timesheet update');
        console.log('Time difference (ms):', clockOutTime.getTime() - clockInTime.getTime());
        console.log('Paused duration (hours):', entry.paused_duration || 0);
        console.log('⚠️ This clock-out will NOT appear in timesheet because hours are 0');
      } else {
        console.log('✅ Hours > 0, proceeding with timesheet update...');

        // Calculate week start using helper function (simplified and consistent)
        const weekStartStr = getWeekStartMonday(clockOutTime);
        const weekEndStr = getWeekEnd(weekStartStr);

        // Get day of week for the clock-out date
        const localDateStr = clockOutTime.toLocaleDateString('en-CA');
        const [year, month, day] = localDateStr.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        const dayOfWeek = localDate.getDay();

        console.log('=== WEEK CALCULATION ===');
        console.log('Clock out time:', clockOutTime.toISOString());
        console.log('Local date:', localDateStr);
        console.log('Day of week:', dayOfWeek, '(', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek], ')');
        console.log('Week start (Monday):', weekStartStr);
        console.log('Week end (Sunday):', weekEndStr);

        // Map day of week to timesheet column (Monday = 1, Tuesday = 2, etc.)
        // Sunday = 0 maps to sun_hours, Monday = 1 maps to mon_hours, etc.
        const dayColumnMap = {
          0: 'sun_hours',   // Sunday
          1: 'mon_hours',   // Monday
          2: 'tue_hours',   // Tuesday
          3: 'wed_hours',   // Wednesday
          4: 'thu_hours',   // Thursday
          5: 'fri_hours',   // Friday
          6: 'sat_hours',   // Saturday
        };

        const dayColumn = dayColumnMap[dayOfWeek] || 'mon_hours';

        // Log which day the hours will be added to
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`📅 Clock-out day: ${dayNames[dayOfWeek]} (${dayOfWeek}) -> Column: ${dayColumn}`);
        console.log(`📅 Clock-out date: ${clockOutTime.toISOString().split('T')[0]}`);
        console.log(`📅 Week: ${weekStartStr} to ${weekEndStr}`);

        // Determine project and task - REWRITTEN for better reliability
        let project = entry.project_name || 'General';
        let task = 'General Work';

        // Get issue details if issue_id exists
        if (entry.issue_id) {
          try {
            const issueResult = await pool.query(
              `SELECT title, project_name FROM issues WHERE id = $1`,
              [entry.issue_id]
            );
            if (issueResult.rows.length > 0) {
              const issue = issueResult.rows[0];
              project = issue.project_name || entry.project_name || 'General';
              task = `Issue #${entry.issue_id}: ${issue.title || 'Untitled'}`;
            } else {
              // Issue not found, but still use issue_id in task name
              project = entry.project_name || 'General';
              task = `Issue #${entry.issue_id}`;
            }
          } catch (issueError) {
            console.error('⚠️ Error fetching issue details:', issueError);
            // Fallback: use issue_id even if fetch fails
            project = entry.project_name || 'General';
            task = `Issue #${entry.issue_id}`;
          }
        } else {
          // No issue_id - use project_name if available
          project = entry.project_name || 'General';
          task = 'General Work';
        }

        // Normalize project and task (trim whitespace)
        project = (project || 'General').trim();
        task = (task || 'General Work').trim();

        // Get or create timesheet FIRST (before logging)
        let timesheetId;
        const timesheetResult = await pool.query(
          `SELECT id FROM timesheets 
           WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)
           LIMIT 1`,
          [userId, weekStartStr]
        );

        if (timesheetResult.rows.length > 0) {
          timesheetId = timesheetResult.rows[0].id;
          console.log('✅ Found timesheet:', timesheetId);
        } else {
          // Create new timesheet
          const newTimesheet = await pool.query(
            `INSERT INTO timesheets (user_id, week_start, week_end, status)
             VALUES ($1, $2, $3, 'draft')
             RETURNING id`,
            [userId, weekStartStr, weekEndStr]
          );
          timesheetId = newTimesheet.rows[0].id;
          console.log('✅ Created timesheet:', timesheetId, 'for week', weekStartStr);
        }

        console.log('📝 Adding to timesheet:', {
          userId,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          dayOfWeek,
          dayColumn,
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
          project,
          task,
          totalHours: roundedHours,
          clockOutTime: clockOutTime.toISOString(),
          timesheetId
        });

        // Validate dayColumn to prevent SQL injection
        const validDayColumns = ['mon_hours', 'tue_hours', 'wed_hours', 'thu_hours', 'fri_hours', 'sat_hours', 'sun_hours'];
        if (!validDayColumns.includes(dayColumn)) {
          throw new Error(`Invalid day column: ${dayColumn}`);
        }

        // Find or create entry for this project/task - REWRITTEN for reliability
        console.log(`🔍 Looking for existing entry:`, {
          timesheetId,
          project,
          task,
          source: 'time_clock'
        });

        const existingEntry = await pool.query(
          `SELECT id, ${dayColumn} as current_hours, project, task FROM timesheet_entries 
           WHERE timesheet_id = $1 AND project = $2 AND task = $3 AND source = 'time_clock'
           LIMIT 1`,
          [timesheetId, project, task]
        );

        console.log(`🔍 Existing entry lookup:`, {
          found: existingEntry.rows.length > 0,
          entryId: existingEntry.rows[0]?.id,
          currentHours: existingEntry.rows[0]?.current_hours,
          storedProject: existingEntry.rows[0]?.project,
          storedTask: existingEntry.rows[0]?.task
        });

        if (existingEntry.rows.length > 0) {
          // Update: add hours to existing value
          const entryId = existingEntry.rows[0].id;
          const currentHours = parseFloat(existingEntry.rows[0].current_hours) || 0;
          const newHours = Math.round((currentHours + roundedHours) * 100) / 100;

          console.log(`📝 Updating entry ${entryId}:`, {
            dayColumn,
            currentHours,
            adding: roundedHours,
            newHours
          });

          const updateResult = await pool.query(
            `UPDATE timesheet_entries 
             SET ${dayColumn} = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, ${dayColumn}`,
            [newHours, entryId]
          );

          if (updateResult.rows.length > 0) {
            console.log(`✅ Successfully updated entry ${entryId}: ${dayColumn} = ${updateResult.rows[0][dayColumn]}`);
          } else {
            throw new Error(`Update failed - no rows returned for entry ${entryId}`);
          }
        } else {
          // Insert new entry - REWRITTEN for clarity
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

          console.log(`📝 Inserting new entry:`, {
            timesheetId,
            project,
            task,
            dayColumn,
            hours,
            source: 'time_clock'
          });

          const insertResult = await pool.query(
            `INSERT INTO timesheet_entries 
             (timesheet_id, project, task, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, source, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'time_clock', NOW(), NOW())
             RETURNING id, ${dayColumn}`,
            [timesheetId, project, task, ...hours]
          );

          if (insertResult.rows.length > 0) {
            console.log(`✅ Successfully created entry ${insertResult.rows[0].id}: ${dayColumn} = ${insertResult.rows[0][dayColumn]}`);

            // Verify the entry was saved
            const verifyResult = await pool.query(
              `SELECT id, project, task, ${dayColumn} FROM timesheet_entries WHERE id = $1`,
              [insertResult.rows[0].id]
            );
            if (verifyResult.rows.length > 0) {
              console.log(`✅ Verified entry saved:`, verifyResult.rows[0]);
            } else {
              throw new Error(`Entry ${insertResult.rows[0].id} not found after insert!`);
            }
          } else {
            throw new Error('Insert failed - no rows returned');
          }
        }
        console.log('=== TIMESHEET UPDATE COMPLETED SUCCESSFULLY ===');
        timesheetUpdateSuccess = true;
      }
    } catch (error) {
      timesheetError = error;
      console.error('❌ ERROR adding to timesheet:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error detail:', error.detail);
      console.error('Error stack:', error.stack);
      console.error('⚠️ Clock-out succeeded, but timesheet update failed.');
      console.error('⚠️ This means hours are NOT being added to the timesheet!');
      // Don't throw - allow clock-out to succeed even if timesheet update fails
      // Log the error but continue with the response
      // The user can manually refresh the timesheet if needed
    }

    // Always return success response, even if timesheet update had issues
    res.json({
      message: 'Clocked out successfully',
      entry: result.rows[0],
      total_hours: totalHours,
      timesheet_updated: timesheetUpdateSuccess, // Indicate if timesheet was updated
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({
      error: 'Failed to clock out',
      message: 'Internal server error'
    });
  }
});

/**
 * Pause time
 * POST /api/timesheets/pause
 */
router.post('/pause', [
  body('reason').optional().trim(),
], async (req, res) => {
  try {
    const userId = req.userId;
    const { reason } = req.body;

    const activeEntry = await pool.query(
      `SELECT * FROM time_clock 
       WHERE user_id = $1 AND status = 'clocked_in'
       ORDER BY clock_in DESC LIMIT 1`,
      [userId]
    );

    if (activeEntry.rows.length === 0) {
      return res.status(400).json({
        error: 'No active entry',
        message: 'You are not currently clocked in'
      });
    }

    const result = await pool.query(
      `UPDATE time_clock 
       SET status = 'paused',
           pause_start = NOW(),
           pause_reason = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason || null, activeEntry.rows[0].id]
    );

    res.json({
      message: 'Time paused',
      entry: result.rows[0],
    });
  } catch (error) {
    console.error('Pause error:', error);
    res.status(500).json({
      error: 'Failed to pause',
      message: 'Internal server error'
    });
  }
});

/**
 * Resume time
 * POST /api/timesheets/resume
 */
router.post('/resume', async (req, res) => {
  try {
    const userId = req.userId;

    const pausedEntry = await pool.query(
      `SELECT * FROM time_clock 
       WHERE user_id = $1 AND status = 'paused'
       ORDER BY pause_start DESC LIMIT 1`,
      [userId]
    );

    if (pausedEntry.rows.length === 0) {
      return res.status(400).json({
        error: 'No paused entry',
        message: 'You do not have a paused time entry'
      });
    }

    const entry = pausedEntry.rows[0];
    const pauseStart = new Date(entry.pause_start);
    const now = new Date();
    const pauseDurationMs = now.getTime() - pauseStart.getTime();
    const pauseDurationHours = pauseDurationMs / (1000 * 60 * 60);
    const totalPausedHours = (entry.paused_duration || 0) + pauseDurationHours;

    const result = await pool.query(
      `UPDATE time_clock 
       SET status = 'clocked_in',
           paused_duration = $1,
           pause_start = NULL,
           pause_reason = NULL,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [totalPausedHours, entry.id]
    );

    res.json({
      message: 'Time resumed',
      entry: result.rows[0],
    });
  } catch (error) {
    console.error('Resume error:', error);
    res.status(500).json({
      error: 'Failed to resume',
      message: 'Internal server error'
    });
  }
});

/**
 * Get current time entry
 * GET /api/timesheets/current
 */
router.get('/current', async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        tc.*,
        i.title as issue_title,
        i.project_name as issue_project
       FROM time_clock tc
       LEFT JOIN issues i ON tc.issue_id = i.id
       WHERE tc.user_id = $1 AND tc.status IN ('clocked_in', 'paused')
       ORDER BY tc.clock_in DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ entry: null });
    }

    const entry = result.rows[0];
    entry.issue = entry.issue_id ? {
      id: entry.issue_id,
      title: entry.issue_title,
      project_name: entry.issue_project,
    } : null;

    res.json({ entry });
  } catch (error) {
    console.error('Get current entry error:', error);
    res.status(500).json({
      error: 'Failed to get current entry',
      message: 'Internal server error'
    });
  }
});

/**
 * Get time entries
 * GET /api/timesheets/entries
 * Admin users can see all entries, regular users only see their own
 */
router.get('/entries', async (req, res) => {
  try {
    const userId = req.userId;
    const { start_date, end_date, status, limit, user_id } = req.query;

    // Check if user is admin
    const roleResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );
    const isAdmin = roleResult.rows[0]?.role === 'admin';

    let query = `
      SELECT 
        tc.*,
        i.title as issue_title,
        i.project_name as issue_project,
        u.email as user_email
      FROM time_clock tc
      LEFT JOIN issues i ON tc.issue_id = i.id
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Only filter by user_id if not admin, or if user_id is explicitly requested
    if (!isAdmin) {
      query += ` AND tc.user_id = $${paramCount++}`;
      params.push(userId);
    } else if (user_id) {
      query += ` AND tc.user_id = $${paramCount++}`;
      params.push(user_id);
    }

    if (start_date) {
      query += ` AND tc.clock_in >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND tc.clock_in <= $${paramCount++}`;
      params.push(end_date);
    }

    if (status) {
      query += ` AND tc.status = $${paramCount++}`;
      params.push(status);
    }

    const limitValue = limit ? parseInt(limit, 10) : 100;
    query += ` ORDER BY tc.clock_in DESC LIMIT $${paramCount++}`;
    params.push(limitValue);

    const result = await pool.query(query, params);

    res.json({
      entries: result.rows.map(entry => ({
        ...entry,
        issue: entry.issue_id ? {
          id: entry.issue_id,
          title: entry.issue_title,
          project_name: entry.issue_project,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({
      error: 'Failed to get entries',
      message: 'Internal server error'
    });
  }
});

/**
 * Get all active entries (Admin only)
 * GET /api/timesheets/active
 */
router.get('/active', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        tc.*,
        i.title as issue_title,
        i.project_name as issue_project,
        u.email as user_email,
        COALESCE(u.full_name, '') as user_full_name
      FROM time_clock tc
      LEFT JOIN issues i ON tc.issue_id = i.id
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.status IN ('clocked_in', 'paused')
      ORDER BY tc.clock_in DESC`
    );

    res.json({
      entries: result.rows.map(entry => ({
        ...entry,
        issue: entry.issue_id ? {
          id: entry.issue_id,
          title: entry.issue_title,
          project_name: entry.issue_project,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Get active entries error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get active entries',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * Get timesheets
 * GET /api/timesheets
 * Admins can view other users' timesheets by passing user_id query param
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔵 GET /api/timesheets called');
    console.log('Query params:', req.query);
    console.log('User ID from token:', req.userId);

    // Check if current user is admin
    const adminCheck = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1 AND role = $2',
      [req.userId, 'admin']
    );
    const isAdmin = adminCheck.rows.length > 0;

    // Determine which user's timesheet to fetch
    let targetUserId = req.userId; // Default to own timesheet
    const { week_start, user_id } = req.query;

    console.log('🔍 Request query params:', { week_start, user_id, req_userId: req.userId });
    console.log('🔍 Admin check result:', isAdmin);

    // If admin and user_id is provided, use that; otherwise use own user_id
    if (isAdmin && user_id) {
      targetUserId = user_id;
      console.log('👑 Admin viewing timesheet for user:', targetUserId);
      console.log('👑 Admin user ID:', req.userId);
      console.log('👑 Target user ID:', targetUserId);
    } else if (!isAdmin && user_id && user_id !== req.userId) {
      // Non-admin trying to view another user's timesheet - deny access
      console.log('❌ Non-admin trying to view another user\'s timesheet');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own timesheet'
      });
    } else {
      console.log('👤 User viewing own timesheet:', targetUserId);
    }

    console.log('✅ Final targetUserId:', targetUserId);

    // Build the base query to find all matching timesheets
    let query = `
      SELECT 
        t.id,
        t.user_id,
        t.week_start,
        t.week_end,
        t.status,
        t.created_at,
        t.updated_at
      FROM timesheets t
      WHERE t.user_id = $1
    `;

    const params = [targetUserId];

    if (week_start) {
      // Calculate the requested week end (6 days after week_start)
      const weekStartDate = new Date(week_start);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6); // Add 6 days to get Sunday
      const weekEndStr = weekEndDate.toISOString().split('T')[0];

      // Use overlap check: timesheet overlaps if its week_start <= requested week_end AND its week_end >= requested week_start
      // This ensures we catch all timesheets that overlap with the requested week
      query += ` AND (
        CAST(t.week_start AS DATE) = CAST($2 AS DATE) OR
        (CAST(t.week_start AS DATE) <= CAST($3 AS DATE) AND CAST(t.week_end AS DATE) >= CAST($2 AS DATE))
      )`;
      params.push(week_start, weekEndStr);
      console.log('Filtering by week_start with overlap check:', week_start, 'to', weekEndStr);
      console.log('Will match timesheets where week_start <=', weekEndStr, 'AND week_end >=', week_start);
    } else {
      console.log('No week_start filter - returning all timesheets');
    }

    // Order by week_start DESC to get most recent first
    query += ` ORDER BY t.week_start DESC`;

    console.log('🔍 Executing timesheet query:', query);
    console.log('🔍 Query params:', params);

    // First, get all matching timesheets
    const timesheetResult = await pool.query(query, params);
    console.log('🔍 Found', timesheetResult.rows.length, 'matching timesheet(s)');

    // Now fetch entries for each timesheet separately to avoid JOIN issues
    const timesheets = [];
    for (const t of timesheetResult.rows) {
      // Fetch entries for this timesheet
      const entriesResult = await pool.query(
        `SELECT 
          id,
          project,
          task,
          mon_hours,
          tue_hours,
          wed_hours,
          thu_hours,
          fri_hours,
          sat_hours,
          sun_hours,
          source
        FROM timesheet_entries
        WHERE timesheet_id = $1
        ORDER BY created_at ASC`,
        [t.id]
      );

      const entries = entriesResult.rows.map(e => ({
        id: e.id,
        project: e.project || '',
        task: e.task || '',
        mon_hours: e.mon_hours || 0,
        tue_hours: e.tue_hours || 0,
        wed_hours: e.wed_hours || 0,
        thu_hours: e.thu_hours || 0,
        fri_hours: e.fri_hours || 0,
        sat_hours: e.sat_hours || 0,
        sun_hours: e.sun_hours || 0,
        source: e.source || 'manual'
      }));

      console.log(`  Timesheet ${t.id}: ${entries.length} entries`);

      timesheets.push({
        ...t,
        week_start: t.week_start ? new Date(t.week_start).toISOString().split('T')[0] : t.week_start,
        week_end: t.week_end ? new Date(t.week_end).toISOString().split('T')[0] : t.week_end,
        entries: entries,
      });
    }


    console.log('=== TIMESHEET QUERY RESULTS ===');
    console.log('Target User ID:', targetUserId);
    console.log('Requested week_start:', week_start);
    console.log('Found timesheets:', timesheets.length);

    // Detailed logging for each timesheet
    timesheets.forEach((t, idx) => {
      console.log(`\nTimesheet ${idx + 1}:`, {
        id: t.id,
        week_start: t.week_start,
        week_end: t.week_end,
        entries_count: t.entries?.length || 0
      });

      // Log each entry, especially time_clock entries
      if (t.entries && t.entries.length > 0) {
        t.entries.forEach((e, eIdx) => {
          const totalHours = (e.mon_hours || 0) + (e.tue_hours || 0) + (e.wed_hours || 0) +
            (e.thu_hours || 0) + (e.fri_hours || 0) + (e.sat_hours || 0) +
            (e.sun_hours || 0);
          console.log(`  Entry ${eIdx + 1}:`, {
            id: e.id,
            project: e.project,
            task: e.task,
            source: e.source,
            total_hours: totalHours,
            hours: {
              mon: e.mon_hours,
              tue: e.tue_hours,
              wed: e.wed_hours,
              thu: e.thu_hours,
              fri: e.fri_hours,
              sat: e.sat_hours,
              sun: e.sun_hours
            }
          });
        });
      } else {
        console.log('  No entries found for this timesheet');
      }
    });

    // Count time_clock entries specifically
    const timeClockEntries = timesheets.flatMap(t =>
      (t.entries || []).filter(e => e.source === 'time_clock')
    );
    console.log(`\nTotal time_clock entries found: ${timeClockEntries.length}`);
    if (timeClockEntries.length > 0) {
      console.log('Time clock entries:', timeClockEntries.map(e => ({
        project: e.project,
        task: e.task,
        total: (e.mon_hours || 0) + (e.tue_hours || 0) + (e.wed_hours || 0) +
          (e.thu_hours || 0) + (e.fri_hours || 0) + (e.sat_hours || 0) +
          (e.sun_hours || 0)
      })));
    }

    console.log('=== END TIMESHEET QUERY RESULTS ===');

    res.json({
      timesheets,
    });
  } catch (error) {
    console.error('❌ Get timesheets error:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get timesheets',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * Save timesheet (create or update)
 * POST /api/timesheets
 */
router.post('/', [
  body('week_start').isISO8601(),
  body('entries').isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUserId = req.userId;
    const { week_start, entries, user_id } = req.body;

    // Check if current user is admin
    const adminCheck = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1 AND role = $2',
      [currentUserId, 'admin']
    );
    const isAdmin = adminCheck.rows.length > 0;

    // Determine which user's timesheet to save
    let targetUserId = currentUserId; // Default to own timesheet
    if (isAdmin && user_id) {
      targetUserId = user_id;
      console.log('👑 Admin saving timesheet for user:', targetUserId);
    } else if (!isAdmin && user_id && user_id !== currentUserId) {
      // Non-admin trying to save another user's timesheet - deny access
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only save your own timesheet'
      });
    }

    // Calculate week end using helper function
    const weekEndStr = getWeekEnd(week_start);

    console.log('=== SAVING TIMESHEET ===');
    console.log('Current User ID:', currentUserId);
    console.log('Target User ID:', targetUserId);
    console.log('Week start:', week_start);
    console.log('Week end:', weekEndStr);
    console.log('Entries to save:', entries.length);

    // Get or create timesheet (simplified)
    let timesheetResult = await pool.query(
      `SELECT id FROM timesheets 
       WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)
       LIMIT 1`,
      [targetUserId, week_start]
    );

    let timesheetId;
    if (timesheetResult.rows.length > 0) {
      timesheetId = timesheetResult.rows[0].id;
      console.log('Found timesheet:', timesheetId);
    } else {
      const newTimesheet = await pool.query(
        `INSERT INTO timesheets (user_id, week_start, week_end, status)
         VALUES ($1, $2, $3, 'draft')
         RETURNING id`,
        [userId, week_start, weekEndStr]
      );
      timesheetId = newTimesheet.rows[0].id;
      console.log('Created timesheet:', timesheetId);
    }

    // Delete existing manual entries (not time_clock or leave)
    await pool.query(
      `DELETE FROM timesheet_entries 
       WHERE timesheet_id = $1 AND source = 'manual'`,
      [timesheetId]
    );

    // Helper function to convert to number, ensuring proper type conversion
    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? 0 : num;
    };

    // Insert new entries
    let insertedCount = 0;
    for (const entry of entries) {
      // Skip entries that are time_clock or leave (they're managed separately)
      if (entry.source === 'time_clock' || entry.source === 'leave') {
        console.log('Skipping entry (time_clock or leave):', entry.project, entry.task);
        continue;
      }

      // Skip empty entries (must have both project and task)
      if (!entry.project || !entry.task) {
        console.log('Skipping empty entry (missing project or task):', {
          project: entry.project,
          task: entry.task
        });
        continue;
      }

      // Convert all hours to proper numbers
      const monHours = toNumber(entry.mon_hours);
      const tueHours = toNumber(entry.tue_hours);
      const wedHours = toNumber(entry.wed_hours);
      const thuHours = toNumber(entry.thu_hours);
      const friHours = toNumber(entry.fri_hours);
      const satHours = toNumber(entry.sat_hours);
      const sunHours = toNumber(entry.sun_hours);

      // Calculate total hours
      const totalHours = monHours + tueHours + wedHours + thuHours + friHours + satHours + sunHours;

      // Skip entries with no hours
      if (totalHours === 0) {
        console.log('Skipping entry with zero hours:', {
          project: entry.project,
          task: entry.task
        });
        continue;
      }

      console.log('💾 Inserting entry:', {
        project: entry.project,
        task: entry.task,
        totalHours,
        hours: {
          mon: monHours,
          tue: tueHours,
          wed: wedHours,
          thu: thuHours,
          fri: friHours,
          sat: satHours,
          sun: sunHours,
        },
        originalValues: {
          mon: entry.mon_hours,
          tue: entry.tue_hours,
          wed: entry.wed_hours,
          thu: entry.thu_hours,
          fri: entry.fri_hours,
          sat: entry.sat_hours,
          sun: entry.sun_hours,
        }
      });

      await pool.query(
        `INSERT INTO timesheet_entries (
          timesheet_id, project, task, source,
          mon_hours, tue_hours, wed_hours, thu_hours,
          fri_hours, sat_hours, sun_hours,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          timesheetId,
          entry.project.trim(),
          entry.task.trim(),
          'manual',
          monHours,
          tueHours,
          wedHours,
          thuHours,
          friHours,
          satHours,
          sunHours,
        ]
      );
      insertedCount++;
      console.log(`✅ Entry ${insertedCount} saved successfully`);
    }

    console.log(`✅ Successfully saved ${insertedCount} entries to timesheet ${timesheetId}`);
    console.log('=== TIMESHEET SAVE COMPLETED ===');

    res.json({
      message: 'Timesheet saved successfully',
      timesheet_id: timesheetId,
      entries_saved: insertedCount,
    });
  } catch (error) {
    console.error('❌ Save timesheet error:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to save timesheet',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * Get timesheet by ID (public - for sharing)
 * GET /api/timesheets/:id
 * NOTE: This route must be AFTER all specific routes like /active, /entries, etc.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        t.*,
        json_agg(
          jsonb_build_object(
            'id', te.id,
            'project', te.project,
            'task', te.task,
            'mon_hours', te.mon_hours,
            'tue_hours', te.tue_hours,
            'wed_hours', te.wed_hours,
            'thu_hours', te.thu_hours,
            'fri_hours', te.fri_hours,
            'sat_hours', te.sat_hours,
            'sun_hours', te.sun_hours,
            'source', te.source
          )
        ) FILTER (WHERE te.id IS NOT NULL) as entries
      FROM timesheets t
      LEFT JOIN timesheet_entries te ON t.id = te.timesheet_id
      WHERE t.id = $1
      GROUP BY t.id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Timesheet not found',
        message: 'The requested timesheet does not exist'
      });
    }

    const timesheet = result.rows[0];
    res.json({
      timesheet: {
        ...timesheet,
        entries: timesheet.entries || [],
      },
    });
  } catch (error) {
    console.error('Get timesheet by ID error:', error);
    res.status(500).json({
      error: 'Failed to get timesheet',
      message: 'Internal server error'
    });
  }
});

export default router;

