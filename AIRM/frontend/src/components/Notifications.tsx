import { useState, useEffect } from "react";
import { api } from "@sdk/api";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
  related_id: string | null;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();

    // Poll for new notifications every 60 seconds
    const interval = setInterval(() => {
      loadNotifications();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []); // Remove profiles dependency to prevent redundant re-loads

  const loadNotifications = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const response = await api.notifications.getAll() as any;
      const data = response.notifications || response || [];

      // Sort by created_at descending and limit to 15
      const sortedData = (Array.isArray(data) ? data : []).sort((a: any, b: any) =>
        new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime()
      ).slice(0, 15);

      setNotifications(sortedData);
      setUnreadCount(sortedData.filter((n: any) => !n.read).length);
    } catch (error) {
      // Silently fail - don't show error for notifications
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.notifications.markRead(notificationId);
      loadNotifications();
    } catch (error) {
      // Silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.notifications.markAllRead();
      loadNotifications();
    } catch (error) {
      // Silently fail
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "issue_assigned":
        return "📋";
      case "issue_comment":
        return "💬";
      case "leave_request":
        return "📅";
      case "leave_approved":
        return "✅";
      case "leave_rejected":
        return "❌";
      case "anniversary":
        return "🎉";
      default:
        return "🔔";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`cursor-pointer px-4 py-3 ${!notification.read ? "bg-blue-50/50" : ""
                  }`}
              >
                <div className="flex gap-3 w-full">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm">{notification.title}</p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

