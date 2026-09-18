/**
 * Time Tracking Utilities for FJT Board Issues
 * Aggregates Time Clock entries matching tasks, stories, and bugs.
 */

import { FjtIssue } from './types';

export interface IssueTimeLogSession {
  id: string;
  sessionNumber: number;
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Sep 17, 2026" or "Today"
  startTime: string; // e.g. "10:15 AM"
  endTime: string; // e.g. "12:00 PM" or "In Progress"
  durationSeconds: number;
  formattedDuration: string; // e.g. "1h 45m"
  notes: string;
  addedOn: string;
  userName?: string;
  userInitials?: string;
  isOngoing?: boolean;
}

export interface IssueDailyTimeBreakdown {
  dateStr: string;
  label: string; // e.g. "Today • Sep 17, 2026", "Yesterday • Sep 16, 2026"
  totalSeconds: number;
  formattedTotal: string; // e.g. "2h 10m"
  sessions: IssueTimeLogSession[];
}

export interface IssueTimeTrackingSummary {
  issueId: string;
  issueKey: string;
  totalSeconds: number;
  formattedTotal: string; // e.g. "4h 35m"
  totalSessions: number;
  firstTracked: string | null;
  lastTracked: string | null;
  sessions: IssueTimeLogSession[];
  dailyBreakdown: IssueDailyTimeBreakdown[];
  chartData: { date: string; displayDate: string; hours: number; durationText: string }[];
}

export function formatDurationHoursMinutes(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) {
    return '0h 00m';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatTimeAmPm(isoString?: string | null): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:--';
  }
}

export function formatDateMedium(isoString?: string | null): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
}

export function formatDateTimeMedium(isoString?: string | null): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return '--';
  }
}

/**
 * Checks if a timesheet entry belongs to the specified issue.
 */
export function isEntryMatchingIssue(entry: any, issue: FjtIssue): boolean {
  if (!entry || !issue) return false;

  const key = (issue.key || '').trim().toLowerCase();
  const summary = (issue.summary || '').trim().toLowerCase();
  const numericId = (issue as any).numericId;
  const issueId = String(issue.id || '').toLowerCase();

  // 1. Check direct issue_id
  if (entry.issue_id !== undefined && entry.issue_id !== null) {
    if (numericId && Number(entry.issue_id) === Number(numericId)) return true;
    if (String(entry.issue_id).toLowerCase() === issueId) return true;
  }

  // 2. Check entry.notes
  const notes = (entry.notes || '').toLowerCase();
  if (notes) {
    if (key && (notes.includes(key) || notes.includes(`[${key}]`))) return true;
    if (summary && summary.length > 5 && notes.includes(summary)) return true;
  }

  // 3. Check entry.issue object
  if (entry.issue) {
    const issueTitle = (entry.issue.title || '').toLowerCase();
    if (key && issueTitle.includes(key)) return true;
    if (summary && summary.length > 5 && issueTitle.includes(summary)) return true;
    if (numericId && Number(entry.issue.id) === Number(numericId)) return true;
    if (String(entry.issue.id).toLowerCase() === issueId) return true;
  }

  return false;
}

/**
 * Aggregates all time tracking data for a specific issue from time clock entries and active session.
 */
export function getIssueTimeTrackingData(
  issue: FjtIssue,
  allEntries: any[] = [],
  activeEntryOrEntries: any = null
): IssueTimeTrackingSummary {
  const matchedEntries: any[] = [];

  // Match completed past entries
  if (Array.isArray(allEntries)) {
    allEntries.forEach((entry) => {
      if (isEntryMatchingIssue(entry, issue)) {
        matchedEntries.push(entry);
      }
    });
  }

  // Support array of active entries or single active entry
  const activeList: any[] = Array.isArray(activeEntryOrEntries)
    ? activeEntryOrEntries
    : activeEntryOrEntries
    ? [activeEntryOrEntries]
    : [];

  activeList.forEach((activeEntry) => {
    if (activeEntry && isEntryMatchingIssue(activeEntry, issue)) {
      // Don't duplicate if already in list
      if (!matchedEntries.some((e) => e.id === activeEntry.id)) {
        matchedEntries.push(activeEntry);
      }
    }
  });

  // Sort chronological (oldest to newest)
  matchedEntries.sort((a, b) => {
    const timeA = new Date(a.clock_in || a.created_at || 0).getTime();
    const timeB = new Date(b.clock_in || b.created_at || 0).getTime();
    return timeA - timeB;
  });

  const now = Date.now();
  const sessions: IssueTimeLogSession[] = [];
  let totalSeconds = 0;
  let firstTrackedIso: string | null = null;
  let lastTrackedIso: string | null = null;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const dailyMap: Record<string, IssueTimeLogSession[]> = {};

  matchedEntries.forEach((entry, idx) => {
    const clockInIso = entry.clock_in;
    if (!clockInIso) return;

    if (!firstTrackedIso) {
      firstTrackedIso = clockInIso;
    }

    const clockInTime = new Date(clockInIso).getTime();
    const isOngoing =
      !entry.clock_out &&
      (entry.status === 'clocked_in' ||
        entry.status === 'active' ||
        entry.status === 'paused' ||
        entry.status === 'in_progress' ||
        !entry.total_hours ||
        activeList.some((ae) => ae.id === entry.id));
    const clockOutTime = entry.clock_out ? new Date(entry.clock_out).getTime() : (isOngoing ? now : clockInTime);
    const pausedSeconds = (Number(entry.paused_duration || 0) * 3600) || 0;

    let durationSec = Math.max(0, Math.floor((clockOutTime - clockInTime) / 1000) - pausedSeconds);
    if (entry.total_hours && !isOngoing) {
      durationSec = Math.round(Number(entry.total_hours) * 3600);
    }

    totalSeconds += durationSec;

    if (entry.clock_out) {
      lastTrackedIso = entry.clock_out;
    } else if (clockInIso) {
      lastTrackedIso = clockInIso;
    }

    const entryDate = new Date(clockInIso);
    const dateStr = !isNaN(entryDate.getTime()) ? entryDate.toISOString().split('T')[0] : todayStr;

    let displayDate = formatDateMedium(clockInIso);
    if (dateStr === todayStr) displayDate = 'Today';
    else if (dateStr === yesterdayStr) displayDate = 'Yesterday';

    const session: IssueTimeLogSession = {
      id: entry.id || `session-${idx + 1}`,
      sessionNumber: idx + 1,
      dateStr,
      displayDate,
      startTime: formatTimeAmPm(clockInIso),
      endTime: isOngoing ? 'In Progress' : formatTimeAmPm(entry.clock_out),
      durationSeconds: durationSec,
      formattedDuration: formatDurationHoursMinutes(durationSec),
      notes: entry.notes || entry.issue?.title || issue.summary,
      addedOn: formatDateTimeMedium(entry.clock_out || clockInIso),
      userName: entry.user?.full_name || entry.user?.name || 'User',
      userInitials: (entry.user?.full_name || entry.user?.name || 'U')
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U',
      isOngoing,
    };

    sessions.push(session);

    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = [];
    }
    dailyMap[dateStr].push(session);
  });

  // Build daily breakdown
  const dailyBreakdown: IssueDailyTimeBreakdown[] = Object.keys(dailyMap)
    .sort((a, b) => b.localeCompare(a)) // Newest day first
    .map((dateStr) => {
      const daySessions = dailyMap[dateStr];
      const dayTotalSec = daySessions.reduce((acc, s) => acc + s.durationSeconds, 0);

      let label = formatDateMedium(dateStr);
      if (dateStr === todayStr) {
        label = `Today • ${formatDateMedium(dateStr)}`;
      } else if (dateStr === yesterdayStr) {
        label = `Yesterday • ${formatDateMedium(dateStr)}`;
      }

      return {
        dateStr,
        label,
        totalSeconds: dayTotalSec,
        formattedTotal: formatDurationHoursMinutes(dayTotalSec),
        sessions: daySessions.sort((a, b) => b.sessionNumber - a.sessionNumber),
      };
    });

  // Build chart data (last 7 tracked dates or chronological)
  const chartData = Object.keys(dailyMap)
    .sort((a, b) => a.localeCompare(b))
    .map((dateStr) => {
      const daySessions = dailyMap[dateStr];
      const dayTotalSec = daySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
      const hours = Number((dayTotalSec / 3600).toFixed(2));
      return {
        date: dateStr,
        displayDate: formatDateMedium(dateStr),
        hours,
        durationText: formatDurationHoursMinutes(dayTotalSec),
      };
    });

  return {
    issueId: issue.id,
    issueKey: issue.key,
    totalSeconds,
    formattedTotal: formatDurationHoursMinutes(totalSeconds),
    totalSessions: sessions.length,
    firstTracked: firstTrackedIso ? formatDateMedium(firstTrackedIso) : null,
    lastTracked: lastTrackedIso ? formatDateMedium(lastTrackedIso) : null,
    sessions: [...sessions].reverse(), // Newest logs first
    dailyBreakdown,
    chartData,
  };
}
