import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Calendar as CalendarIcon,
  Check,
  X,
  Clock,
  Plus,
  BarChart3,
  ClipboardList,
  Download,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  getDay,
  isSameMonth,
  addWeeks,
  subWeeks,
  startOfISOWeek,
  parseISO,
} from 'date-fns';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUsers } from '@/hooks/useUsers';
import { useLeaveRequests, useLeaveBalances, useLeaveMutation } from '@/hooks/useLeave';
import { useAttendance, useShifts, useAttendanceMutation } from '@/hooks/useAttendance';
import { CalendarSkeleton } from '@/components/PageSkeletons';
import { formatHours } from '@/lib/utils';
import { logger } from '@/lib/logger';

type CalendarTab = 'calendar' | 'balance' | 'shifts' | 'attendance';

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

const LeaveCalendar = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CalendarTab>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<string>('Privilege Leave');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shiftDate, setShiftDate] = useState(new Date());
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [attendanceView, setAttendanceView] = useState<'month' | 'week' | 'filter'>('month');
  const [filterStartDate, setFilterStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterEndDate, setFilterEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  // Edit Balance dialog
  const [showEditBalanceDialog, setShowEditBalanceDialog] = useState(false);
  const [balanceUserId, setBalanceUserId] = useState('');
  const [balanceLeaveType, setBalanceLeaveType] = useState('Casual Leave');
  const [balanceFinancialYear, setBalanceFinancialYear] = useState('2025-2026');
  const [balanceOpening, setBalanceOpening] = useState('');
  const [balanceAvailed, setBalanceAvailed] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceLapse, setBalanceLapse] = useState('');
  // Assign Shift dialog
  const [showAssignShiftDialog, setShowAssignShiftDialog] = useState(false);
  const [shiftUserId, setShiftUserId] = useState('');
  const [shiftType, setShiftType] = useState('General');
  const [shiftAssignDate, setShiftAssignDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr';

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const dateRange = useMemo(() => ({
    start: format(monthStart, 'yyyy-MM-dd'),
    end: format(monthEnd, 'yyyy-MM-dd')
  }), [currentDate]);

  // Attendance has its own independent date range
  const attendanceRange = useMemo(() => {
    if (attendanceView === 'week') {
      const ws = startOfISOWeek(attendanceDate);
      const we = new Date(ws.getTime() + 6 * 86400000);
      return { start: format(ws, 'yyyy-MM-dd'), end: format(we, 'yyyy-MM-dd') };
    }
    if (attendanceView === 'filter') {
      return { start: filterStartDate, end: filterEndDate };
    }
    return {
      start: format(startOfMonth(attendanceDate), 'yyyy-MM-dd'),
      end: format(endOfMonth(attendanceDate), 'yyyy-MM-dd'),
    };
  }, [attendanceDate, attendanceView, filterStartDate, filterEndDate]);

  // Shifts use their own week-based range
  const shiftsRange = useMemo(() => {
    const ws = startOfISOWeek(shiftDate);
    const we = new Date(ws.getTime() + 6 * 86400000);
    return { start: format(ws, 'yyyy-MM-dd'), end: format(we, 'yyyy-MM-dd') };
  }, [shiftDate]);

  const { data: usersRaw = [], isLoading: usersLoading } = useUsers();
  const { data: leaveRequestsRaw = [], isLoading: leavesLoading, refetch: refetchLeaves } = useLeaveRequests();
  const { data: leaveBalancesRaw = [], isLoading: balancesLoading } = useLeaveBalances(selectedUserId !== 'all' ? selectedUserId : undefined);
  const { data: attendanceRaw = [], isLoading: attendanceLoading } = useAttendance(attendanceRange.start, attendanceRange.end);
  const { data: shiftsRaw = [], isLoading: shiftsLoading } = useShifts(shiftsRange.start, shiftsRange.end);

  const usersData = useMemo(() => Array.isArray(usersRaw) ? usersRaw : [], [usersRaw]);
  const leaveRequests = useMemo(() => Array.isArray(leaveRequestsRaw) ? leaveRequestsRaw : [], [leaveRequestsRaw]);
  const leaveBalances = useMemo(() => {
    if (Array.isArray(leaveBalancesRaw)) return leaveBalancesRaw;
    if (leaveBalancesRaw && typeof leaveBalancesRaw === 'object') {
      return (leaveBalancesRaw as any).leave_balances || (leaveBalancesRaw as any).balances || [];
    }
    return [];
  }, [leaveBalancesRaw]);
  const attendanceData = useMemo(() => Array.isArray(attendanceRaw) ? attendanceRaw : [], [attendanceRaw]);
  const shiftsData = useMemo(() => Array.isArray(shiftsRaw) ? shiftsRaw : [], [shiftsRaw]);

  const leaveMutation = useLeaveMutation();
  const attendanceMutation = useAttendanceMutation();

  const loading = userLoading || usersLoading || leavesLoading;

  // Build a 5-row, 7-col calendar grid starting on Sunday
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = monthStart;
    const startDayOfWeek = getDay(firstDayOfMonth); // 0=Sun
    const gridStart = new Date(firstDayOfMonth);
    gridStart.setDate(firstDayOfMonth.getDate() - startDayOfWeek);
    const days: Date[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setShowCalendarFilter(false);
  };
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => {
    setCurrentDate(new Date());
    setShowCalendarFilter(false);
  };

  const handleMonthChange = (monthIdx: number) => {
    const newDate = new Date(currentDate.getFullYear(), monthIdx, 1);
    setCurrentDate(newDate);
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(year, currentDate.getMonth(), 1);
    setCurrentDate(newDate);
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'Privilege Leave': 'PTO (Paid Time Off)', 
      'Sick Leave': 'Sick Leave',
      'Casual Leave': 'Casual Leave', 
      'Unpaid Leave': 'Unpaid Leave',
      'Compensatory Off': 'Compensatory Off'
    };
    return labels[type] || type;
  };

  const handleCreateLeave = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      toast({ title: 'Error', description: 'Please select both dates', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await leaveMutation.create.mutateAsync({ start_date: selectedStartDate, end_date: selectedEndDate, leave_type: leaveType, reason: reason || null });
      toast({ title: 'Success', description: 'Leave request submitted' });
      setShowRequestDialog(false);
      setSelectedStartDate(''); setSelectedEndDate(''); setReason('');
      refetchLeaves();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const pendingRequests = leaveRequests.filter((r: any) => r.status === 'pending');
  const monthHolidays = HOLIDAYS_LIST.filter(h => h.date.startsWith(format(currentDate, 'yyyy-MM')));
  const myRequests = leaveRequests.filter((r: any) => r.user_id === currentUser?.id);

  if (loading && leaveRequests.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <CalendarSkeleton />
      </div>
    );
  }

  // ---- SHARED TAB HEADER ----
  const tabConfig = [
    { key: 'calendar', label: 'Leave Calendar', icon: <CalendarIcon className="h-4 w-4" /> },
    { key: 'balance', label: 'Leave Balance', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'shifts', label: 'Shift Roster', icon: <Clock className="h-4 w-4" /> },
    { key: 'attendance', label: 'Attendance', icon: <ClipboardList className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-4 pb-8">

        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Leave & Attendance</h1>
          {isAdmin && (
            <p className="text-sm text-blue-600 mt-1">Admin View - You can manage leave, balances, shifts, and attendance</p>
          )}
        </div>

        {/* Tab Bar - Segmented Control Style */}
        <div className="mb-6">
          <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-full px-2 py-1.5 gap-1 overflow-x-auto max-w-full shadow-sm">
            {tabConfig.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as CalendarTab)}
                  className={`flex flex-shrink-0 items-center gap-2 px-6 py-2 text-sm font-medium whitespace-nowrap transition-all rounded-full ${isActive
                    ? 'text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  style={isActive ? { backgroundColor: '#1E3A8A' } : {}}
                >
                  <span className={isActive ? 'text-white' : 'text-gray-400'}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>


        <div className={`flex flex-col lg:flex-row gap-4 lg:gap-6 ${activeTab === 'calendar' ? '' : ''}`}>
          {/* ─── MAIN CONTENT ─── */}
          <div className="flex-1 min-w-0 order-2 lg:order-1">

            {/* ══════════ CALENDAR TAB ══════════ */}
            {activeTab === 'calendar' && (
              <div>
                {/* Calendar Card */}
                <div className="rounded-2xl bg-white shadow-sm border border-gray-200 mb-6 overflow-hidden">

                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between px-6 py-5 gap-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 min-w-max">
                      <CalendarIcon className="h-6 w-6 text-gray-700" />
                      {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevMonth}
                        className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      >
                        Last Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToday}
                        className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      >
                        This Month
                      </Button>
                      <Button
                        variant={showCalendarFilter ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowCalendarFilter(!showCalendarFilter)}
                        className={showCalendarFilter ? 'bg-[#1E3A8A] text-white hover:bg-[#152a63]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                      >
                        Filter
                      </Button>

                      {showCalendarFilter && (
                        <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                          <select
                            value={currentDate.getMonth()}
                            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                            className="h-9 text-sm px-3 py-1 bg-white border border-gray-300 rounded-lg text-gray-700 shadow-sm focus:ring-1 focus:ring-[#1E3A8A] focus:outline-none cursor-pointer"
                          >
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                              <option key={idx} value={idx}>{m}</option>
                            ))}
                          </select>
                          <select
                            value={currentDate.getFullYear()}
                            onChange={(e) => handleYearChange(parseInt(e.target.value))}
                            className="h-9 text-sm px-3 py-1 bg-white border border-gray-300 rounded-lg text-gray-700 shadow-sm focus:ring-1 focus:ring-[#1E3A8A] focus:outline-none cursor-pointer"
                          >
                            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 px-2 sm:px-4 mb-2 gap-0.5 sm:gap-1.5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="py-1 sm:py-2 text-center text-[10px] sm:text-sm font-medium text-gray-500 truncate">{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid — individual rounded cards */}
                  <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 px-2 sm:px-4 pb-4">
                    {calendarDays.map((day, idx) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const inMonth = isSameMonth(day, currentDate);
                      const todayDay = isToday(day);
                      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                      const holiday = HOLIDAYS_LIST.find(h => h.date === dayStr);
                      const dayLeaves = leaveRequests.filter((req: any) => {
                        const s = new Date(req.start_date);
                        const e = new Date(req.end_date);
                        return day >= s && day <= e && req.status === 'approved';
                      });
                      const hasLeave = dayLeaves.length > 0;

                      if (!inMonth) {
                        return <div key={idx} className="rounded-lg sm:rounded-xl border border-gray-100 min-h-[40px] sm:min-h-[60px] bg-gray-50/40" />;
                      }

                      return (
                        <div
                          key={idx}
                          className={`rounded-lg sm:rounded-xl min-h-[40px] sm:min-h-[60px] p-1 sm:p-2 flex flex-col gap-0.5 transition overflow-hidden
                            ${holiday ? 'bg-green-50 border border-green-200' :
                              todayDay ? 'bg-white border-2 border-[#1E3A8A]' :
                                'bg-white border border-gray-200'}
                          `}
                        >
                          <span className={`text-xs sm:text-sm font-semibold leading-none ${isWeekend && !holiday ? 'text-gray-400' :
                            holiday ? 'text-gray-700' :
                              'text-gray-800'
                            }`}>
                            {format(day, 'd')}
                          </span>

                          {holiday && (
                            <span className="hidden sm:block text-[11px] font-medium text-green-700 leading-tight truncate">
                              {holiday.name}
                            </span>
                          )}

                          {hasLeave && !holiday && (
                            <span className="hidden sm:inline text-[10px] font-medium text-orange-600 bg-orange-50 rounded px-1 py-0.5 leading-tight w-fit">
                              Leave
                            </span>
                          )}

                          {isWeekend && !holiday && (
                            <span className="hidden sm:block text-[11px] text-gray-400 leading-tight">Week Off</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="w-4 h-4 rounded bg-green-100 border border-green-300 inline-block" />
                      Public Holiday
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
                      <span className="w-4 h-4 rounded bg-orange-100 border border-orange-300 inline-block" />
                      Leave (PTO)
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-[#1E3A8A]">
                      <span className="w-4 h-4 rounded-full border-2 border-[#1E3A8A] bg-white inline-block" />
                      Today
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                      <span className="w-4 h-4 rounded bg-gray-100 border border-gray-200 inline-block" />
                      Week Off
                    </div>
                  </div>
                </div>

                {/* My Leave Requests */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">My Leave Requests</h3>
                    <Button onClick={() => setShowRequestDialog(true)} className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold rounded-lg px-5 py-2 h-10 w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" /> Request Leave
                    </Button>
                  </div>
                  <div className="px-6 py-6">
                    {myRequests.length === 0 ? (
                      <p className="text-center text-gray-400 py-6 text-sm font-medium">No leave requests yet</p>
                    ) : (
                      <div className="space-y-3">
                        {myRequests.map((req: any) => (
                          <div key={req.id} className={`flex items-center justify-between p-4 rounded-xl border text-sm ${req.status === 'approved' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                            req.status === 'rejected' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                              'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                            }`}>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-white">{getLeaveTypeLabel(req.leave_type)}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{format(new Date(req.start_date), 'MMM d, yyyy')} — {format(new Date(req.end_date), 'MMM d, yyyy')}</p>
                            </div>
                            <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${req.status === 'approved' ? 'bg-green-100 text-green-700' :
                              req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{req.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ LEAVE BALANCE TAB ══════════ */}
            {activeTab === 'balance' && (() => {
              const totalAvailable = leaveBalances.reduce((s: number, b: any) => s + (Number(b.balance) || 0), 0);
              const totalUsed = leaveBalances.reduce((s: number, b: any) => s + (Number(b.availed) || 0), 0);
              const fmt = (n: number) => Number(n).toString();
              return (
                <div className="space-y-6">

                  {/* View Balance For row */}
                  {isAdmin && (
                    <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center gap-4 mb-6">
                      <span className="text-sm font-medium text-gray-700">View Balance For:</span>
                      <div className="relative">
                        <select
                          className="appearance-none text-sm font-medium border border-gray-300 rounded-lg px-4 py-2 pr-8 bg-white text-gray-700 min-w-[180px] cursor-pointer focus:outline-none"
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                          <option value="all">My Balance</option>
                          {usersData.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">▾</div>
                      </div>
                    </div>
                  )}

                  {/* Balance table card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
                      <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-gray-600" />
                        My Leave Balance (April 1, 2025 to March 31, 2026)
                      </h3>
                      {isAdmin && (
                        <Button onClick={() => { 
                          setBalanceUserId(selectedUserId !== 'all' ? selectedUserId : (currentUser?.id || '')); 
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = now.getMonth();
                          setBalanceFinancialYear(month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`);
                          setBalanceOpening('0');
                          setBalanceAvailed('0');
                          setBalanceAmount('0');
                          setBalanceLapse('0');
                          setShowEditBalanceDialog(true); 
                        }} className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-sm font-semibold rounded-lg px-4 py-2 h-10">
                          <Plus className="h-4 w-4 mr-1" /> Set Balance
                        </Button>
                      )}
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-4 px-6 font-semibold text-gray-700 bg-white">Leave Type</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700 bg-white">Financial Year</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700 bg-white">Opening Balance</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700 bg-white">Availed</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700 bg-white">Balance</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700 bg-white">Lapse</th>
                          {isAdmin && <th className="text-center py-4 px-6 font-semibold text-gray-700 bg-white">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {leaveBalances.length === 0 ? (
                          <tr>
                            <td colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-gray-400 text-sm italic">No balance records found.</td>
                          </tr>
                        ) : leaveBalances.map((b: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-6 font-medium text-gray-800">{b.leave_type}</td>
                            <td className="py-4 px-6 text-center text-gray-600">{b.financial_year || '-'}</td>
                            <td className="py-4 px-6 text-center text-gray-600">{Number(b.opening_balance ?? 0)}</td>
                            <td className="py-4 px-6 text-center font-medium text-orange-500">{Number(b.availed ?? 0)}</td>
                            <td className={`py-4 px-6 text-center font-semibold ${Number(b.balance) > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                              {Number(b.balance ?? 0)}
                            </td>
                            <td className="py-4 px-6 text-center font-medium text-orange-500">{Number(b.lapse ?? 0)}</td>
                            {isAdmin && (
                              <td className="py-4 px-6 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setBalanceUserId(b.user_id || (selectedUserId !== 'all' ? selectedUserId : currentUser?.id) || '');
                                    setBalanceLeaveType(b.leave_type || 'Casual Leave');
                                    setBalanceFinancialYear(b.financial_year || '2025-2026');
                                    setBalanceOpening(b.opening_balance?.toString() || '0');
                                    setBalanceAvailed(b.availed?.toString() || '0');
                                    setBalanceAmount(b.balance?.toString() || '0');
                                    setBalanceLapse(b.lapse?.toString() || '0');
                                    setShowEditBalanceDialog(true);
                                  }}
                                  className="text-[#1E3A8A] hover:bg-blue-50"
                                >
                                  Edit
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-6 py-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 italic">* Unpaid Leave and Compensatory Off are not tracked in balance</p>
                    </div>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-6 text-center">
                      <p className="text-xs font-medium text-gray-500 mb-3">Total Available</p>
                      <p className="text-4xl font-bold text-blue-600 tracking-tight">{fmt(totalAvailable)}</p>
                      <p className="text-xs text-gray-400 mt-2">days remaining</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-6 text-center">
                      <p className="text-xs font-medium text-gray-500 mb-3">Total Used</p>
                      <p className="text-4xl font-bold text-orange-500 tracking-tight">{fmt(totalUsed)}</p>
                      <p className="text-xs text-gray-400 mt-2">days taken</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-green-50 px-6 py-6 text-center">
                      <p className="text-xs font-medium text-gray-500 mb-3">Pending Requests</p>
                      <p className="text-4xl font-bold text-green-600 tracking-tight">{pendingRequests.length}</p>
                      <p className="text-xs text-gray-400 mt-2">awaiting approval</p>
                    </div>
                  </div>
                </div>
              );
            })()}


            {/* ══════════ SHIFTS TAB ══════════ */}
            {activeTab === 'shifts' && (() => {
              const weekStart = startOfISOWeek(shiftDate);
              const weekDays = [0, 1, 2, 3, 4, 5, 6].map(i => new Date(weekStart.getTime() + i * 86400000));
              return (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between px-6 py-5 gap-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 min-w-max">
                      <Clock className="h-5 w-5 text-gray-500" />
                      Shift Roster - Week of {format(weekStart, 'MMM d, yyyy')}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0 flex-shrink-0">
                      <button
                        onClick={() => setShiftDate(subWeeks(shiftDate, 1))}
                        className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition shadow-sm"
                      >Previous Week</button>
                      <button
                        onClick={() => setShiftDate(new Date())}
                        className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition shadow-sm"
                      >This Week</button>
                      <button
                        onClick={() => setShiftDate(addWeeks(shiftDate, 1))}
                        className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition shadow-sm"
                      >Next Week</button>
                      {isAdmin && (
                        <Button onClick={() => setShowAssignShiftDialog(true)} className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-sm font-semibold rounded-lg px-4 py-2 h-10 ml-1">
                          <Plus className="h-4 w-4 mr-1" /> Assign Shift
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-b border-gray-200 bg-gray-50">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700 w-56">Employee</th>
                          {weekDays.map((d, i) => {
                            const isWeekend = i === 5 || i === 6;
                            return (
                              <th key={i} className={`px-4 py-3 text-center font-semibold min-w-[90px] ${isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                                <div className="text-xs font-semibold">{format(d, 'EEE')}</div>
                                <div className="text-xs font-normal text-gray-400">{format(d, 'MMM d')}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {usersData.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm italic">
                              No employees found.
                            </td>
                          </tr>
                        ) : usersData.filter((user: any) => isAdmin || String(user.id) === String(currentUser?.id)).map((user: any) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-medium text-gray-800">{user.name || user.email?.split('@')[0]}</td>
                            {weekDays.map((day, i) => {
                              const dayStr = format(day, 'yyyy-MM-dd');
                              const isWeekend = i === 5 || i === 6;
                              const shift = shiftsData.find((s: any) =>
                                s.user_id === user.id && format(new Date(s.date), 'yyyy-MM-dd') === dayStr
                              );
                              return (
                                <td key={i} className="px-4 py-4 text-center">
                                  {shift ? (
                                    <span className="text-xs font-semibold py-1 px-2 bg-blue-50 text-blue-600 rounded">
                                      {shift.shift_type}
                                    </span>
                                  ) : isWeekend ? (
                                    <span className="text-xs text-gray-400">Off</span>
                                  ) : (
                                    <span className="text-xs text-gray-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}


            {/* ══════════ ATTENDANCE TAB ══════════ */}
            {activeTab === 'attendance' && (() => {
              // Filter by selected user
              const effectiveUserId = !isAdmin ? currentUser?.id : selectedUserId;
              const filteredAttendance = effectiveUserId === 'all' || !effectiveUserId
                ? attendanceData
                : attendanceData.filter((a: any) => String(a.user_id) === String(effectiveUserId));

              const presentCount = filteredAttendance.filter((a: any) => a.status === 'present').length;
              const absentCount = filteredAttendance.filter((a: any) => a.status === 'absent').length;
              const halfDayCount = filteredAttendance.filter((a: any) => a.status === 'half_day').length;
              const onLeaveCount = filteredAttendance.filter((a: any) => a.status === 'on_leave').length;

              const sortedAttendance = [...filteredAttendance].sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
              );

              const handleDownloadCSV = () => {
                try {
                  const headers = ['"Date"', '"Employee"', '"Status"', '"Shift"', '"Clock In"', '"Clock Out"', '"Total Hours"'];
                  const csvRows = sortedAttendance.map(rec => {
                    const user = usersData.find((u: any) => u.id === rec.user_id);
                    const dayStr = format(new Date(rec.date), 'yyyy-MM-dd');
                    const holiday = HOLIDAYS_LIST.find(h => h.date === dayStr);
                    
                    return [
                      `"${format(new Date(rec.date), 'dd/MM/yyyy')}"`,
                      `"${user?.name || user?.email?.split('@')[0] || user?.email || 'Unknown'}"`,
                      `"${holiday ? 'HOLIDAY' : (rec.status || '-')}"`,
                      `"General"`,
                      `"${rec.clock_in ? format(new Date(rec.clock_in), "HH:mm 'IST'") : '-'}"`,
                      `"${rec.clock_out ? format(new Date(rec.clock_out), "HH:mm 'IST'") : '-'}"`,
                      `"${formatHours(Number(rec.total_hours) || 0)}"`
                    ].join(',');
                  });

                  const csvContent = "\uFEFF" + [headers.join(','), ...csvRows].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  const selectedUser = usersData.find((u: any) => String(u.id) === String(selectedUserId));
                  const userName = selectedUserId === 'all' || !selectedUserId ? 'All_Employees' : (selectedUser?.name || selectedUser?.email?.split('@')[0] || 'Employee');
                  const safeUserName = userName.replace(/[^a-z0-9]/gi, '_');

                  const dateSuffix = attendanceView === 'filter'
                    ? `${filterStartDate}_to_${filterEndDate}`
                    : format(attendanceDate, 'MMM_yyyy');
                  link.setAttribute('download', `Attendance_${safeUserName}_${dateSuffix}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (error) {
                  logger.error('Error downloading CSV:', error);
                  toast({ title: 'Error', description: 'Failed to download attendance data', variant: 'destructive' });
                }
              };

              return (
                <div className="space-y-6">

                  {/* View Attendance For row */}
                  {isAdmin && (
                    <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center gap-4 mb-6">
                      <span className="text-sm font-medium text-gray-700">View Attendance For:</span>
                      <div className="relative">
                        <select
                          className="appearance-none text-sm font-medium border border-gray-300 rounded-lg px-4 py-2 pr-8 bg-white text-gray-700 min-w-[200px] cursor-pointer focus:outline-none"
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                          <option value="all">All Employees</option>
                          {usersData.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">▾</div>
                      </div>
                    </div>
                  )}

                  {/* Main attendance card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

                    {/* Title + Navigation */}
                    <div className="flex flex-wrap items-center justify-between px-6 py-5 gap-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 min-w-max">
                        <ClipboardList className="h-5 w-5 text-gray-500" />
                        {attendanceView === 'filter'
                          ? `Attendance - ${format(parseISO(filterStartDate), 'dd MMM yyyy')} to ${format(parseISO(filterEndDate), 'dd MMM yyyy')}`
                          : `Attendance - ${format(attendanceDate, 'MMMM yyyy')}`}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0 flex-shrink-0">
                        <Button
                          variant={attendanceView === 'month' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => { setAttendanceView('month'); setAttendanceDate(new Date()); }}
                          className={attendanceView === 'month' ? 'bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90' : 'bg-white text-gray-700'}
                        >
                          This Month
                        </Button>
                        <Button
                          variant={attendanceView === 'week' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => { setAttendanceView('week'); setAttendanceDate(new Date()); }}
                          className={attendanceView === 'week' ? 'bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90' : 'bg-white text-gray-700'}
                        >
                          This Week
                        </Button>
                        <Button
                          variant={attendanceView === 'filter' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAttendanceView('filter')}
                          className={attendanceView === 'filter' ? 'bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90' : 'bg-white text-gray-700'}
                        >
                          Filter
                        </Button>

                        {attendanceView === 'filter' && (
                          <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500 font-medium">From:</span>
                              <Input
                                type="date"
                                value={filterStartDate}
                                onChange={(e) => setFilterStartDate(e.target.value)}
                                className="h-8 text-xs w-[130px] px-2 py-1 bg-white border border-gray-300 rounded-lg text-gray-700 shadow-sm focus:ring-1 focus:ring-[#1E3A8A]"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500 font-medium">To:</span>
                              <Input
                                type="date"
                                value={filterEndDate}
                                onChange={(e) => setFilterEndDate(e.target.value)}
                                className="h-8 text-xs w-[130px] px-2 py-1 bg-white border border-gray-300 rounded-lg text-gray-700 shadow-sm focus:ring-1 focus:ring-[#1E3A8A]"
                              />
                            </div>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadCSV}
                          className="bg-green-600 hover:bg-green-700 text-white border-green-600 flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Excel
                        </Button>
                      </div>
                    </div>

                    {/* Stats 2x2 grid */}
                    <div className="grid grid-cols-2 gap-0 border-t border-gray-100 mx-6 mb-4 rounded-lg overflow-hidden">
                      <div className="bg-green-50 py-8 text-center border border-green-100 rounded-tl-lg rounded-bl-lg mr-px mt-0">
                        <p className="text-3xl font-bold text-green-500">{presentCount}</p>
                        <p className="text-sm text-gray-500 mt-1">Present</p>
                      </div>
                      <div className="bg-red-50 py-8 text-center border border-red-100 rounded-tr-lg rounded-br-lg">
                        <p className="text-3xl font-bold text-red-500">{absentCount}</p>
                        <p className="text-sm text-gray-500 mt-1">Absent</p>
                      </div>
                      <div className="bg-yellow-50 py-8 text-center border border-yellow-100 rounded-tl-lg rounded-bl-lg mr-px mt-2">
                        <p className="text-3xl font-bold text-yellow-500">{halfDayCount}</p>
                        <p className="text-sm text-gray-500 mt-1">Half Day</p>
                      </div>
                      <div className="bg-blue-50 py-8 text-center border border-blue-100 rounded-tr-lg rounded-br-lg mt-2">
                        <p className="text-3xl font-bold text-blue-500">{onLeaveCount}</p>
                        <p className="text-sm text-gray-500 mt-1">On Leave</p>
                      </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-t border-b border-gray-200 bg-white">
                            {['Date', 'Employee', 'Status', 'Shift', 'Clock In', 'Clock Out', 'Hours'].map(h => (
                              <th key={h} className="px-6 py-3 text-left font-semibold text-gray-700">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredAttendance.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm italic">
                                No attendance records for this period.
                              </td>
                            </tr>
                          ) : sortedAttendance.map((rec: any, i: number) => {
                            const user = usersData.find((u: any) => u.id === rec.user_id);
                            const dayStr = format(new Date(rec.date), 'yyyy-MM-dd');
                            const holiday = HOLIDAYS_LIST.find(h => h.date === dayStr);
                            
                            return (
                              <tr key={i} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 text-gray-600">{format(new Date(rec.date), 'EEE, MMM d')}</td>
                                <td className="px-6 py-4 font-medium text-gray-800">{user?.name || user?.email?.split('@')[0] || 'Unknown'}</td>
                                <td className="px-6 py-4">
                                  {holiday ? (
                                    <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase border border-green-200">Holiday</span>
                                  ) : (
                                    <span className="text-gray-400">{rec.status || '-'}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-gray-400">-</td>
                                <td className="px-6 py-4 text-gray-500">{rec.clock_in ? format(new Date(rec.clock_in), "HH:mm 'IST'") : '-'}</td>
                                <td className="px-6 py-4 text-gray-500">{rec.clock_out ? format(new Date(rec.clock_out), "HH:mm 'IST'") : '-'}</td>
                                <td className="px-6 py-4 text-gray-700">{formatHours(Number(rec.total_hours) || 0)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* ─── SIDEBAR (Calendar tab only) ─── */}
          {activeTab === 'calendar' && (
            <div className="w-full lg:w-64 flex-shrink-0 space-y-4 order-1 lg:order-2">

              {/* Pending Approvals */}
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <h4 className="font-semibold text-orange-500 text-sm">Pending Approvals</h4>
                </div>
                {pendingRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No pending requests</p>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((req: any) => (
                      <div key={req.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-700">{req.user_email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{getLeaveTypeLabel(req.leave_type)}</p>
                        <p className="text-xs text-gray-400">{format(new Date(req.start_date), 'MMM d')} — {format(new Date(req.end_date), 'MMM d')}</p>
                        {isAdmin && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => leaveMutation.updateStatus.mutate({ id: req.id, status: 'approved' })} className="flex-1 text-xs font-bold py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                              <Check className="inline h-3 w-3 mr-0.5" />Approve
                            </button>
                            <button onClick={() => leaveMutation.updateStatus.mutate({ id: req.id, status: 'rejected' })} className="flex-1 text-xs font-bold py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600">
                              <X className="inline h-3 w-3 mr-0.5" />Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Holidays */}
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-green-500" />
                    <h4 className="font-semibold text-gray-800 text-sm">Holidays ({format(currentDate, 'MMMM')})</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">INDIA</span>
                </div>
                {monthHolidays.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No holidays this month</p>
                ) : (
                  <div className="space-y-3">
                    {monthHolidays.map((h, i) => {
                      const d = parseISO(h.date);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="text-center min-w-[36px]">
                            <div className="text-[10px] font-bold text-blue-500 leading-none">{format(d, 'MMM').toUpperCase()}</div>
                            <div className="text-xl font-bold text-gray-800 leading-tight">{format(d, 'd')}</div>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">{h.name}</p>
                            <p className="text-[10px] text-gray-400">{format(d, 'EEEE')}</p>
                          </div>
                          <div className="ml-auto w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request Leave Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription>Select the dates and type of leave you need</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="start-date">Start Date *</Label>
              <Input id="start-date" type="date" value={selectedStartDate} onChange={e => setSelectedStartDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div>
              <Label htmlFor="end-date">End Date *</Label>
              <Input id="end-date" type="date" value={selectedEndDate} onChange={e => setSelectedEndDate(e.target.value)} min={selectedStartDate || format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div>
              <Label htmlFor="leave-type">Leave Type *</Label>
              <select id="leave-type" value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                <option value="Privilege Leave">PTO (Paid Time Off)</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
                <option value="Compensatory Off">Compensatory Off</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Provide a reason..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateLeave} disabled={submitting}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Balance Dialog ── */}
      <Dialog open={showEditBalanceDialog} onOpenChange={setShowEditBalanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Set / Edit Leave Balance</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Employee</Label>
              <select value={balanceUserId} onChange={e => setBalanceUserId(e.target.value)} className="w-full p-2 border rounded-lg text-sm mt-1">
                <option value="">Select employee...</option>
                {usersData.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Leave Type</Label>
                <select value={balanceLeaveType} onChange={e => setBalanceLeaveType(e.target.value)} className="w-full p-2 border rounded-lg text-sm mt-1">
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Privilege Leave">Privilege Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                  <option value="Compensatory Off">Compensatory Off</option>
                </select>
              </div>
              <div>
                <Label>Financial Year</Label>
                <Input type="text" value={balanceFinancialYear} onChange={e => setBalanceFinancialYear(e.target.value)} placeholder="e.g. 2025-2026" className="mt-1" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Opening Balance</Label>
                <Input type="number" step="0.5" min="0" value={balanceOpening} onChange={e => setBalanceOpening(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Availed</Label>
                <Input type="number" step="0.5" min="0" value={balanceAvailed} onChange={e => setBalanceAvailed(e.target.value)} placeholder="0" className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Balance (Remaining)</Label>
                <Input type="number" step="0.5" min="0" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Lapse</Label>
                <Input type="number" step="0.5" min="0" value={balanceLapse} onChange={e => setBalanceLapse(e.target.value)} placeholder="0" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!balanceUserId || !balanceFinancialYear}
              onClick={() => {
                leaveMutation.updateBalance.mutate({
                  user_id: balanceUserId,
                  leave_type: balanceLeaveType,
                  financial_year: balanceFinancialYear,
                  opening_balance: parseFloat(balanceOpening || '0'),
                  availed: parseFloat(balanceAvailed || '0'),
                  lapse: parseFloat(balanceLapse || '0'),
                  balance: parseFloat(balanceAmount || '0'),
                }, { onSuccess: () => { setShowEditBalanceDialog(false); } });
              }}
            >Save Balance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Shift Dialog ── */}
      <Dialog open={showAssignShiftDialog} onOpenChange={setShowAssignShiftDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Shift</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Employee</Label>
              <select value={shiftUserId} onChange={e => setShiftUserId(e.target.value)} className="w-full p-2 border rounded-lg text-sm mt-1">
                <option value="">Select employee...</option>
                {usersData.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={shiftAssignDate} onChange={e => setShiftAssignDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Shift Type</Label>
              <select value={shiftType} onChange={e => setShiftType(e.target.value)} className="w-full p-2 border rounded-lg text-sm mt-1">
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Night">Night</option>
                <option value="General">General</option>
                <option value="Rotational">Rotational</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!shiftUserId || !shiftAssignDate}
              onClick={() => {
                const shiftTimes: Record<string, { start: string, end: string }> = {
                  'Morning': { start: '06:00', end: '15:00' },
                  'Afternoon': { start: '14:00', end: '23:00' },
                  'Night': { start: '22:00', end: '07:00' },
                  'General': { start: '09:00', end: '18:00' },
                  'Rotational': { start: '09:00', end: '18:00' }
                };
                const times = shiftTimes[shiftType] || { start: '09:00', end: '18:00' };
                
                attendanceMutation.updateShift.mutate({
                  user_id: shiftUserId,
                  date: shiftAssignDate,
                  shift_type: shiftType,
                  start_time: times.start,
                  end_time: times.end,
                }, { onSuccess: () => { setShowAssignShiftDialog(false); } });
              }}
            >Assign Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveCalendar;