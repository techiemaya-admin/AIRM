import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FjtIssue,
  IssueTimeTrackingSummary,
  getIssueTimeTrackingData,
} from '@/sdk/features/fjt-board';
import { IssueTypeIcon } from './IssueCard';
import {
  Clock,
  Calendar,
  Layers,
  Sparkles,
  List,
  Activity as ActivityIcon,
  X,
  History,
  TrendingUp,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';

interface IssueTimeTrackingDialogProps {
  issue: FjtIssue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTimesheetEntries?: any[];
  activeTimesheetEntry?: any;
}

export const IssueTimeTrackingDialog: React.FC<IssueTimeTrackingDialogProps> = ({
  issue,
  open,
  onOpenChange,
  allTimesheetEntries = [],
  activeTimesheetEntry = null,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'daily' | 'activity'>('logs');

  // Reset to 'logs' tab whenever dialog opens or issue changes
  useEffect(() => {
    if (open) {
      setActiveTab('logs');
    }
  }, [open, issue?.id]);

  const trackingData: IssueTimeTrackingSummary = useMemo(() => {
    if (!issue) {
      return {
        issueId: '',
        issueKey: '',
        totalSeconds: 0,
        formattedTotal: '0h 00m',
        totalSessions: 0,
        firstTracked: null,
        lastTracked: null,
        sessions: [],
        dailyBreakdown: [],
        chartData: [],
      };
    }
    return getIssueTimeTrackingData(issue, allTimesheetEntries, activeTimesheetEntry);
  }, [issue, allTimesheetEntries, activeTimesheetEntry]);

  if (!issue) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideDefaultClose
        className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[900px] max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-white p-0 gap-0 shadow-2xl rounded-2xl border border-gray-200"
      >
        {/* Modal Top Header */}
        <div className="py-3.5 sm:py-4 px-5 sm:px-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/70 flex-shrink-0">
          <div className="flex items-center gap-2">
            <IssueTypeIcon type={issue.type} className="h-4 w-4" />
            <DialogTitle className="font-bold text-gray-900 text-sm tracking-tight">
              Time Tracking
            </DialogTitle>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 transition-colors"
            title="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white">
          {/* Issue Title & Badges */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
              {issue.summary}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {(issue.epicName || issue.epicKey) && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded tracking-wide uppercase flex items-center gap-1 shadow-2xs"
                  style={{
                    backgroundColor: `${issue.epicColor || '#ea580c'}1f`,
                    color: issue.epicColor || '#ea580c',
                    border: `1px solid ${issue.epicColor || '#ea580c'}44`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: issue.epicColor || '#ea580c' }}
                  />
                  <span>{issue.epicName || issue.epicKey}</span>
                </span>
              )}
              {issue.status && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200/80 uppercase">
                  {issue.status.replace('_', ' ')}
                </span>
              )}
              {issue.assignee && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 flex items-center gap-1">
                  <User className="h-3 w-3 text-gray-500" />
                  <span>{issue.assignee.name}</span>
                </span>
              )}
            </div>
          </div>

          {/* Metric Summary Cards (4 Cards Grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Time Spent */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/60 border border-blue-100/90 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-900/70">
                  Total Time Spent
                </p>
                <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                  {trackingData.formattedTotal}
                </p>
              </div>
            </div>

            {/* Total Sessions */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-purple-50/60 border border-purple-100/90 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <History className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-900/70">
                  Work Sessions
                </p>
                <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                  {trackingData.totalSessions}
                </p>
              </div>
            </div>

            {/* First Tracked */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/60 border border-emerald-100/90 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900/70">
                  First Tracked
                </p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate mt-1">
                  {trackingData.firstTracked || 'Not started'}
                </p>
              </div>
            </div>

            {/* Last Tracked */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/60 border border-amber-100/90 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900/70">
                  Last Tracked
                </p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate mt-1">
                  {trackingData.lastTracked || 'Not started'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-2 -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'logs'
                    ? 'border-[#0B1957] text-[#0B1957]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Time Logs</span>
                <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.2 rounded-full font-bold text-gray-600">
                  {trackingData.sessions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'daily'
                    ? 'border-[#0B1957] text-[#0B1957]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Daily Breakdown</span>
                <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.2 rounded-full font-bold text-gray-600">
                  {trackingData.dailyBreakdown.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'activity'
                    ? 'border-[#0B1957] text-[#0B1957]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <ActivityIcon className="h-3.5 w-3.5" />
                <span>Activity</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Time Logs Table */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              {trackingData.sessions.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">No time entries recorded yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Clock in on this issue from the Time Clock page to automatically track working time and history.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-2xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-50/90 text-gray-700 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2.5 w-10 text-center">#</th>
                        <th className="px-3 py-2.5">Start Time</th>
                        <th className="px-3 py-2.5">End Time</th>
                        <th className="px-3 py-2.5">Duration</th>
                        <th className="px-3 py-2.5">Work Session Notes</th>
                        <th className="px-3 py-2.5">Added On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {trackingData.sessions.map((session, idx) => (
                        <tr key={session.id || idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-3 py-2.5 text-center font-mono font-medium text-gray-500">
                            {session.sessionNumber}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                            <span className="text-gray-500 font-normal mr-1">{session.displayDate},</span>
                            <span>{session.startTime}</span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {session.isOngoing ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                In Progress
                              </span>
                            ) : (
                              <span className="font-medium text-gray-900">{session.endTime}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-gray-900 whitespace-nowrap">
                            <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200/70 font-mono">
                              {session.formattedDuration}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 max-w-xs truncate" title={session.notes}>
                            {session.notes || 'Time tracking session'}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-[11px]">
                            {session.addedOn}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <Info className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                <span>
                  Work sessions and durations are automatically calculated from clock-in and clock-out timestamps.
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Daily Breakdown */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              {trackingData.dailyBreakdown.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">No daily logs yet</p>
                </div>
              ) : (
                trackingData.dailyBreakdown.map((day) => (
                  <div
                    key={day.dateStr}
                    className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#0B1957]" />
                        <span className="font-bold text-xs sm:text-sm text-gray-900">{day.label}</span>
                      </div>
                      <span className="bg-[#0B1957] text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                        {day.formattedTotal}
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100 p-1">
                      {day.sessions.map((s, sIdx) => (
                        <div
                          key={s.id || sIdx}
                          className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/80 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-800 whitespace-nowrap">
                              {s.startTime} - {s.endTime}
                            </span>
                            {s.notes && (
                              <span className="text-gray-500 truncate text-[11px] hidden sm:inline">
                                • {s.notes}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 whitespace-nowrap">
                            {s.formattedDuration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Activity Timeline */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              {trackingData.sessions.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
                  No activity history recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {trackingData.sessions.map((s, idx) => (
                    <div key={s.id || idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#0B1957] ring-4 ring-white" />
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-xs text-gray-900">
                            Logged {s.formattedDuration} of work
                          </span>
                          <span className="text-[11px] text-gray-400">{s.addedOn}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Session {s.sessionNumber}: {s.startTime} to {s.endTime}
                        </p>
                        {s.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            "{s.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="py-3 px-5 sm:px-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>
              Total: <strong className="text-gray-900">{trackingData.formattedTotal}</strong> across{' '}
              <strong className="text-gray-900">{trackingData.totalSessions}</strong> session{trackingData.totalSessions === 1 ? '' : 's'}
            </span>
          </div>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-[#0B1957] hover:bg-[#071038] text-white text-xs h-8 px-4 font-semibold shadow-sm"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
