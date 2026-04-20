/**
 * Time Clock Service
 * Business logic for time clock operations
 */

import * as timeClockModel from '../models/time-clock.pg.js';
import * as timesheetModel from '../models/timesheet.pg.js';
import * as utils from './timesheet-utils.service.js';

/**
 * Clock in
 */
export async function clockIn(userId, clockInData) {
  const { issue_id, project_name, latitude, longitude, location_address } = clockInData;
  console.log('🔵 Time clock service - checking for active entry:', userId);

  // Check if user already has an active clock-in
  const activeEntry = await timeClockModel.getActiveEntry(userId);
  if (activeEntry) {
    console.log('⚠️ User already has active entry:', activeEntry.id);
    throw new Error('Already clocked in');
  }

  console.log('🔵 Creating new clock-in entry...');
  // Create new clock-in entry
  const result = await timeClockModel.createClockIn(
    userId,
    issue_id,
    project_name,
    latitude,
    longitude,
    location_address
  );
  console.log('✅ Clock-in entry created:', result.id);

  // Fetch issue details to return full object
  let issueDetails = null;
  if (result.issue_id) {
    try {
      const issue = await timesheetModel.getIssueDetails(result.issue_id);
      if (issue) {
        issueDetails = {
          id: result.issue_id,
          title: issue.title,
          project_name: issue.project_name,
          estimated_hours: issue.estimated_hours
        };
      }
    } catch (err) {
      console.warn('Could not fetch issue details for clock-in response:', err);
    }
  }

  return {
    ...result,
    issue: issueDetails
  };
}

/**
 * Clock out
 */
export async function clockOut(userId, comment) {
  console.log('🔴 Clock-out service called for user:', userId);

  // Get active entry
  const activeEntry = await timeClockModel.getActiveEntry(userId);
  if (!activeEntry) {
    console.log('⚠️ No active entry found for user:', userId);
    throw new Error('No active entry');
  }

  console.log('✅ Found active entry:', activeEntry.id);

  let clockOutTime = new Date();
  const clockInTime = new Date(activeEntry.clock_in);
  const pausedDuration = activeEntry.paused_duration || 0;

  // Auto clock-out at end of day logic:
  // If the user forgot to clock out and is clocking out on a different day,
  // we retroactively cap their clock-out time to 23:59:59 of the day they clocked in.
  const clockInDateStr = clockInTime.toLocaleDateString('en-CA');
  const clockOutDateStr = clockOutTime.toLocaleDateString('en-CA');

  if (clockInDateStr !== clockOutDateStr) {
    console.log('⚠️ Cross-day clock out detected. Auto clocking out at end of the clock-in day.');
    const [year, month, day] = clockInDateStr.split('-').map(Number);
    clockOutTime = new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  console.log('🕐 Clock times - In:', clockInTime, 'Out:', clockOutTime, 'Paused:', pausedDuration);

  // Calculate total hours
  const totalHours = utils.calculateTotalHours(clockInTime, clockOutTime, pausedDuration);
  console.log('⏱️ Total hours calculated:', totalHours);

  // Update entry
  console.log('💾 Updating clock-out in database...');
  const updatedEntry = await timeClockModel.updateClockOut(activeEntry.id, clockOutTime, totalHours);
  console.log('✅ Clock-out updated successfully');

  // Get issue details if available to get estimated hours
  let estimatedHours = 0;
  if (activeEntry.issue_id) {
    try {
      const issue = await timesheetModel.getIssueDetails(activeEntry.issue_id);
      if (issue) {
        estimatedHours = issue.estimated_hours || 0;
      }
    } catch (err) {
      console.warn('Could not fetch issue details:', err.message);
    }
  }

  // Add automated time tracking comment
  if (activeEntry.issue_id) {
    console.log('💬 Adding automated time comment to issue:', activeEntry.issue_id);

    const formattedClockIn = clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedClockOut = clockOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let timeComment = `⏱️ **Time Tracked**\n`;
    timeComment += `- **Session:** ${formattedClockIn} - ${formattedClockOut}\n`;
    timeComment += `- **Duration:** ${totalHours.toFixed(2)} hours\n`;
    timeComment += `- **Estimate:** ${parseFloat(estimatedHours).toFixed(2)} hours\n`;

    if (comment) {
      timeComment += `\n**Note:** ${comment}`;
    }

    await timesheetModel.addIssueComment(activeEntry.issue_id, userId, timeComment);
    await timesheetModel.addIssueActivity(activeEntry.issue_id, userId, 'work_completed', {
      duration: totalHours,
      estimate: estimatedHours,
      note: comment
    });
  }

  // Add to weekly timesheet
  let timesheetUpdateSuccess = false;
  try {
    console.log('📊 Starting timesheet update...');
    if (totalHours > 0) {
      const weekStartStr = utils.getWeekStartMonday(clockOutTime);
      const weekEndStr = utils.getWeekEnd(weekStartStr);

      const localDateStr = clockOutTime.toLocaleDateString('en-CA');
      const [year, month, day] = localDateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const dayOfWeek = localDate.getDay();
      const dayColumn = utils.getDayColumn(dayOfWeek);

      // Determine project and task
      let project = activeEntry.project_name || 'General';
      let task = 'General Work';

      if (activeEntry.issue_id) {
        const issue = await timesheetModel.getIssueDetails(activeEntry.issue_id);
        if (issue) {
          project = issue.project_name || activeEntry.project_name || 'General';
          task = `Issue #${activeEntry.issue_id}: ${issue.title || 'Untitled'}`;
        } else {
          project = activeEntry.project_name || 'General';
          task = `Issue #${activeEntry.issue_id}`;
        }
      }

      project = (project || 'General').trim();
      task = (task || 'General Work').trim();

      // Get or create timesheet
      let timesheet = await timesheetModel.getTimesheetByWeek(userId, weekStartStr);
      let timesheetId;

      if (timesheet) {
        timesheetId = timesheet.id;
      } else {
        timesheetId = await timesheetModel.createTimesheet(userId, weekStartStr, weekEndStr);
      }

      // Find or create entry
      const existingEntry = await timesheetModel.getOrCreateTimeClockEntry(timesheetId, project, task);

      if (existingEntry) {
        const currentHours = parseFloat(existingEntry[dayColumn]) || 0;
        const newHours = Math.round((currentHours + totalHours) * 100) / 100;
        await timesheetModel.updateTimesheetEntryHours(existingEntry.id, dayColumn, newHours);
      } else {
        await timesheetModel.createTimesheetEntryForDay(timesheetId, project, task, dayColumn, totalHours);
      }

      timesheetUpdateSuccess = true;
    }
  } catch (error) {
    console.error('Error adding to timesheet:', error);
    // Don't throw - allow clock-out to succeed even if timesheet update fails
  }

  return {
    entry: updatedEntry,
    total_hours: totalHours,
    timesheet_updated: timesheetUpdateSuccess,
  };
}

/**
 * Pause time
 */
export async function pauseTime(userId, reason) {
  const activeEntry = await timeClockModel.getActiveEntry(userId);
  if (!activeEntry || activeEntry.status !== 'clocked_in') {
    throw new Error('No active entry');
  }

  return await timeClockModel.pauseEntry(activeEntry.id, reason);
}

/**
 * Resume time
 */
export async function resumeTime(userId) {
  const pausedEntry = await timeClockModel.getActiveEntry(userId);
  if (!pausedEntry || pausedEntry.status !== 'paused') {
    throw new Error('No paused entry');
  }

  const now = new Date();
  const pauseStart = pausedEntry.pause_start ? new Date(pausedEntry.pause_start) : now;

  // Calculate duration, ensuring we don't get NaN
  const pauseStartMs = pauseStart.getTime();
  const pauseDurationMs = isNaN(pauseStartMs) ? 0 : now.getTime() - pauseStartMs;
  const pauseDurationHours = Math.max(0, pauseDurationMs / (1000 * 60 * 60));

  // Use parseFloat and fallback to 0 to ensure we don't do string concatenation or get NaN
  const existingPausedHours = parseFloat(pausedEntry.paused_duration || 0) || 0;
  const totalPausedHours = Math.round((existingPausedHours + pauseDurationHours) * 10000) / 10000;

  console.log('🔄 Resuming time:', {
    entryId: pausedEntry.id,
    pauseStart,
    pauseDurationHours,
    existingPausedHours,
    totalPausedHours
  });

  return await timeClockModel.resumeEntry(pausedEntry.id, totalPausedHours);
}

/**
 * Helper to ensure numeric fields are numbers
 */
function mapEntry(entry) {
  if (!entry) return null;
  return {
    ...entry,
    paused_duration: entry.paused_duration ? parseFloat(entry.paused_duration) : 0,
    total_hours: entry.total_hours ? parseFloat(entry.total_hours) : null,
    latitude: entry.latitude ? parseFloat(entry.latitude) : null,
    longitude: entry.longitude ? parseFloat(entry.longitude) : null,
    issue: entry.issue_id ? {
      id: entry.issue_id,
      title: entry.issue_title,
      project_name: entry.issue_project,
    } : null,
  };
}

/**
 * Get current time entry
 */
export async function getCurrentEntry(userId) {
  const entry = await timeClockModel.getCurrentEntry(userId);
  return mapEntry(entry);
}

/**
 * Get time clock entries
 */
export async function getTimeClockEntries(userId, isAdmin, filters) {
  const entries = await timeClockModel.getTimeClockEntries(userId, isAdmin, filters);
  return entries.map(mapEntry);
}

/**
 * Get all active entries
 */
export async function getAllActiveEntries() {
  const entries = await timeClockModel.getAllActiveEntries();
  return entries.map(mapEntry);
}

