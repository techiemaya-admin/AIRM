import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUsers } from "@/hooks/useUsers";
import { useMonitoring } from "@/hooks/useMonitoring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Clock, MapPin, Pause, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/PageSkeletons";

interface Issue {
  id: number;
  title: string;
  project_name?: string;
}

interface ClockOutComment {
  id: string;
  comment: string;
  created_at: string;
  user_email?: string;
}

interface TimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  total_hours: number | null;
  status: string;
  issue: Issue | null;
  project_name: string | null;
  pause_start: string | null;
  paused_duration: number | null;
  pause_reason: string | null;
  latitude: number | null;
  longitude: number | null;
  location_timestamp: string | null;
  location_address: string | null;
  user_email?: string;
  clock_out_comment?: ClockOutComment | null;
}

const Monitoring = () => {
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  // Get recent entries (last 24 hours) for the query
  const params = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { start_date: yesterday.toISOString() };
  }, []);

  const { data: allEntriesData = [], isLoading: monitoringLoading, refetch: refetchMonitoring } = useMonitoring(params);
  const { data: usersData = [], isLoading: usersLoading } = useUsers();

  const loading = userLoading || monitoringLoading || usersLoading;

  const entries = useMemo(() => {
    if (selectedUserId === "all") return allEntriesData;
    return allEntriesData.filter((e: any) => e.user_id === selectedUserId);
  }, [allEntriesData, selectedUserId]);

  const summaryStats = useMemo(() => {
    const clockedOutEntries = entries.filter((e: any) => e.status === "clocked_out");
    return {
      totalEntries: entries.length,
      activeEntries: entries.filter((e: any) => e.status === "clocked_in").length,
      pausedEntries: entries.filter((e: any) => e.status === "paused").length,
      clockedOutEntries: clockedOutEntries.length,
      clockedOutHours: clockedOutEntries.reduce((sum: number, e: any) => sum + (e.total_hours || 0), 0),
      totalHours: entries.reduce((sum: number, e: any) => {
        if (e.total_hours) {
          return sum + e.total_hours;
        } else if (e.status === "clocked_in" || e.status === "paused") {
          const clockInTime = new Date(e.clock_in).getTime();
          const now = Date.now();
          const pausedMs = (e.paused_duration || 0) * 60 * 60 * 1000;
          const elapsedMs = now - clockInTime - pausedMs;
          return sum + (elapsedMs / (1000 * 60 * 60));
        }
        return sum;
      }, 0),
      totalPausedHours: entries.reduce((sum: number, e: any) => sum + (e.paused_duration || 0), 0),
      uniqueUsers: new Set(entries.map((e: any) => e.user_id)).size,
    };
  }, [entries]);

  const usersList = useMemo(() => {
    const uniqueUserIds = new Set(allEntriesData.map((e: any) => e.user_id));
    return Array.from(uniqueUserIds).map(userId => {
      const entry = allEntriesData.find((e: any) => e.user_id === userId);
      return {
        user_id: userId,
        email: entry?.user_email || "Unknown"
      };
    });
  }, [allEntriesData]);

  const getElapsedTime = (clockIn: string, pausedDuration: number = 0) => {
    const start = new Date(clockIn).getTime();
    const now = Date.now();
    const totalMinutes = Math.floor((now - start) / 60000);
    const activeMinutes = Math.max(0, totalMinutes - (pausedDuration * 60));
    const hours = Math.floor(activeMinutes / 60);
    const minutes = activeMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (loading && entries.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-10 w-64 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} cols={4} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentUser && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Admin privileges required to access this page.</p>
          <Button onClick={() => navigate("/time-clock")}>Go to Time Clock</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 mr-14 md:mr-24">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Monitoring</h1>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalEntries}</div>
              <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summaryStats.activeEntries}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {summaryStats.pausedEntries > 0 && `${summaryStats.pausedEntries} paused`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Clocked Out Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {summaryStats.clockedOutEntries}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {summaryStats.clockedOutEntries > 0
                  ? `${Number(summaryStats.clockedOutHours || 0).toFixed(1)}h total`
                  : "No clock outs"
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Number(summaryStats.totalHours || 0).toFixed(1)}h
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {summaryStats.totalPausedHours > 0 && `${Number(summaryStats.totalPausedHours || 0).toFixed(1)}h paused`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.uniqueUsers}</div>
              <p className="text-xs text-gray-500 mt-1">Tracked today</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Time Entries (Last 24 Hours) - {entries.length}</span>
              <div className="flex items-center gap-4">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="text-sm px-3 py-1.5 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="all">All Employees ({allEntriesData.length})</option>
                  {usersList.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.email} ({allEntriesData.filter((e: any) => e.user_id === user.user_id).length})
                    </option>
                  ))}
                </select>
                <span className="text-sm font-normal text-gray-500">Real-time employee activity</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No time entries in the last 24 hours
              </p>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border ${entry.status === "paused"
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                      : entry.status === "clocked_out"
                        ? "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
                        : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{entry.user_email}</h3>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">Issue:</span>
                            <span>{entry.issue?.title || "N/A"}</span>
                          </div>

                          {entry.project_name && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Project:</span>
                              <span>{entry.project_name}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="font-medium">Clock In:</span>
                            <span>{format(new Date(entry.clock_in), "MMM dd, yyyy hh:mm a")}</span>
                          </div>

                          {entry.clock_out && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Clock Out:</span>
                              <span>{format(new Date(entry.clock_out), "MMM dd, yyyy hh:mm a")}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.clock_out ? "Total Time:" : "Elapsed Time:"}</span>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              {entry.clock_out
                                ? `${Number(entry.total_hours || 0).toFixed(2)}h`
                                : getElapsedTime(entry.clock_in, entry.paused_duration || 0)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-medium">Status:</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${entry.status === "paused"
                              ? "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100"
                              : entry.status === "clocked_out"
                                ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                : "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100"
                              }`}>
                              {entry.status === "paused" ? "⏸ Paused" : entry.status === "clocked_out" ? "⏹ Clocked Out" : "▶ Active"}
                            </span>
                          </div>

                          {entry.notes && (
                            <div>
                              <span className="font-medium">Notes:</span>
                              <p className="text-gray-600 dark:text-gray-300 mt-1">{entry.notes}</p>
                            </div>
                          )}

                          {/* Pause Details - Show when paused or has pause history */}
                          {entry.pause_start && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 text-sm">
                                <Pause className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <span className="font-medium">Pause Started:</span>
                                <span>{format(new Date(entry.pause_start), "MMM dd, yyyy hh:mm a")}</span>
                              </div>
                              {entry.paused_duration && entry.paused_duration > 0 && (
                                <div className="flex items-center gap-2 text-sm mt-1">
                                  <span className="font-medium">Paused Duration:</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    {(Number(entry.paused_duration || 0) * 60).toFixed(0)} minutes
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Location Information */}
                        {(entry.location_address || (entry.latitude && entry.longitude)) ? (
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-start gap-2 mb-2">
                              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1">Location</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {entry.location_address || `${entry.latitude?.toFixed(6)}, ${entry.longitude?.toFixed(6)}`}
                                </p>
                                {entry.location_timestamp && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Captured: {format(new Date(entry.location_timestamp), "hh:mm a")}
                                  </p>
                                )}
                              </div>
                            </div>

                            {entry.latitude && entry.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                View on Google Maps →
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1 text-gray-600 dark:text-gray-400">Location</p>
                                <p className="text-xs text-gray-500">
                                  Location tracking is enabled. Location will be captured on next clock-in.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Clock Out Comment */}
                        {entry.clock_out_comment && entry.status === "clocked_out" && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1 text-blue-900 dark:text-blue-100">
                                  Clock Out Comment
                                </p>
                                <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                  {entry.clock_out_comment.comment}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  {format(new Date(entry.clock_out_comment.created_at), "MMM dd, yyyy hh:mm a")}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pause Details Card - Enhanced */}
                        {entry.pause_reason && (
                          <div className={`p-3 rounded-lg border ${entry.status === "paused"
                            ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
                            : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                            }`}>
                            <div className="flex items-start gap-2">
                              <Pause className={`h-5 w-5 flex-shrink-0 mt-0.5 ${entry.status === "paused"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-gray-500 dark:text-gray-400"
                                }`} />
                              <div className="flex-1">
                                <p className={`font-medium text-sm mb-1 ${entry.status === "paused"
                                  ? "text-amber-900 dark:text-amber-100"
                                  : "text-gray-700 dark:text-gray-300"
                                  }`}>
                                  {entry.status === "paused" ? "Currently Paused" : "Pause History"}
                                </p>
                                <p className={`text-sm mb-2 ${entry.status === "paused"
                                  ? "text-amber-800 dark:text-amber-200"
                                  : "text-gray-600 dark:text-gray-400"
                                  }`}>
                                  <span className="font-medium">Reason:</span> {entry.pause_reason}
                                </p>

                                {entry.pause_start && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span className="font-medium">Paused at:</span> {format(new Date(entry.pause_start), "MMM dd, yyyy hh:mm a")}
                                  </div>
                                )}

                                {entry.paused_duration && entry.paused_duration > 0 && (
                                  <div className={`text-xs mt-1 ${entry.status === "paused"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-gray-500 dark:text-gray-400"
                                    }`}>
                                    <span className="font-medium">Total paused time:</span> {(entry.paused_duration * 60).toFixed(0)} minutes ({(entry.paused_duration).toFixed(2)} hours)
                                  </div>
                                )}

                                {entry.status === "paused" && entry.pause_start && (
                                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                                    ⏸ Currently paused - waiting for resume
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Monitoring;

