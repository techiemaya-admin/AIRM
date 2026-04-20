/**
 * Timesheet Service
 * Business logic for timesheet operations
 */

import * as timesheetModel from '../models/timesheet.pg.js';
import * as utils from './timesheet-utils.service.js';

/**
 * Get timesheets
 */
export async function getTimesheets(userId, weekStart) {
  const timesheets = await timesheetModel.getTimesheets(userId, weekStart);

  // Fetch entries for each timesheet
  const timesheetsWithEntries = [];
  for (const t of timesheets) {
    const entries = await timesheetModel.getTimesheetEntries(t.id);

    timesheetsWithEntries.push({
      ...t,
      week_start: t.week_start ? new Date(t.week_start).toISOString().split('T')[0] : t.week_start,
      week_end: t.week_end ? new Date(t.week_end).toISOString().split('T')[0] : t.week_end,
      entries: entries.map(e => ({
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
      })),
    });
  }

  return timesheetsWithEntries;
}

/**
 * Save timesheet
 */
export async function saveTimesheet(userId, weekStart, entries) {
  const weekEndStr = utils.getWeekEnd(weekStart);

  // Get or create timesheet
  let timesheet = await timesheetModel.getTimesheetByWeek(userId, weekStart);
  let timesheetId;

  if (timesheet) {
    timesheetId = timesheet.id;
  } else {
    timesheetId = await timesheetModel.createTimesheet(userId, weekStart, weekEndStr);
  }

  // Delete existing manual entries
  await timesheetModel.deleteManualEntries(timesheetId);

  // Insert new entries
  let insertedCount = 0;
  for (const entry of entries) {
    // Skip entries that are time_clock or leave
    if (entry.source === 'time_clock' || entry.source === 'leave') {
      continue;
    }

    // Skip empty entries
    if (!entry.project || !entry.task) {
      continue;
    }

    // Convert all hours to proper numbers
    const monHours = utils.toNumber(entry.mon_hours);
    const tueHours = utils.toNumber(entry.tue_hours);
    const wedHours = utils.toNumber(entry.wed_hours);
    const thuHours = utils.toNumber(entry.thu_hours);
    const friHours = utils.toNumber(entry.fri_hours);
    const satHours = utils.toNumber(entry.sat_hours);
    const sunHours = utils.toNumber(entry.sun_hours);

    // Calculate total hours
    const totalHours = monHours + tueHours + wedHours + thuHours + friHours + satHours + sunHours;

    // Removed totalHours === 0 skip, allow saving tasks with 0 hours

    await timesheetModel.createTimesheetEntry(timesheetId, {
      project: entry.project,
      task: entry.task,
      mon_hours: monHours,
      tue_hours: tueHours,
      wed_hours: wedHours,
      thu_hours: thuHours,
      fri_hours: friHours,
      sat_hours: satHours,
      sun_hours: sunHours,
    });

    insertedCount++;
  }

  return {
    timesheet_id: timesheetId,
    entries_saved: insertedCount,
  };
}

/**
 * Get timesheet by ID
 */
export async function getTimesheetById(timesheetId) {
  const timesheet = await timesheetModel.getTimesheetById(timesheetId);

  if (!timesheet) {
    throw new Error('Timesheet not found');
  }

  return {
    ...timesheet,
    entries: timesheet.entries || [],
  };
}

