import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@sdk/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Bell, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type: "clock_in" | "leave_request" | "issue_assigned" | "leave_approved" | "leave_rejected" | "issue_comment";
  title: string;
  message: string;
  action?: () => void;
  link?: string;
}

export function NotificationPopup() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(new Set());
  const shownNotificationIdsRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  // Keep ref in sync with state
  useEffect(() => {
    shownNotificationIdsRef.current = shownNotificationIds;
  }, [shownNotificationIds]);

  useEffect(() => {
    checkNotifications();
    
    // Check every 30 minutes for new notifications (reduced frequency to avoid spam)
    const interval = setInterval(() => {
      // Only check if popup was already shown (to avoid re-triggering)
      if (hasChecked) {
        checkNotifications();
      }
    }, 30 * 60 * 1000);
    
    // Poll for new notifications (real-time subscription removed - using polling instead)
    return () => {
      clearInterval(interval);
    };
  }, [navigate, hasChecked]);

  const checkNotifications = async () => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      setHasChecked(true);
      return;
    }

    const user = JSON.parse(userData);
    const userId = user.id;
    if (!userId) {
      setHasChecked(true);
      return;
    }
    const items: NotificationItem[] = [];

    // Check clock-in status
    await checkClockInReminder(userId, items);

    // Check unread notifications from database
    await checkDatabaseNotifications(userId, items);

    // Check pending leave requests
    await checkLeaveRequests(userId, items);

    // Check new issue assignments
    await checkIssueAssignments(userId, items);

    // Track new notifications that haven't been shown yet
    const newNotifications = items.filter(item => !shownNotificationIdsRef.current.has(item.id));
    
    // Show toast for new notifications (after initial load)
    if (hasChecked && newNotifications.length > 0) {
      newNotifications.forEach((item) => {
        toast.info(item.title, {
          description: item.message,
          duration: 5000,
          action: item.link ? {
            label: "View",
            onClick: () => {
              if (item.action) {
                item.action();
              } else if (item.link) {
                navigate(item.link);
              }
            },
          } : undefined,
        });
        setShownNotificationIds(prev => {
          const newSet = new Set(prev);
          newSet.add(item.id);
          return newSet;
        });
      });
    }

    setNotifications(items);
    
    // Don't show popup - just mark as checked
    // All notifications will show in bell icon only
    if (!hasChecked) {
      setHasChecked(true);
      
      // Mark all notifications as shown
      items.forEach((item) => {
        setShownNotificationIds(prev => {
          const newSet = new Set(prev);
          newSet.add(item.id);
          return newSet;
        });
      });
    }
  };

  const checkClockInReminder = async (userId: string, items: NotificationItem[]) => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Only check on weekdays (Monday-Friday) and during work hours (9 AM - 5 PM)
      if (currentDay >= 1 && currentDay <= 5 && currentHour >= 9 && currentHour < 17) {
        // Check if we've already shown this reminder today (using localStorage)
        const today = new Date().toDateString();
        const lastShownDate = localStorage.getItem(`clock-in-reminder-${userId}`);
        const wasDismissedToday = lastShownDate === today;
        
        // If already shown today, skip
        if (wasDismissedToday && shownNotificationIdsRef.current.has("clock-in-reminder")) {
          return;
        }

        // Check if user has clocked in today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        try {
          const currentEntry = await api.timesheets.getCurrent() as any;
          
          // If no entry today or last entry was clocked out, show reminder
          // But only if we haven't shown it today
          if (!currentEntry && !wasDismissedToday) {
            items.push({
              id: "clock-in-reminder",
              type: "clock_in",
              title: "⏰ Time to Clock In!",
              message: "You haven't clocked in today. Don't forget to track your time!",
              action: () => {
                navigate("/time-clock");
                setOpen(false);
              },
              link: "/time-clock",
            });
          }
        } catch (error) {
          // If error, assume no clock-in and show reminder
          if (!wasDismissedToday) {
            items.push({
              id: "clock-in-reminder",
              type: "clock_in",
              title: "⏰ Time to Clock In!",
              message: "You haven't clocked in today. Don't forget to track your time!",
              action: () => {
                navigate("/time-clock");
                setOpen(false);
              },
              link: "/time-clock",
            });
          }
        }
      }
    } catch (error) {
      // Silently fail - don't show error for clock-in reminder
    }
  };

  const checkDatabaseNotifications = async (userId: string, items: NotificationItem[]) => {
    try {
      const response = await api.notifications.getAll(true) as any; // unreadOnly = true
      const notifications = response.notifications || response || [];

      if (notifications.length > 0) {
        notifications.slice(0, 5).forEach((notification: any) => {
          const item: NotificationItem = {
            id: notification.id,
            type: notification.type as any,
            title: notification.title,
            message: notification.message,
            link: notification.link || undefined,
          };

          // Add action based on type
          if (notification.link) {
            item.action = () => {
              navigate(notification.link!);
              setOpen(false);
            };
          }

          items.push(item);
        });
      }
    } catch (error) {
      // Silently fail - don't show error for notifications
    }
  };

  const checkLeaveRequests = async (userId: string, items: NotificationItem[]) => {
    try {
      // Check if user has pending leave requests
      const response = await api.leave.getAll() as any;
      const leaveRequests = Array.isArray(response) ? response : (response.leave_requests || []);

      const pendingLeave = leaveRequests.find((req: any) => 
        req.user_id === userId && req.status === 'pending'
      );

      if (pendingLeave) {
        items.push({
          id: `leave-${pendingLeave.id}`,
          type: "leave_request",
          title: "📅 Pending Leave Request",
          message: `You have a pending leave request from ${new Date(pendingLeave.start_date).toLocaleDateString()}`,
          action: () => {
            navigate("/leave-calendar");
            setOpen(false);
          },
          link: "/leave-calendar",
        });
      }

      // Check if user is admin and has pending leave requests to approve
      try {
        const currentUser = await api.auth.getMe() as any;
        if (currentUser?.user?.role === "admin") {
          const pendingApprovals = leaveRequests.filter((req: any) => req.status === 'pending');
          
          if (pendingApprovals.length > 0) {
            items.push({
              id: "leave-approvals-pending",
              type: "leave_request",
              title: "📋 Leave Requests Pending Approval",
              message: `You have ${pendingApprovals.length} leave request(s) waiting for your approval`,
              action: () => {
                navigate("/leave-calendar");
                setOpen(false);
              },
              link: "/leave-calendar",
            });
          }
        }
      } catch (error) {
        // Silently fail admin check
      }
    } catch (error) {
      // Silently fail - don't show error for leave requests
    }
  };

  const checkIssueAssignments = async (userId: string, items: NotificationItem[]) => {
    try {
      // Check for recently assigned issues (within last 24 hours)
      const response = await api.issues.getAll() as any;
      const issues = response.issues || response || [];

      // Filter issues assigned to this user that were created in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentAssignments = issues.filter((issue: any) => {
        if (!issue.assignees || !Array.isArray(issue.assignees)) return false;
        const isAssigned = issue.assignees.some((assignee: any) => assignee.user_id === userId || assignee.id === userId);
        const isRecent = new Date(issue.created_at || issue.createdAt) >= yesterday;
        return isAssigned && isRecent;
      }).slice(0, 5);

      if (recentAssignments.length > 0) {
        recentAssignments.forEach((issue: any) => {
          items.push({
            id: `issue-${issue.id}`,
            type: "issue_assigned",
            title: "📋 New Issue Assigned",
            message: `You've been assigned to: ${issue.title}`,
            action: () => {
              navigate(`/issues/${issue.id}`);
              setOpen(false);
            },
            link: `/issues/${issue.id}`,
          });
        });
      }
    } catch (error) {
      // Silently fail - don't show error for issue assignments
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (notification.action) {
      notification.action();
    } else if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "clock_in":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "leave_request":
        return <Calendar className="h-5 w-5 text-orange-500" />;
      case "issue_assigned":
        return <Bell className="h-5 w-5 text-purple-500" />;
      case "leave_approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "leave_rejected":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Don't show popup - notifications only appear in bell icon
  return null;
}

