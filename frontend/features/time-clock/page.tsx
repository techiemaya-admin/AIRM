import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, Play, Square, Pause, FolderKanban, TrendingUp, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TableSkeleton } from "@/components/PageSkeletons";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIssues } from "@/hooks/useIssues";
import { useProjects } from "@/hooks/useProjects";
import { useActiveTimesheet, useTimesheetEntries, useTimesheetMutation } from "@/hooks/useTimesheets";
import { formatHours } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface Issue {
  id: number;
  title: string;
  project_name?: string;
  status: string;
}

interface TimeEntry {
  id: string;
  user_id?: string;
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
}

const TimeClock = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);
  const [clockOutComment, setClockOutComment] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: issuesData = [], isLoading: issuesLoading } = useIssues();
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects();
  const { data: currentEntry, isLoading: activeLoading } = useActiveTimesheet();
  const { data: timeEntries = [], isLoading: entriesLoading } = useTimesheetEntries({ limit: 10, user_id: user?.id });
  const timesheetMutation = useTimesheetMutation();

  const [chartView, setChartView] = useState<'Month' | 'Year'>('Month');

  // Live elapsed timer
  useEffect(() => {
    if (currentEntry && currentEntry.status !== 'paused') {
      const clockInTime = new Date(currentEntry.clock_in).getTime();
      const pausedMs = Number(currentEntry.paused_duration || 0) * 3600 * 1000;
      const tick = () => {
        const now = Date.now();
        const totalSecs = Math.floor((now - clockInTime - pausedMs) / 1000);
        setElapsedSeconds(Math.max(0, totalSecs));
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (currentEntry?.paused_duration) {
        const clockInTime = new Date(currentEntry.clock_in).getTime();
        const pausedMs = Number(currentEntry.paused_duration) * 3600 * 1000;
        setElapsedSeconds(Math.floor((Date.now() - clockInTime - pausedMs) / 1000));
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentEntry]);

  const formatElapsed = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return {
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
      s: String(s).padStart(2, '0'),
    };
  };

  const chartData = useMemo(() => {
    const days = chartView === 'Month' ? 30 : 12;
    const data = [];
    const now = new Date();

    if (chartView === 'Month') {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        data.push({
          name: format(d, 'dd MMM'),
          dateStr: format(d, 'yyyy-MM-dd'),
          Projects: 0,
          Issues: 0
        });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        data.push({
          name: format(d, 'MMM yyyy'),
          dateStr: format(d, 'yyyy-MM'),
          Projects: 0,
          Issues: 0
        });
      }
    }

    const getStr = (dateVal: string) => dateVal ? dateVal.substring(0, chartView === 'Month' ? 10 : 7) : '';

    projectsData?.forEach((p: any) => {
      const pDate = p.created_at || p.created;
      if (pDate) {
        const pt = data.find(x => x.dateStr === getStr(pDate));
        if (pt) pt.Projects++;
      }
    });

    issuesData?.forEach((i: any) => {
      const iDate = i.created_at || i.created;
      if (iDate) {
        const pt = data.find(x => x.dateStr === getStr(iDate));
        if (pt) pt.Issues++;
      }
    });

    // If completely empty due to no tracking, just to look good!
    return data;
  }, [projectsData, issuesData, chartView]);

  const loading = userLoading || issuesLoading || projectsLoading || activeLoading || entriesLoading || timesheetMutation.clockIn.isPending || timesheetMutation.clockOut.isPending || timesheetMutation.pause.isPending || timesheetMutation.resume.isPending;

  const activeIssues = useMemo(() => {
    return issuesData.filter((issue: any) =>
      issue.status === 'open' || issue.status === 'in_progress'
    ).map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      project_name: issue.project_name,
      status: issue.status,
    }));
  }, [issuesData]);

  const getUserLocation = (): Promise<{ latitude: number, longitude: number, accuracy?: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({
          title: "Location Unavailable",
          description: "Your browser doesn't support geolocation.",
          variant: "destructive",
        });
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let errorMessage = "Unable to get location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied. Please enable location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable. Please check your device's location settings.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out. Please try again.";
              break;
          }
          toast({ title: "Location Error", description: errorMessage });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'TechieMaya-Timesheet-App' } }
      );
      if (!response.ok) return null;
      const data = await response.json();
      const address = data.address;
      const parts = [];
      if (address.road) parts.push(address.road);
      if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
      if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);
      return parts.length > 0 ? parts.join(", ") : data.display_name;
    } catch (error) {
      return null;
    }
  };

  const clockIn = async () => {
    if (!user) return;
    if (!selectedIssueId) {
      toast({ title: "Issue Required", description: "Please select an issue", variant: "destructive" });
      return;
    }

    try {
      toast({ title: "Getting location...", description: "Please wait while we get your accurate location." });
      const location = await getUserLocation();
      let locationAddress = null;
      if (location) {
        locationAddress = await getAddressFromCoordinates(location.latitude, location.longitude);
      }

      const issueIdNum = parseInt(selectedIssueId, 10);
      await timesheetMutation.clockIn.mutateAsync({
        issue_id: issueIdNum,
        project_name: projectName || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        location_address: locationAddress || null,
      });

      setSelectedIssueId("");
      setProjectName("");
      setNotes("");

      let locationMsg = "";
      if (locationAddress) {
        locationMsg = ` Location: ${locationAddress}`;
        if (location?.accuracy) {
          const accuracyText = location.accuracy < 50 ? "High accuracy" : location.accuracy < 100 ? "Good accuracy" : "Approximate";
          locationMsg += ` (${accuracyText}: ±${Math.round(location.accuracy)}m)`;
        }
      } else if (location) {
        locationMsg = ` Location captured`;
      }

      toast({ title: "Clocked In Successfully", description: `Time tracking started!${locationMsg}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to clock in", variant: "destructive" });
    }
  };

  const performClockOut = async (comment?: string) => {
    if (!user || !currentEntry) return;

    try {
      const response = await timesheetMutation.clockOut.mutateAsync({ comment: comment || undefined }) as any;
      const totalHours = response?.total_hours || 0;

      setShowClockOutDialog(false);
      setClockOutComment("");

      window.dispatchEvent(new CustomEvent('timesheetClockOut', { detail: { totalHours, timestamp: Date.now() } }));
      localStorage.setItem('timesheetRefreshTrigger', Date.now().toString());

      toast({
        title: "Clocked Out Successfully",
        description: `${formatHours(totalHours)} saved to timesheet${comment ? ' with comment' : ''}.`,
        duration: 5000,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to clock out", variant: "destructive" });
    }
  };

  const pauseWork = async () => {
    if (!user || !currentEntry || !pauseReason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a reason for pausing", variant: "destructive" });
      return;
    }

    try {
      await timesheetMutation.pause.mutateAsync({ reason: pauseReason.trim() });
      toast({ title: "Work Paused", description: "Timer has been paused" });
      setShowPauseDialog(false);
      setPauseReason("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to pause", variant: "destructive" });
    }
  };

  const resumeWork = async () => {
    if (!user || !currentEntry || !currentEntry.pause_start) return;

    try {
      await timesheetMutation.resume.mutateAsync();
      toast({ title: "Work Resumed", description: "Timer has been resumed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to resume", variant: "destructive" });
    }
  };

  if (userLoading || activeLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="h-10 w-48 bg-gray-200 animate-pulse rounded" />
          <Card>
            <CardHeader><div className="h-6 w-32 bg-gray-200 animate-pulse rounded" /></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><div className="h-4 w-24 bg-gray-200 animate-pulse rounded" /><div className="h-10 w-full bg-gray-200 animate-pulse rounded" /></div>
              <div className="h-12 w-full bg-gray-200 animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Time Clock</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Clock In/Out Card — premium design */}
          <Card className="flex flex-col h-[460px]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-5 w-5 text-blue-600" />
                {currentEntry ? "Active Session" : "Clock In"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              {currentEntry ? (
                <>
                  {/* Status Card */}
                  <div className={`rounded-xl border px-4 py-3 space-y-2 ${
                    currentEntry.status === 'paused'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${currentEntry.status === 'paused' ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {currentEntry.status === 'paused' ? 'Session Paused' : 'Currently Clocked In'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                      <FolderKanban className="h-4 w-4 flex-shrink-0" />
                      {currentEntry.project_name || 'Project'}
                    </div>
                    <p className="font-bold text-gray-900 text-base leading-snug">
                      {currentEntry.issue ? `#${currentEntry.issue.id} – ${currentEntry.issue.title}` : 'No issue selected'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      Started: {currentEntry.clock_in ? format(new Date(currentEntry.clock_in), 'd MMM yyyy, h:mm aa') : 'Unknown'}
                    </div>
                    {(currentEntry.location_address || (currentEntry.latitude && currentEntry.longitude)) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                        {currentEntry.location_address || `${currentEntry.latitude?.toFixed(4)}, ${currentEntry.longitude?.toFixed(4)}`}
                      </div>
                    )}
                    {currentEntry.status === 'paused' && currentEntry.pause_reason && (
                      <p className="text-xs text-amber-600 font-medium">Pause reason: {currentEntry.pause_reason}</p>
                    )}
                  </div>

                  {/* Live Elapsed Timer */}
                  <div className="text-center py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Elapsed Duration</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-5xl font-black text-gray-900 tabular-nums">{formatElapsed(elapsedSeconds).h}h</span>
                      <span className="text-4xl font-black text-gray-400">:</span>
                      <span className="text-5xl font-black text-gray-900 tabular-nums">{formatElapsed(elapsedSeconds).m}m</span>
                      <span className="text-4xl font-black text-gray-400">:</span>
                      <span className="text-5xl font-black text-gray-900 tabular-nums">{formatElapsed(elapsedSeconds).s}s</span>
                    </div>
                    {Number(currentEntry.paused_duration) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Accumulated pauses: {Math.round(Number(currentEntry.paused_duration) * 60)}m
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-auto">
                    {currentEntry.status === 'paused' ? (
                      <Button onClick={resumeWork} disabled={loading} className="flex-1 h-12 text-sm font-semibold rounded-full" size="lg">
                        <Play className="mr-2 h-4 w-4" />
                        Resume Session
                      </Button>
                    ) : (
                      <Button onClick={() => { setShowPauseDialog(true); setPauseReason(""); }} disabled={loading} variant="outline" className="flex-1 h-12 text-sm font-semibold border-gray-300 rounded-full" size="lg">
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Session
                      </Button>
                    )}
                    <Button onClick={() => setShowClockOutDialog(true)} disabled={loading} className="flex-1 h-12 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-full" size="lg">
                      <Square className="mr-2 h-4 w-4" />
                      Clock Out
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block text-sm font-medium">
                        Select Project <span className="text-red-500">*</span>
                      </Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background focus:ring-1 focus:ring-blue-500 outline-none"
                        value={selectedProjectId}
                        onChange={(e) => {
                          const projId = e.target.value;
                          setSelectedProjectId(projId);
                          setSelectedIssueId(""); // Reset issue selection

                          const selectedProj = projectsData.find((p: any) => String(p.id) === projId);
                          if (selectedProj) {
                            setProjectName(selectedProj.name);
                          } else {
                            setProjectName("");
                          }
                        }}
                      >
                        <option value="all">Select a project...</option>
                        {projectsData.map((project: any) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm font-medium">
                        Select Issue <span className="text-red-500">*</span>
                      </Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background focus:ring-1 focus:ring-blue-500 outline-none"
                        value={selectedIssueId}
                        onChange={(e) => {
                          const issueId = e.target.value;
                          setSelectedIssueId(issueId);

                          const selectedIssue = activeIssues.find((i: any) => String(i.id) === issueId);
                          if (selectedIssue?.project_name) {
                            setProjectName(selectedIssue.project_name);
                            const proj = projectsData.find((p: any) => p.name === selectedIssue.project_name);
                            if (proj) setSelectedProjectId(String(proj.id));
                          }
                        }}
                      >
                        <option value="">Select an issue...</option>
                        {activeIssues
                          .filter((issue: any) => selectedProjectId === 'all' || issue.project_name === projectName)
                          .map((issue: any) => (
                            <option key={issue.id} value={issue.id}>
                              #{issue.id} - {issue.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Notes (Optional)
                    </label>
                    <Input
                      placeholder="Add notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <Button onClick={clockIn} disabled={loading} className="w-full" size="lg">
                    <Play className="mr-2 h-5 w-5" />
                    Clock In
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Time Entries */}
          <Card className="flex flex-col h-[460px]">
            <CardHeader className="pb-2">
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              {timeEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No time entries yet
                </p>
              ) : (
                <div className="space-y-3">
                  {timeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${entry.status === "clocked_in"
                              ? "bg-green-500"
                              : entry.status === "paused"
                                ? "bg-amber-500"
                                : "bg-gray-400"
                              }`}
                          />
                          <h3 className="font-semibold text-gray-900">
                            {entry.issue ? `#${entry.issue.id} - ${entry.issue.title}` : "No issue"}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mt-0.5 ml-4">
                          <FolderKanban className="h-3 w-3" />
                          <span>{entry.project_name || "No Project"}</span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-4">
                          {format(new Date(entry.clock_in), "PPp")}
                          {entry.clock_out &&
                            ` - ${format(new Date(entry.clock_out), "PPp")}`}
                        </p>
                        {Number(entry.paused_duration) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Paused: {formatHours(Number(entry.paused_duration))}
                          </p>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Notes: {entry.notes}
                          </p>
                        )}
                        {entry.status === "paused" && entry.pause_reason && (
                          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                            Pause Reason: {entry.pause_reason}
                          </p>
                        )}
                        {entry.latitude != null && entry.longitude != null && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            📍 {Number(entry.latitude).toFixed(4)}, {Number(entry.longitude).toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {entry.total_hours ? (
                          <p className="text-lg font-semibold">
                            {formatHours(entry.total_hours)}
                          </p>
                        ) : (
                          <p className={`text-sm ${entry.status === "paused"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-600 dark:text-green-400"
                            }`}>
                            {entry.status === "paused" ? "Paused" : "In Progress"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div> {/* End grid */}

        {/* Dashboard Chart / Numbers */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              Projects & Issues Tracker
            </CardTitle>
            <div className="flex gap-1 items-center bg-gray-50 p-1 rounded-full border border-gray-200 flex-shrink-0">
              <button
                onClick={() => setChartView('Month')}
                className={`whitespace-nowrap flex-shrink-0 px-5 py-1.5 text-sm font-semibold rounded-full transition-all ${chartView === 'Month' ? 'bg-[#00104A] text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Month
              </button>
              <button
                onClick={() => setChartView('Year')}
                className={`whitespace-nowrap flex-shrink-0 px-5 py-1.5 text-sm font-semibold rounded-full transition-all ${chartView === 'Year' ? 'bg-[#00104A] text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Year
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-gray-500 text-sm mb-8 ml-2 font-medium">
              From {chartData[0]?.name} to {chartData[chartData.length - 1]?.name}
            </div>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 13 }}
                    dy={16}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 13 }}
                    dx={-16}
                    tickCount={5}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line
                    type="linear"
                    dataKey="Projects"
                    name="Projects"
                    stroke="#1E3A8A"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#1E3A8A', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="linear"
                    dataKey="Issues"
                    name="Issues"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pause Reason Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Work</DialogTitle>
            <DialogDescription>
              Please provide a reason for pausing your work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pauseReason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="pauseReason"
                placeholder="Enter reason for pausing (e.g., Meeting, Break, etc.)"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={pauseWork}
              disabled={loading || !pauseReason.trim()}
            >
              Pause Work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clock Out Comment Dialog */}
      <Dialog open={showClockOutDialog} onOpenChange={(open) => {
        if (!open) {
          setShowClockOutDialog(false);
          setClockOutComment("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clock Out</DialogTitle>
            <DialogDescription>
              Please provide a summary of the work completed or any notes before clocking out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentEntry?.issue && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Working on:</h3>
                <p className="text-sm">
                  <strong>#{currentEntry.issue.id}</strong> - {currentEntry.issue.title}
                </p>
                {currentEntry.project_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Project: {currentEntry.project_name}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="clockOutComment">
                Work Summary / Bloggers <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="clockOutComment"
                placeholder="Describe what you worked on, completed, bloggers summary, or any notes..."
                value={clockOutComment}
                onChange={(e) => setClockOutComment(e.target.value)}
                rows={5}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                {currentEntry?.issue
                  ? "This comment will be added to the issue and helps track your progress."
                  : "This summary will be saved with your time entry."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => performClockOut(clockOutComment)}
              disabled={loading || !clockOutComment.trim()}
              variant="destructive"
            >
              Clock Out & Save Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeClock;

