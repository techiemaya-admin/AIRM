import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, isAfter } from "date-fns";
import { Plus, Trash2, Save, Share2, ChevronLeft, ChevronRight, Download, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// import logo from "@/assets/techiemaya-logo.png";

interface TimesheetEntry {
  id?: string;
  project: string;
  task: string;
  mon_hours: number;
  tue_hours: number;
  wed_hours: number;
  thu_hours: number;
  fri_hours: number;
  sat_hours: number;
  sun_hours: number;
  source?: string; // 'manual' or 'time_clock'
}

interface UserProfile {
  id: string;
  email: string;
}

const HOLIDAYS_LIST = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-12', name: "Makar Sankranti" },
  { date: '2026-01-26', name: "Republic Day" },
  { date: '2026-03-19', name: "Ugadi" },
  { date: '2026-04-03', name: "Good Friday" },
  { date: '2026-09-14', name: "Ganesh Chaturthi" },
  { date: '2026-10-02', name: "Gandhi Jayanti" },
  { date: '2026-10-20', name: "Dussehra" },
  { date: '2026-11-09', name: "Diwali" },
  { date: '2026-12-25', name: "Christmas Day" },
];

const Timesheet = () => {
  console.log('🎬 Timesheet component rendered');

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timesheetId, setTimesheetId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weekEnd, setWeekEnd] = useState<Date>(
    endOfWeek(new Date(), { weekStartsOn: 1 })
  );

  console.log('🎬 Timesheet state:', {
    user: user?.id,
    selectedUserId,
    weekStart: format(weekStart, "yyyy-MM-dd"),
    weekEnd: format(weekEnd, "yyyy-MM-dd")
  });
  const [entries, setEntries] = useState<TimesheetEntry[]>([
    {
      project: "",
      task: "",
      mon_hours: 0,
      tue_hours: 0,
      wed_hours: 0,
      thu_hours: 0,
      fri_hours: 0,
      sat_hours: 0,
      sun_hours: 0,
      source: 'manual',
    },
  ]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<any[]>([]);

  useEffect(() => {
    const initUser = async () => {
      try {
        console.log('🔵 useEffect triggered - initializing user');
        console.log('🔵 weekStart dependency:', format(weekStart, "yyyy-MM-dd"));
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('🔵 User data from localStorage:', userData);
        if (userData.id) {
          setUser(userData);
          setSelectedUserId(userData.id);
          // Check user role from localStorage
          const adminStatus = userData.role === 'admin';
          setIsAdmin(adminStatus);
          if (adminStatus) {
            await loadUsers();
          }
          console.log('🔵 About to call loadTimesheet with userId:', userData.id);
          console.log('🔵 loadTimesheet function exists:', typeof loadTimesheet);
          await loadTimesheet(userData.id);
          console.log('🔵 loadTimesheet call completed');
        } else {
          console.warn('⚠️ No user ID found in localStorage');
        }
      } catch (error) {
        console.error('❌ Error initializing user:', error);
        console.error('❌ Error stack:', (error as any)?.stack);
        console.error('❌ Error message:', (error as any)?.message);
      }
    };
    initUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);


  const loadUsers = async () => {
    try {
      const response = await api.users.getWithRoles() as any;
      // API returns { users: [...] }
      const usersData = response?.users || response || [];
      const userProfiles = Array.isArray(usersData) ? usersData.map((u: any) => ({
        id: u.user_id || u.id,
        email: u.email,
      })) : [];
      setUsers(userProfiles);
    } catch (err) {
      console.error("Error in loadUsers:", err);
    }
  };

  const handleUserChange = async (userId: string) => {
    setSelectedUserId(userId);
    setTimesheetId(null);
    setEntries([{
      project: "",
      task: "",
      mon_hours: 0,
      tue_hours: 0,
      wed_hours: 0,
      thu_hours: 0,
      fri_hours: 0,
      sat_hours: 0,
      sun_hours: 0,
      source: 'manual',
    }]);
    await loadTimesheet(userId);
  };

  // Check if we should navigate to current week on mount
  useEffect(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

    // Only check once on mount - if viewing past or future week, go to current week
    const currentWeekStartStr = format(currentWeekStart, "yyyy-MM-dd");
    const viewingWeekStartStr = format(weekStart, "yyyy-MM-dd");

    if (currentWeekStartStr !== viewingWeekStartStr) {
      console.log('📅 Not viewing current week. Current:', currentWeekStartStr, 'Viewing:', viewingWeekStartStr);
      // Only auto-navigate if viewing a past week (more than 7 days old)
      if (isAfter(today, weekEnd) && (today.getTime() - weekEnd.getTime()) > 7 * 24 * 60 * 60 * 1000) {
        console.log('📅 Auto-navigating to current week');
        setWeekStart(currentWeekStart);
        setWeekEnd(currentWeekEnd);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Auto-refresh timesheet after clock-out
  useEffect(() => {
    const handleClockOut = () => {
      if (user && selectedUserId) {
        console.log('⏰ Clock-out detected, refreshing timesheet...');
        setTimeout(() => {
          loadTimesheet(selectedUserId || user.id);
        }, 1000); // Small delay to ensure backend has saved the entry
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'timesheetRefreshTrigger' && user && selectedUserId) {
        console.log('💾 Storage change detected, refreshing timesheet...');
        setTimeout(() => {
          loadTimesheet(selectedUserId || user.id);
        }, 500);
      }
    };

    window.addEventListener('timesheetClockOut', handleClockOut as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('timesheetClockOut', handleClockOut as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, selectedUserId]);

  // Reload timesheet when page becomes visible (user navigates to this page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && selectedUserId) {
        console.log('📄 Page became visible, reloading timesheet...');
        loadTimesheet(selectedUserId || user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also reload when window gains focus (user switches back to tab)
    const handleFocus = () => {
      if (user && selectedUserId) {
        console.log('👁️ Window gained focus, reloading timesheet...');
        loadTimesheet(selectedUserId || user.id);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, selectedUserId]);

  const loadTimesheet = async (userId: string) => {
    try {
      console.log('🚀 loadTimesheet called with userId:', userId);
      setLoading(true);
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      // Build API parameters - for admin viewing another user, always pass user_id
      const apiParams: any = { week_start: weekStartStr };

      // If admin and viewing another user, pass user_id to backend
      if (isAdmin && user && userId !== user.id) {
        apiParams.user_id = userId;
        console.log('👑 Admin viewing timesheet for user:', userId);
      } else {
        console.log('👤 User viewing own timesheet:', userId);
      }

      console.log('📞 API params:', apiParams);

      // Load all data in parallel
      const [timesheetResult, leaveResult, issuesResult, attendanceResult, currentEntryResult] = await Promise.allSettled([
        api.timesheets.getTimesheets(apiParams),
        api.leave.getAll().catch(() => ({ leave_requests: [] })),
        api.issues.getAll().catch(() => ({ issues: [] })),
        api.leaveCalendar.getAttendance(weekStartStr, weekEndStr).catch(() => ({ attendance_records: [] })),
        api.timesheets.getCurrent().catch(() => ({ entry: null }))
      ]);

      // Extract results
      const timesheetResponse = timesheetResult.status === 'fulfilled'
        ? timesheetResult.value as any
        : { timesheets: [] };
      const leaveRequestsResponse = leaveResult.status === 'fulfilled'
        ? leaveResult.value as any
        : { leave_requests: [] };
      const issuesResponse = issuesResult.status === 'fulfilled'
        ? issuesResult.value as any
        : { issues: [] };
      const attendanceResponse = attendanceResult.status === 'fulfilled'
        ? attendanceResult.value as any
        : { attendance_records: [] };
      const currentEntryResponse = currentEntryResult.status === 'fulfilled'
        ? currentEntryResult.value as any
        : { entry: null };

      setWeeklyAttendance(attendanceResponse.attendance_records || attendanceResponse.attendance || []);

      if (timesheetResult.status === 'rejected') {
        console.error('❌ Error loading timesheet:', timesheetResult.reason);
        toast({
          title: "Error",
          description: "Failed to load timesheet",
          variant: "destructive",
        });
      }

      // Get all timesheets from response
      const timesheets = Array.isArray(timesheetResponse?.timesheets)
        ? timesheetResponse.timesheets
        : [];

      console.log('📊 Received timesheets:', timesheets.length);

      // Find matching timesheet - collect ALL timesheets that overlap with requested week
      let matchedTimesheets: any[] = [];
      const weekStartDate = new Date(weekStartStr + 'T00:00:00');
      const weekEndDate = new Date(weekEndStr + 'T23:59:59');

      console.log('🔍 Looking for timesheets matching week:', weekStartStr, 'to', weekEndStr);

      for (const t of timesheets) {
        // Normalize week_start
        let tWeekStart: string;
        if (typeof t.week_start === 'string') {
          tWeekStart = t.week_start.split('T')[0];
        } else if (t.week_start) {
          tWeekStart = new Date(t.week_start).toISOString().split('T')[0];
        } else {
          continue;
        }

        // Check exact match first
        if (tWeekStart === weekStartStr) {
          matchedTimesheets.push(t);
          console.log('✅ Found exact match timesheet:', t.id, 'with', Array.isArray(t.entries) ? t.entries.length : 0, 'entries');
          continue;
        }

        // Check overlap
        let tWeekEnd: string;
        if (typeof t.week_end === 'string') {
          tWeekEnd = t.week_end.split('T')[0];
        } else if (t.week_end) {
          tWeekEnd = new Date(t.week_end).toISOString().split('T')[0];
        } else {
          const tsStart = new Date(tWeekStart + 'T00:00:00');
          tsStart.setDate(tsStart.getDate() + 6);
          tWeekEnd = tsStart.toISOString().split('T')[0];
        }

        const tWeekStartDate = new Date(tWeekStart + 'T00:00:00');
        const tWeekEndDate = new Date(tWeekEnd + 'T23:59:59');

        // Check if weeks overlap
        if (weekStartDate <= tWeekEndDate && weekEndDate >= tWeekStartDate) {
          matchedTimesheets.push(t);
          console.log('✅ Found overlapping timesheet:', t.id, 'week:', tWeekStart, 'to', tWeekEnd, 'with', Array.isArray(t.entries) ? t.entries.length : 0, 'entries');
        }
      }

      // Collect all entries from ALL matched timesheets (in case there are multiple)
      let allEntries: any[] = [];
      let firstTimesheetId: string | null = null;

      if (matchedTimesheets.length > 0) {
        // Use the first matched timesheet's ID (prefer exact match)
        firstTimesheetId = matchedTimesheets[0].id;
        setTimesheetId(firstTimesheetId);

        console.log(`📋 Processing ${matchedTimesheets.length} matched timesheet(s)`);

        // Collect entries from ALL matched timesheets
        for (const ts of matchedTimesheets) {
          console.log(`  Checking timesheet ${ts.id}:`, {
            entries_type: typeof ts.entries,
            entries_is_array: Array.isArray(ts.entries),
            entries_length: Array.isArray(ts.entries) ? ts.entries.length : 'N/A'
          });

          let entries = ts.entries || [];

          // Handle string entries
          if (typeof entries === 'string') {
            try {
              entries = JSON.parse(entries);
              console.log(`  ✅ Parsed entries from JSON string`);
            } catch (e) {
              console.error(`  ❌ Failed to parse entries:`, e);
              entries = [];
            }
          }

          // Ensure it's an array
          if (!Array.isArray(entries)) {
            console.warn(`  ⚠️ Entries is not an array:`, typeof entries);
            entries = [];
          }

          if (entries.length > 0) {
            console.log(`  📋 Collecting ${entries.length} entries from timesheet ${ts.id}`);
            entries.forEach((e: any, idx: number) => {
              const total = (parseFloat(e.mon_hours) || 0) + (parseFloat(e.tue_hours) || 0) +
                (parseFloat(e.wed_hours) || 0) + (parseFloat(e.thu_hours) || 0) +
                (parseFloat(e.fri_hours) || 0) + (parseFloat(e.sat_hours) || 0) +
                (parseFloat(e.sun_hours) || 0);
              console.log(`    Entry ${idx + 1}: ${e.project || 'N/A'}/${e.task || 'N/A'}`, {
                source: e.source,
                total: total,
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
            allEntries = [...allEntries, ...entries];
          } else {
            console.log(`  ⚠️ Timesheet ${ts.id} has no entries`);
          }
        }

        console.log(`📊 Total entries collected from all timesheets: ${allEntries.length}`);
      } else {
        setTimesheetId(null);
        console.log('⚠️ No timesheet found for week:', weekStartStr);
        console.log('Available timesheets:', timesheets.map((t: any) => ({
          id: t.id,
          week_start: typeof t.week_start === 'string' ? t.week_start.split('T')[0] : new Date(t.week_start).toISOString().split('T')[0],
          week_end: typeof t.week_end === 'string' ? t.week_end.split('T')[0] : (t.week_end ? new Date(t.week_end).toISOString().split('T')[0] : 'N/A'),
          entries_count: Array.isArray(t.entries) ? t.entries.length : 0
        })));
      }

      // Determine which user ID to use for filtering leave requests and issues
      // Use the userId parameter directly (which is the selected user's ID for admins)
      const targetUserIdForData = userId;

      // Filter leave requests for this user and week
      const allLeaveRequests = leaveRequestsResponse?.leave_requests || leaveRequestsResponse || [];
      const leaveRequests = Array.isArray(allLeaveRequests)
        ? allLeaveRequests.filter((leave: any) =>
          leave.user_id === targetUserIdForData &&
          leave.status === 'approved' &&
          leave.end_date >= weekStartStr &&
          leave.start_date <= weekEndStr
        )
        : [];

      // Get assigned issues for this user (only open and in_progress)
      const allIssues = issuesResponse?.issues || issuesResponse || [];
      const assignedIssues = Array.isArray(allIssues)
        ? allIssues.filter((issue: any) =>
          (issue.status === 'open' || issue.status === 'in_progress') &&
          issue.assignees &&
          Array.isArray(issue.assignees) &&
          issue.assignees.some((assignee: any) =>
            assignee.user_id === targetUserIdForData || assignee.id === targetUserIdForData
          )
        )
        : [];

      // Convert leave requests to timesheet entries (optimized)
      const leaveEntries: TimesheetEntry[] = [];
      const dayMap = ['mon_hours', 'tue_hours', 'wed_hours', 'thu_hours', 'fri_hours', 'sat_hours', 'sun_hours'] as const;

      if (leaveRequests.length > 0) {
        leaveRequests.forEach((leave: any) => {
          // Pre-calculate dates (optimized)
          const leaveStartStr = leave.start_date;
          const leaveEndStr = leave.end_date;

          // Calculate hours for each day of the week (optimized)
          // Generate unique ID using leave ID if available, otherwise use dates + random
          const leaveId = leave.id || `leave-${leave.start_date}-${leave.end_date}-${leave.leave_type}-${Math.random().toString(36).substr(2, 9)}`;
          const hours: TimesheetEntry = {
            id: `leave-entry-${leaveId}`, // Unique ID for leave entries
            project: "Leave",
            task: `${leave.leave_type.toUpperCase()}${leave.reason ? ` - ${leave.reason}` : ''}`,
            mon_hours: 0,
            tue_hours: 0,
            wed_hours: 0,
            thu_hours: 0,
            fri_hours: 0,
            sat_hours: 0,
            sun_hours: 0,
            source: 'leave',
          };

          // Check each day of the week if it falls within leave period
          // Extract date part only (in case time is included)
          const leaveStartDate = leaveStartStr.split('T')[0];
          const leaveEndDate = leaveEndStr.split('T')[0];

          for (let i = 0; i < 7; i++) {
            const currentDayStr = format(addDays(weekStart, i), 'yyyy-MM-dd');

            // Compare date strings to avoid timezone issues
            if (currentDayStr >= leaveStartDate && currentDayStr <= leaveEndDate) {
              const dayKey = dayMap[i];
              if (dayKey) {
                hours[dayKey] = 8; // 8 hours for leave days
              }
            }
          }

          leaveEntries.push(hours);
        });
      }

      // Create assigned issues entries (only if not already in timesheet)
      const assignedIssueEntries: TimesheetEntry[] = [];

      // Get existing entries to check for duplicates - use allEntries if available
      const existingEntries = allEntries;
      const existingProjectTasks = new Set(
        existingEntries.map((e: any) => `${e.project || ''}|${e.task || ''}`)
      );

      if (assignedIssues.length > 0) {
        assignedIssues.forEach((issue: any) => {
          const projectName = issue.project_name || 'Assigned Tasks';
          const taskName = `Issue #${issue.id}: ${issue.title}`;
          const projectTaskKey = `${projectName}|${taskName}`;

          // Check if this issue is already in the timesheet entries
          const issueAlreadyExists = existingProjectTasks.has(projectTaskKey);

          if (!issueAlreadyExists) {
            assignedIssueEntries.push({
              id: `assigned-issue-${issue.id}-${Date.now()}`,
              project: projectName,
              task: taskName,
              mon_hours: 0,
              tue_hours: 0,
              wed_hours: 0,
              thu_hours: 0,
              fri_hours: 0,
              sat_hours: 0,
              sun_hours: 0,
              source: 'manual', // Mark as manual so it's editable
            });
          }
        });
      }

      // Helper function to safely convert to number
      const toNumber = (value: any): number => {
        if (value === null || value === undefined || value === '') return 0;
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        return isNaN(num) ? 0 : num;
      };

      // Process all entries - convert hours to numbers
      // Filter out leave entries - they should be displayed separately in a leave section
      console.log(`🔄 Processing ${allEntries.length} entries for display...`);
      const regularEntries: TimesheetEntry[] = allEntries
        .filter((entry: any) => entry.source !== 'leave') // Exclude leave entries
        .map((entry: any, idx: number) => {
          const processed = {
            id: entry.id || `entry-${firstTimesheetId || 'new'}-${idx}-${Date.now()}`,
            project: entry.project || '',
            task: entry.task || '',
            mon_hours: toNumber(entry.mon_hours),
            tue_hours: toNumber(entry.tue_hours),
            wed_hours: toNumber(entry.wed_hours),
            thu_hours: toNumber(entry.thu_hours),
            fri_hours: toNumber(entry.fri_hours),
            sat_hours: toNumber(entry.sat_hours),
            sun_hours: toNumber(entry.sun_hours),
            source: entry.source || 'manual',
          };

          const total = processed.mon_hours + processed.tue_hours + processed.wed_hours +
            processed.thu_hours + processed.fri_hours + processed.sat_hours + processed.sun_hours;
          if (total > 0) {
            console.log(`  ✅ Processed entry ${idx + 1}: ${processed.project}/${processed.task} - Total: ${total}`, {
              thu: processed.thu_hours,
              fri: processed.fri_hours,
              source: processed.source
            });
          }

          return processed;
        });

      console.log(`✅ Processed ${regularEntries.length} regular entries`);

      // Check which assigned issues are already in the timesheet
      const existingProjectsTasks = new Set(
        regularEntries.map((e: TimesheetEntry) => `${e.project}|${e.task}`)
      );
      const newAssignedEntries = assignedIssueEntries.filter(
        (entry: TimesheetEntry) => !existingProjectsTasks.has(`${entry.project}|${entry.task}`)
      );

      // Combine all entries
      const finalEntries = [...regularEntries, ...leaveEntries, ...newAssignedEntries];

      // Always add an empty row for manual entry
      finalEntries.push({
        id: `manual-empty-${Date.now()}`,
        project: "",
        task: "",
        mon_hours: 0,
        tue_hours: 0,
        wed_hours: 0,
        thu_hours: 0,
        fri_hours: 0,
        sat_hours: 0,
        sun_hours: 0,
        source: 'manual',
      });

      console.log('📊 Final entries summary:', {
        regular: regularEntries.length,
        leave: leaveEntries.length,
        assigned: newAssignedEntries.length,
        total: finalEntries.length,
        withHours: finalEntries.filter(e =>
          e.mon_hours > 0 || e.tue_hours > 0 || e.wed_hours > 0 ||
          e.thu_hours > 0 || e.fri_hours > 0 || e.sat_hours > 0 || e.sun_hours > 0
        ).length
      });

      // Log all final entries with details
      console.log('📋 All final entries being set:');
      finalEntries.forEach((e, idx) => {
        const total = e.mon_hours + e.tue_hours + e.wed_hours + e.thu_hours +
          e.fri_hours + e.sat_hours + e.sun_hours;
        console.log(`  Entry ${idx + 1}:`, {
          id: e.id,
          project: e.project,
          task: e.task,
          source: e.source,
          total: total,
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

      console.log('✅ Setting entries state with', finalEntries.length, 'entries');
      setEntries(finalEntries);
    } catch (error: any) {
      console.error("Error loading timesheet:", error);
      const errorMessage = error?.message || "Failed to load timesheet";
      toast({
        title: "Error",
        description: errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('Cannot connect')
          ? "Backend server is not running. Please check if the backend is started."
          : errorMessage,
        variant: "destructive",
        duration: 10000,
      });
      setEntries([{
        id: `manual-error-${Date.now()}`,
        project: "",
        task: "",
        mon_hours: 0,
        tue_hours: 0,
        wed_hours: 0,
        thu_hours: 0,
        fri_hours: 0,
        sat_hours: 0,
        sun_hours: 0,
        source: 'manual',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    // Generate unique ID for new entry
    const newId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setEntries([
      ...entries,
      {
        id: newId,
        project: "",
        task: "",
        mon_hours: 0,
        tue_hours: 0,
        wed_hours: 0,
        thu_hours: 0,
        fri_hours: 0,
        sat_hours: 0,
        sun_hours: 0,
        source: 'manual',
      },
    ]);
  };

  const removeEntry = (index: number) => {
    // Prevent deleting time_clock and leave entries
    const entry = entries[index];
    if (entry.source === 'time_clock' || entry.source === 'leave') {
      console.warn('⚠️ Attempted to delete read-only entry:', entry.source);
      return; // Do not allow deletion of time_clock or leave entries
    }

    // Also prevent deleting if admin viewing another user's timesheet
    if (isAdmin && selectedUserId && selectedUserId !== user?.id) {
      console.warn('⚠️ Attempted to delete entry from another user\'s timesheet');
      return; // Do not allow deletion when viewing another user's timesheet
    }

    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof TimesheetEntry, value: any) => {
    // Prevent editing time_clock and leave entries
    const entry = entries[index];
    if (entry.source === 'time_clock' || entry.source === 'leave') {
      console.warn('⚠️ Attempted to edit read-only entry:', entry.source);
      return; // Do not allow modifications to time_clock or leave entries
    }

    // Also prevent editing if admin viewing another user's timesheet
    if (isAdmin && selectedUserId && selectedUserId !== user?.id) {
      console.warn('⚠️ Attempted to edit another user\'s timesheet');
      return; // Do not allow modifications when viewing another user's timesheet
    }

    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const calculateTotal = (entry: TimesheetEntry) => {
    let sum = (Number(entry.mon_hours) || 0) +
      (Number(entry.tue_hours) || 0) +
      (Number(entry.wed_hours) || 0) +
      (Number(entry.thu_hours) || 0) +
      (Number(entry.fri_hours) || 0) +
      (Number(entry.sat_hours) || 0) +
      (Number(entry.sun_hours) || 0);
    return sum;
  };

  const calculateDayTotal = (day: keyof TimesheetEntry) => {
    return entries.reduce((sum, entry) => sum + (Number(entry[day]) || 0), 0);
  };

  const calculateGrandTotal = () => {
    return entries.reduce((sum, entry) => sum + calculateTotal(entry), 0);
  };

  const formatHours = (hours: any) => {
    const num = Number(hours) || 0;
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  const moveToNextWeek = () => {
    const newWeekStart = addWeeks(weekStart, 1);
    const newWeekEnd = endOfWeek(newWeekStart, { weekStartsOn: 1 });

    // Reset state
    setTimesheetId(null);
    setEntries([{
      project: "",
      task: "",
      mon_hours: 0,
      tue_hours: 0,
      wed_hours: 0,
      thu_hours: 0,
      fri_hours: 0,
      sat_hours: 0,
      sun_hours: 0,
      source: 'manual',
    }]);

    // Update week - this will trigger useEffect to load timesheet
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);
  };

  const moveToPreviousWeek = () => {
    const newWeekStart = addWeeks(weekStart, -1);
    const newWeekEnd = endOfWeek(newWeekStart, { weekStartsOn: 1 });

    // Reset state
    setTimesheetId(null);
    setEntries([{
      project: "",
      task: "",
      mon_hours: 0,
      tue_hours: 0,
      wed_hours: 0,
      thu_hours: 0,
      fri_hours: 0,
      sat_hours: 0,
      sun_hours: 0,
      source: 'manual',
    }]);

    // Update week - this will trigger useEffect to load timesheet
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);
  };

  const handleShare = async () => {
    // Check if timesheet exists (either in state or in database)
    let currentTimesheetId = timesheetId;

    // If we don't have a timesheetId, try to get it from database
    if (!currentTimesheetId) {
      try {
        const weekStartStr = format(weekStart, "yyyy-MM-dd");
        const response = await api.timesheets.getTimesheets({ week_start: weekStartStr }) as any;

        const timesheets = response?.timesheets || response || [];

        // Try to find matching timesheet - handle different date formats
        const timesheet = Array.isArray(timesheets) ? timesheets.find((t: any) => {
          const tWeekStart = t.week_start || t.week_start;
          if (!tWeekStart) return false;
          // Normalize dates for comparison (remove time portion)
          const tDate = new Date(tWeekStart).toISOString().split('T')[0];
          const weekDate = weekStartStr;
          return tDate === weekDate || tWeekStart === weekDate || tWeekStart.startsWith(weekDate);
        }) : null;

        if (timesheet?.id) {
          currentTimesheetId = timesheet.id;
          setTimesheetId(timesheet.id);
        } else if (Array.isArray(timesheets) && timesheets.length > 0) {
          // If no exact match but we have timesheets, use the first one for this week
          const weekTimesheet = timesheets[0];
          if (weekTimesheet.id) {
            currentTimesheetId = weekTimesheet.id;
            setTimesheetId(weekTimesheet.id);
          }
        }
      } catch (error) {
        console.error("Share: Error checking timesheet:", error);
      }
    }

    if (!currentTimesheetId) {
      toast({
        title: "Error",
        description: "Please save the timesheet first. Click 'Save Timesheet' button before sharing.",
        variant: "destructive",
      });
      return;
    }

    const shareUrl = `${window.location.origin}/timesheet/${currentTimesheetId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: " Timesheet",
          text: `Week of ${format(weekStart, "dd MMMM yyyy")} - ${format(weekEnd, "dd MMMM yyyy")}`,
          url: shareUrl,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link Copied",
      description: "Timesheet link copied to clipboard",
    });
  };


  const handleDownload = () => {
    const doc = new jsPDF('landscape');

    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Timesheet', 14, 15);

    // Add week info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Week: ${format(weekStart, "dd MMMM yyyy")} - ${format(weekEnd, "dd MMMM yyyy")}`, 14, 22);

    // Prepare table data
    const headers = [
      'Project',
      'Task',
      `MON\n${format(addDays(weekStart, 0), "dd MMM")}`,
      `TUE\n${format(addDays(weekStart, 1), "dd MMM")}`,
      `WED\n${format(addDays(weekStart, 2), "dd MMM")}`,
      `THU\n${format(addDays(weekStart, 3), "dd MMM")}`,
      `FRI\n${format(addDays(weekStart, 4), "dd MMM")}`,
      `SAT\n${format(addDays(weekStart, 5), "dd MMM")}`,
      `SUN\n${format(addDays(weekStart, 6), "dd MMM")}`,
      'TOTAL'
    ];

    const body: any[] = entries.map(entry => [
      entry.project,
      entry.task,
      formatHours(entry.mon_hours),
      formatHours(entry.tue_hours),
      formatHours(entry.wed_hours),
      formatHours(entry.thu_hours),
      formatHours(entry.fri_hours),
      formatHours(entry.sat_hours),
      formatHours(entry.sun_hours),
      formatHours(calculateTotal(entry))
    ]);

    // Add totals row
    body.push([
      { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      formatHours(calculateDayTotal("mon_hours")),
      formatHours(calculateDayTotal("tue_hours")),
      formatHours(calculateDayTotal("wed_hours")),
      formatHours(calculateDayTotal("thu_hours")),
      formatHours(calculateDayTotal("fri_hours")),
      formatHours(calculateDayTotal("sat_hours")),
      formatHours(calculateDayTotal("sun_hours")),
      { content: formatHours(calculateGrandTotal()), styles: { fontStyle: 'bold' } }
    ]);

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 28,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 20 },
        7: { halign: 'center', cellWidth: 20 },
        8: { halign: 'center', cellWidth: 20 },
        9: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      },
      didDrawPage: function () {
        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('*Record all time to the nearest 10th of an hour', 14, doc.internal.pageSize.height - 15);
        doc.text('*Overtime is not authorized without Customer Management Approval', 14, doc.internal.pageSize.height - 10);
      }
    });

    // Save PDF
    doc.save(`timesheet_${format(weekStart, "yyyy-MM-dd")}.pdf`);

    toast({
      title: "Downloaded",
      description: "Timesheet PDF downloaded successfully",
    });
  };

  const saveTimesheet = async (silent = false) => {
    if (!user) return;

    setLoading(true);
    try {
      const weekStartStr = format(weekStart, "yyyy-MM-dd");

      // Helper function to convert to number, ensuring proper type conversion
      const toNumber = (value: any): number => {
        if (value === null || value === undefined || value === '') return 0;
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        return isNaN(num) ? 0 : num;
      };

      // Filter and prepare entries (exclude time_clock and leave entries)
      const entriesToSave = entries
        .filter((entry) => entry.source !== 'time_clock' && entry.source !== 'leave')
        .map((entry) => {
          const preparedEntry = {
            project: (entry.project || '').trim(),
            task: (entry.task || '').trim(),
            source: entry.source || 'manual',
            mon_hours: toNumber(entry.mon_hours),
            tue_hours: toNumber(entry.tue_hours),
            wed_hours: toNumber(entry.wed_hours),
            thu_hours: toNumber(entry.thu_hours),
            fri_hours: toNumber(entry.fri_hours),
            sat_hours: toNumber(entry.sat_hours),
            sun_hours: toNumber(entry.sun_hours),
          };

          // Log each entry being saved for debugging
          const totalHours = preparedEntry.mon_hours + preparedEntry.tue_hours +
            preparedEntry.wed_hours + preparedEntry.thu_hours +
            preparedEntry.fri_hours + preparedEntry.sat_hours +
            preparedEntry.sun_hours;
          console.log('💾 Preparing to save entry:', {
            project: preparedEntry.project,
            task: preparedEntry.task,
            totalHours,
            hours: {
              mon: preparedEntry.mon_hours,
              tue: preparedEntry.tue_hours,
              wed: preparedEntry.wed_hours,
              thu: preparedEntry.thu_hours,
              fri: preparedEntry.fri_hours,
              sat: preparedEntry.sat_hours,
              sun: preparedEntry.sun_hours,
            }
          });

          return preparedEntry;
        })
        .filter((entry) => {
          // Only save entries that have project/task OR have hours > 0
          const hasProjectTask = entry.project && entry.task;
          const hasHours = entry.mon_hours > 0 || entry.tue_hours > 0 || entry.wed_hours > 0 ||
            entry.thu_hours > 0 || entry.fri_hours > 0 || entry.sat_hours > 0 ||
            entry.sun_hours > 0;
          return hasProjectTask && hasHours;
        });

      console.log('💾 Total entries to save:', entriesToSave.length);
      console.log('💾 Entries data:', JSON.stringify(entriesToSave, null, 2));

      // Prepare save data - if admin viewing another user, include user_id
      const saveData: any = {
        week_start: weekStartStr,
        entries: entriesToSave,
      };
      if (isAdmin && selectedUserId && selectedUserId !== user?.id) {
        saveData.user_id = selectedUserId;
        console.log('👑 Admin saving timesheet for user:', selectedUserId);
      }

      // Save timesheet via API
      const response = await api.timesheets.save(saveData) as any;

      // Update timesheet ID - always set it if we got one back
      const savedTimesheetId = response.timesheet_id;
      if (savedTimesheetId) {
        setTimesheetId(savedTimesheetId);
      }

      // Reload timesheet to get updated data (this will also set timesheetId from loaded data)
      await loadTimesheet(selectedUserId || user.id);

      // Double-check: if timesheetId is still not set, use the one from save response
      // This handles the case where loadTimesheet might not find the timesheet yet
      if (savedTimesheetId) {
        setTimesheetId(savedTimesheetId);
      }

      if (!silent) {
        toast({
          title: "Success",
          description: "Timesheet saved successfully!",
        });
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error saving timesheet:", error);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to save timesheet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDayDate = (dayIndex: number) => {
    return format(addDays(weekStart, dayIndex), "dd MMMM yyyy");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 mr-14 md:mr-24">
          <h1 className="text-2xl font-bold">Timesheet</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weekly Timesheet</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
            {isAdmin && users.length > 0 && (
              <div className="mt-4 space-y-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    View Timesheet For:
                  </label>
                  <select
                    className="w-full max-w-xs p-2 border rounded-md bg-background"
                    value={selectedUserId}
                    onChange={(e) => handleUserChange(e.target.value)}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email} {u.id === user?.id && "(You)"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="font-semibold">Beginning Monday: </span>
                  {format(weekStart, "dd MMMM yyyy")}
                </div>
                <div>
                  <span className="font-semibold">Ending Sunday: </span>
                  {format(weekEnd, "dd MMMM yyyy")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTimesheet(selectedUserId || user?.id || '')}
                  disabled={loading}
                  title="Refresh timesheet to see new entries"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" onClick={moveToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={moveToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="border border-border bg-muted p-2 text-left font-semibold">
                      Project
                    </th>
                    <th className="border border-border bg-muted p-2 text-left font-semibold">
                      Task
                    </th>
                    {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day, i) => {
                      const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
                      const holiday = HOLIDAYS_LIST.find(h => h.date === dateStr);
                      const isWeekend = i === 5 || i === 6;
                      
                      return (
                        <th key={day} className={`border border-border p-2 text-center font-semibold ${holiday ? 'bg-green-50' : (isWeekend ? 'bg-slate-200' : 'bg-muted')}`}>
                          <div>{day}</div>
                          <div className="text-[10px] font-normal">{getDayDate(i)}</div>
                          {holiday && (
                            <div className="text-[9px] font-bold text-green-600 bg-green-100 rounded-full px-1 uppercase mt-0.5">Holiday</div>
                          )}
                        </th>
                      );
                    })}
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      TOTAL
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Clock In Row */}
                  <tr className="bg-slate-100 text-xs font-semibold text-slate-700 border-b border-border">
                    <td colSpan={2} className="border border-border p-2 text-right">
                      Clock In
                    </td>
                    {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day, i) => {
                      const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
                      const record = weeklyAttendance.find((a: any) => {
                        const recDate = typeof a.date === 'string' ? a.date.split('T')[0] : '';
                        return recDate === dateStr && a.user_id === (selectedUserId || user?.id);
                      });

                      const holiday = HOLIDAYS_LIST.find(h => h.date === dateStr);
                      const isWeekend = i === 5 || i === 6;
                      let display = isWeekend ? 'Week Off' : '-';

                      if (holiday) {
                        display = 'Holiday';
                      } else if (record) {
                        if (record.clock_in) {
                          display = format(new Date(record.clock_in), 'hh:mm a');
                        } else if (record.status === 'week_off') {
                          display = 'Week Off';
                        } else if (record.status === 'on_leave') {
                          display = 'On Leave';
                        } else if (record.status === 'absent' && !isWeekend) {
                          display = 'Absent';
                        }
                      }

                      return (
                        <td key={day} className="border border-border p-2 text-center whitespace-nowrap">
                          {display}
                        </td>
                      );
                    })}
                    <td colSpan={2} className="border border-border bg-muted"></td>
                  </tr>
                  {entries.map((entry, index) => {
                    const isTimeClock = entry.source === 'time_clock';
                    const isLeave = entry.source === 'leave';
                    // Make read-only if: time_clock/leave entry OR admin viewing another user's timesheet
                    const isViewingOtherUser = isAdmin && selectedUserId && selectedUserId !== user?.id;
                    const isReadOnly = isTimeClock || isLeave || isViewingOtherUser;
                    // Ensure unique key - entry.id should always exist now, but add index as fallback
                    const uniqueKey = entry.id ? `${entry.id}-${index}` : `entry-${index}-${Date.now()}-${Math.random()}`;
                    return (
                      <tr key={uniqueKey} className={`hover:bg-muted/50 ${isTimeClock ? 'bg-blue-50/50' : ''} ${isLeave ? 'bg-green-50/50' : ''}`}>
                        <td className="border border-border p-1">
                          {isReadOnly ? (
                            <div className="px-2 py-1 text-sm">{entry.project}</div>
                          ) : (
                            <Input
                              value={entry.project}
                              onChange={(e) =>
                                updateEntry(index, "project", e.target.value)
                              }
                              className="h-8 border-0 bg-transparent"
                              placeholder="Project"
                              disabled={!!(isTimeClock || isLeave || (isAdmin && selectedUserId && selectedUserId !== user?.id))}
                              readOnly={!!(isTimeClock || isLeave || (isAdmin && selectedUserId && selectedUserId !== user?.id))}
                            />
                          )}
                        </td>
                        <td className="border border-border p-1">
                          {isReadOnly ? (
                            <div className="px-2 py-1 text-sm flex items-center gap-2">
                              {entry.task}
                              {isTimeClock && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Auto</span>}
                              {isLeave && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Leave</span>}
                            </div>
                          ) : (
                            <Input
                              value={entry.task}
                              onChange={(e) => updateEntry(index, "task", e.target.value)}
                              className="h-8 border-0 bg-transparent"
                              placeholder="Task"
                              disabled={!!(isTimeClock || isLeave || (isAdmin && selectedUserId && selectedUserId !== user?.id))}
                              readOnly={!!(isTimeClock || isLeave || (isAdmin && selectedUserId && selectedUserId !== user?.id))}
                            />
                          )}
                        </td>
                        {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                          const isWeekend = day === "sat" || day === "sun";
                          // Safely convert to number, handling all edge cases
                          const rawValue = entry[`${day}_hours` as keyof TimesheetEntry];
                          const dayHours = rawValue === null || rawValue === undefined || rawValue === ''
                            ? 0
                            : typeof rawValue === 'string'
                              ? parseFloat(rawValue) || 0
                              : Number(rawValue) || 0;

                          // Debug logging for all time_clock entries with hours
                          if (isTimeClock && dayHours > 0) {
                            console.log(`🔍 Displaying ${day} hours for time_clock entry ${index}:`, {
                              day,
                              rawValue,
                              dayHours,
                              formatted: formatHours(dayHours),
                              entryId: entry.id,
                              project: entry.project,
                              task: entry.task,
                              fullEntry: entry
                            });
                          }

                          // Always show the value, even if 0
                          const displayValue = isLeave && dayHours > 0
                            ? 'PTO'
                            : dayHours > 0 || dayHours === 0
                              ? (dayHours > 0 ? formatHours(dayHours) : '0')
                              : '0';

                          return (
                            <td key={day} className={`border border-border p-1 ${isWeekend ? 'bg-slate-50' : ''}`}>
                              {isReadOnly ? (
                                <div className="text-center text-sm py-1 font-semibold">
                                  {displayValue}
                                </div>
                              ) : (
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={dayHours}
                                  onChange={(e) =>
                                    updateEntry(
                                      index,
                                      `${day}_hours` as keyof TimesheetEntry,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 border-0 bg-transparent text-center"
                                  disabled={!!(isTimeClock || isLeave || (isAdmin && selectedUserId && selectedUserId !== user?.id))}
                                  readOnly={!!(isTimeClock || isLeave || (isAdmin && selectedUserId && selectedUserId !== user?.id))}
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="border border-border p-2 text-center font-semibold">
                          {formatHours(calculateTotal(entry))}
                        </td>
                        <td className="border border-border p-1 text-center">
                          {isReadOnly ? (
                            <div className="text-xs text-muted-foreground">🔒</div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEntry(index)}
                              disabled={entries.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted font-semibold">
                    <td colSpan={2} className="border border-border p-2 text-right">
                      TOTAL
                    </td>
                    {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => (
                      <td key={day} className="border border-border p-2 text-center">
                        {formatHours(calculateDayTotal(`${day}_hours` as keyof TimesheetEntry))}
                      </td>
                    ))}
                    <td className="border border-border p-2 text-center">
                      {formatHours(calculateGrandTotal())}
                    </td>
                    <td className="border border-border"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-2">
              {!(isAdmin && selectedUserId && selectedUserId !== user?.id) && (
                <Button onClick={addEntry} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
              )}
              {!(isAdmin && selectedUserId && selectedUserId !== user?.id) ? (
                <Button onClick={() => saveTimesheet(false)} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "Save Timesheet"}
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  <span>🔒 Read-only mode - Viewing another user's timesheet</span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p>*Record all time to the nearest 10th of an hour</p>
              <p>*Overtime is not authorized without Customer Management Approval</p>
              <div className="mt-4 flex gap-4 items-center">
                <p className="font-semibold text-foreground">Entry Types:</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                  <span className="text-xs">Time Clock (Auto) 🔒</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span className="text-xs">Approved Leave 🔒</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                  <span className="text-xs">Manual Entry (Editable)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Timesheet;

