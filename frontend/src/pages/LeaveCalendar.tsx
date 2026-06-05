import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@sdk/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Check, X, Clock, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay, getDay, isSameDay, parseISO } from "date-fns";


interface LeaveRequest {
  id: string;
  user_id: string;
  user_email?: string;
  start_date: string;
  end_date: string;
  leave_type: 'pto' | 'sick' | 'vacation' | 'personal' | 'unpaid';
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
}

const HOLIDAYS = [
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



export default function LeaveCalendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<'pto' | 'sick' | 'vacation' | 'personal' | 'unpaid'>('pto');
  const [reason, setReason] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.id) {
          navigate("/auth");
          return;
        }

        setCurrentUser(userData);
        // Check user role from localStorage
        const adminStatus = userData.role === 'admin';
        setIsAdmin(adminStatus);

        await loadMyLeaveRequests(userData.id);
        if (adminStatus) {
          await loadAllLeaveRequests();
        }
      } catch (error) {
        console.error('Error initializing leave calendar:', error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [navigate]);

  const loadMyLeaveRequests = async (userId: string) => {
    try {
      const response = await api.leave.getAll() as any;
      const allRequests = response.leave_requests || response || [];
      // Filter to only current user's requests
      const myRequests = allRequests.filter((req: any) => req.user_id === userId);
      setMyLeaveRequests(myRequests);
    } catch (error) {
      console.error("Error loading leave requests:", error);
      setMyLeaveRequests([]);
    }
  };

  const loadAllLeaveRequests = async () => {
    try {
      const response = await api.leave.getAll() as any;
      const allRequests = response.leave_requests || response || [];
      setAllLeaveRequests(allRequests);
    } catch (error) {
      console.error("Error loading all leave requests:", error);
      setAllLeaveRequests([]);
    }
  };

  const createLeaveRequest = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (new Date(selectedEndDate) < new Date(selectedStartDate)) {
      toast({
        title: "Error",
        description: "End date must be after or equal to start date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await api.leave.create({
        start_date: selectedStartDate,
        end_date: selectedEndDate,
        leave_type: leaveType,
        reason: reason || null,
      });

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
      setShowRequestDialog(false);
      setSelectedStartDate("");
      setSelectedEndDate("");
      setReason("");
      if (currentUser?.id) {
        await loadMyLeaveRequests(currentUser.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create leave request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLeaveStatus = async (requestId: string, newStatus: 'approved' | 'rejected', adminNotes?: string) => {
    setLoading(true);

    try {
      await api.leave.updateStatus(requestId, newStatus, adminNotes);

      toast({
        title: "Success",
        description: `Leave request ${newStatus}`,
      });
      await loadAllLeaveRequests();
      if (currentUser) {
        await loadMyLeaveRequests(currentUser.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteLeaveRequest = async (requestId: string) => {
    // TODO: Add delete endpoint to API
    toast({
      title: "Coming Soon",
      description: "Delete functionality will be available soon",
      variant: "default",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'pto': 'PTO (Paid Time Off)',
      'sick': 'Sick Leave',
      'vacation': 'Vacation',
      'personal': 'Personal Leave',
      'unpaid': 'Unpaid Leave'
    };
    return labels[type] || type;
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Get the start of the calendar grid (includes padding from previous month)
  const calendarStart = startOfMonth(monthStart);
  const startDay = calendarStart.getDay();
  const calendarGridStart = new Date(monthStart);
  calendarGridStart.setDate(monthStart.getDate() - startDay);

  // Get all days for the calendar grid (6 weeks * 7 days)
  const calendarGridEnd = new Date(calendarGridStart);
  calendarGridEnd.setDate(calendarGridStart.getDate() + 41);

  const monthDays = eachDayOfInterval({ start: calendarGridStart, end: calendarGridEnd });

  // Get leave days for calendar highlighting
  const leaveDays = myLeaveRequests
    .filter(req => req.status === 'approved')
    .flatMap(req => {
      // Parse dates properly to avoid timezone issues
      const [startYear, startMonth, startDay] = req.start_date.split('-').map(Number);
      const [endYear, endMonth, endDay] = req.end_date.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      return eachDayOfInterval({ start, end });
    });

  const isLeaveDay = (date: Date) => {
    return leaveDays.some(leaveDay =>
      format(leaveDay, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Leave Calendar</h1>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">Holiday System Active v2</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-50"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() - 1);
                      setCurrentMonth(newMonth);
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="text-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-50"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    className="text-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-50"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() + 1);
                      setCurrentMonth(newMonth);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-sm py-2">
                      {day}
                    </div>
                  ))}
                  {monthDays.map(day => {
                    const isLeave = isLeaveDay(day);
                    const dayString = format(day, 'yyyy-MM-dd');
                    const holiday = HOLIDAYS.find(h => h.date === dayString);
                    const isHoliday = !!holiday;
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                    const isPast = isBefore(day, startOfDay(new Date()));

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                          text-center py-3 rounded-lg border flex flex-col items-center justify-start min-h-[80px]
                          ${isToday(day) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                          ${isLeave ? 'bg-green-100 border-green-300' : ''}
                          ${isHoliday ? 'bg-purple-100 border-purple-300' : ''}
                          ${!isSameMonth(day, currentMonth) ? 'text-gray-400' : ''}
                          ${isPast && !isLeave && !isHoliday ? 'opacity-50' : ''}
                        `}
                      >
                        <div className="text-sm font-medium">{format(day, 'd')}</div>
                        {isLeave && (
                          <div className="text-xs text-green-700 font-medium mt-1 bg-green-200 px-1.5 py-0.5 rounded-full">PTO</div>
                        )}
                        {isHoliday && (
                          <div className="flex flex-col items-center mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mb-1"></div>
                            <div className="text-[10px] text-purple-700 font-bold leading-tight px-1 text-center">{holiday.name}</div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-6 text-sm text-gray-600 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                    <span>Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-50 border border-blue-500 rounded"></div>
                    <span>Today</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* My Leave Requests */}
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Leave Requests</CardTitle>
                <Button onClick={() => setShowRequestDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Leave
                </Button>
              </CardHeader>
              <CardContent>
                {myLeaveRequests.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No leave requests yet</p>
                ) : (
                  <div className="space-y-3">
                    {myLeaveRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`border rounded-lg p-4 ${getStatusColor(request.status)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{getLeaveTypeLabel(request.leave_type)}</h3>
                              <span className="text-xs uppercase px-2 py-1 rounded border">
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm mt-1">
                              {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                            </p>
                            {request.reason && (
                              <p className="text-sm mt-2">Reason: {request.reason}</p>
                            )}
                            {request.admin_notes && (
                              <p className="text-sm mt-2 italic">Admin Notes: {request.admin_notes}</p>
                            )}
                          </div>
                          {request.status === 'pending' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteLeaveRequest(request.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Holidays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {HOLIDAYS.filter(h => h.date.startsWith(format(currentMonth, 'yyyy-MM')))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded bg-purple-50 border border-purple-200">
                        <div>
                          <p className="text-sm font-bold text-purple-900">{h.name}</p>
                          <p className="text-xs text-purple-700">{format(parseISO(h.date), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-sm animate-pulse"></div>
                      </div>
                    ))}
                  {HOLIDAYS.filter(h => h.date.startsWith(format(currentMonth, 'yyyy-MM'))).length === 0 && (
                    <p className="text-center text-gray-500 py-4 text-sm">No holidays this month</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  {allLeaveRequests.filter(r => r.status === 'pending').length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending requests</p>
                  ) : (
                    <div className="space-y-3">
                      {allLeaveRequests
                        .filter(r => r.status === 'pending')
                        .map((request) => (
                          <div key={request.id} className="border rounded-lg p-3">
                            <p className="font-semibold text-sm">{request.user_email}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {getLeaveTypeLabel(request.leave_type)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                            </p>
                            {request.reason && (
                              <p className="text-xs text-gray-600 mt-1">{request.reason}</p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => updateLeaveStatus(request.id, 'approved')}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => updateLeaveStatus(request.id, 'rejected')}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>

      {/* Request Leave Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription>
              Select the dates and type of leave you need
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date *</Label>
              <Input
                id="end-date"
                type="date"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
                min={selectedStartDate || format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <Label htmlFor="leave-type">Leave Type *</Label>
              <select
                id="leave-type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="pto">PTO (Paid Time Off)</option>
                <option value="sick">Sick Leave</option>
                <option value="vacation">Vacation</option>
                <option value="personal">Personal Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for your leave..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createLeaveRequest} disabled={loading}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

