import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, Play, Square, Pause, FolderKanban, TrendingUp, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeClockSkeleton } from "@/components/PageSkeletons";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIssues } from "@/hooks/useIssues";
import { useProjects } from "@/hooks/useProjects";
import { useActiveTimesheet, useTimesheetEntries, useTimesheetMutation } from "@/hooks/useTimesheets";
import { useFjtBoardData } from "@/sdk/features/fjt-board/hooks";
import { formatHours } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface Issue {
  id: number;
  title: string;
  project_name?: string;
  status: string;
}

interface ProjectOption {
  id: string;
  key: string;
  name: string;
}

interface TopicOption {
  id: number | string;
  key: string;
  title: string;
  type: 'story' | 'task' | 'bug';
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);
  const [clockOutComment, setClockOutComment] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: fjtBoardData, isLoading: fjtLoading } = useFjtBoardData();
  const { data: issuesData = [], isLoading: issuesLoading } = useIssues();
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects();
  const { data: currentEntry, isLoading: activeLoading } = useActiveTimesheet();
  const { data: timeEntries = [], isLoading: entriesLoading, refetch: refetchEntries } = useTimesheetEntries({ limit: 200, user_id: user?.id });
  const timesheetMutation = useTimesheetMutation();

  const [chartView, setChartView] = useState<'Month' | 'Year'>('Month');

  // Dynamic Projects created in Task Board
  const projectsList = useMemo<ProjectOption[]>(() => {
    const fjtProjects = fjtBoardData?.projects || [];
    if (fjtProjects.length > 0) {
      return fjtProjects.map((p: any) => ({
        id: p.id,
        key: p.key,
        name: p.name,
      }));
    }
    if (fjtBoardData?.project?.key) {
      return [
        {
          id: fjtBoardData.currentProjectId || 'default-project',
          key: fjtBoardData.project.key,
          name: fjtBoardData.project.name || 'Standard Agile Project Workspace',
        },
      ];
    }
    return [];
  }, [fjtBoardData]);

  // Dynamic Stories, Tasks, and Bugs for the selected project (only To Do & In Progress)
  const availableTopics = useMemo<TopicOption[]>(() => {
    if (!selectedProjectId) return [];

    const fjtIssues = fjtBoardData?.issues || [];
    const selectedProject = projectsList.find((p) => p.id === selectedProjectId);

    return fjtIssues
      .filter((i: any) => {
        const isTopicType = i.type === 'story' || i.type === 'task' || i.type === 'bug';
        if (!isTopicType) return false;

        const statusLower = String(i.status || '').toLowerCase();
        const isActionable = statusLower === 'to_do' || statusLower === 'in_progress' || (statusLower !== 'done' && statusLower !== 'completed' && statusLower !== 'closed');
        if (!isActionable) return false;

        if (selectedProject) {
          if (i.projectId && (i.projectId === selectedProject.id || i.projectId === selectedProjectId)) {
            return true;
          }
          if (i.projectKey && selectedProject.key && i.projectKey.toUpperCase() === selectedProject.key.toUpperCase()) {
            return true;
          }
          if (i.projectName && selectedProject.name && i.projectName.toLowerCase() === selectedProject.name.toLowerCase()) {
            return true;
          }
          if (i.key && selectedProject.key && i.key.toUpperCase().startsWith(`${selectedProject.key.toUpperCase()}-`)) {
            return true;
          }
        }

        if (projectsList.length === 1) {
          return true;
        }

        return false;
      })
      .map((i: any, index: number) => ({
        id: i.numericId || i.id || (index + 1),
        key: i.key,
        title: i.summary || i.title || '',
        type: i.type as 'story' | 'task' | 'bug',
        status: i.status || 'to_do',
      }));
  }, [selectedProjectId, fjtBoardData, projectsList]);

  // Auto-refresh entries when timesheetClockOut event occurs
  useEffect(() => {
    const handleRefresh = () => {
      refetchEntries();
    };
    window.addEventListener('timesheetClockOut', handleRefresh);
    return () => window.removeEventListener('timesheetClockOut', handleRefresh);
  }, [refetchEntries]);

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
          Stories: 0,
          TasksAndBugs: 0
        });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        data.push({
          name: format(d, 'MMM yyyy'),
          dateStr: format(d, 'yyyy-MM'),
          Stories: 0,
          TasksAndBugs: 0
        });
      }
    }

    const getStr = (dateVal: string) => dateVal ? dateVal.substring(0, chartView === 'Month' ? 10 : 7) : '';

    // Collect all real clock-in entries including active session
    const allEntries = [...(timeEntries || [])];
    if (currentEntry && !allEntries.some(e => e.id === currentEntry.id)) {
      allEntries.push(currentEntry);
    }

    allEntries.forEach((entry: any) => {
      const eDate = entry.clock_in || entry.created_at;
      if (eDate) {
        const pt = data.find(x => x.dateStr === getStr(eDate));
        if (pt) {
          const notesText = (entry.notes || '').toLowerCase();
          const issueTitle = (entry.issue?.title || '').toLowerCase();
          const issueType = (entry.issue?.type || '').toLowerCase();

          if (
            notesText.includes('[story]') ||
            notesText.startsWith('story:') ||
            issueType === 'story' ||
            issueTitle.includes('[story]')
          ) {
            pt.Stories += 1;
          } else {
            pt.TasksAndBugs += 1;
          }
        }
      }
    });

    return data;
  }, [timeEntries, currentEntry, chartView]);

  const loading = userLoading || issuesLoading || projectsLoading || activeLoading || entriesLoading || timesheetMutation.clockIn.isPending || timesheetMutation.clockOut.isPending || timesheetMutation.pause.isPending || timesheetMutation.resume.isPending;

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
    if (!selectedProjectId) {
      toast({ title: "Project Required", description: "Please select a project first.", variant: "destructive" });
      return;
    }
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && !selectedTopicId) {
      toast({ title: "Story / Task / Bug Required", description: "Please select a story, task, or bug.", variant: "destructive" });
      return;
    }

    const selectedProject = projectsList.find(p => p.id === selectedProjectId);
    const selectedTopic = availableTopics.find(t => String(t.id) === String(selectedTopicId));

    try {
      toast({ title: "Getting location...", description: "Please wait while we get your accurate location." });
      const location = await getUserLocation();
      let locationAddress = null;
      if (location) {
        locationAddress = await getAddressFromCoordinates(location.latitude, location.longitude);
      }

      const projectTitle = selectedProject ? `${selectedProject.name} (${selectedProject.key})` : "Project";
      const typeLabel = selectedTopic?.type ? (selectedTopic.type.charAt(0).toUpperCase() + selectedTopic.type.slice(1)) : 'Topic';
      const topicTitle = selectedTopic
        ? `[${typeLabel}] ${selectedTopic.key}: ${selectedTopic.title}`
        : (notes.trim() || null);

      await timesheetMutation.clockIn.mutateAsync({
        issue_id: null,
        project_name: projectTitle,
        notes: topicTitle,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        location_address: locationAddress || null,
      });

      setSelectedProjectId("");
      setSelectedTopicId("");
      setNotes("");

      await refetchEntries();

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

      toast({
        title: "Clocked In Successfully",
        description: `Time tracking started on ${selectedTopic?.key || selectedProject?.name || 'Project'}!${locationMsg}`
      });
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

      await refetchEntries();

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

  // Helper to format issue display with Project heading and Story/Task/Bug subheading
  const getEntryDisplay = (entry: TimeEntry | null | any) => {
    if (!entry) return { projectTitle: "Project", topicTitle: "Story / Task / Bug" };

    let projectTitle = (entry.project_name || "").trim();
    let topicTitle = (entry.notes || (entry.issue ? (entry.issue.title || `Issue #${entry.issue.id}`) : "")).trim();

    // 1. Check if projectTitle has combined "[Project] - [Story/Task/Bug] ..."
    if (projectTitle.includes(" - [Story") || projectTitle.includes(" - [Task") || projectTitle.includes(" - [Bug") || projectTitle.includes(" - Story") || projectTitle.includes(" - Task") || projectTitle.includes(" - Bug")) {
      const splitIdx = projectTitle.search(/\s*-\s*\[?(?:Story|Task|Bug)\]?/i);
      if (splitIdx !== -1) {
        const pPart = projectTitle.substring(0, splitIdx).trim();
        const tPart = projectTitle.substring(splitIdx).replace(/^\s*-\s*/, '').trim();
        projectTitle = pPart;
        if (!topicTitle || topicTitle === 'Active Session' || topicTitle === 'General Work' || topicTitle === 'Time Tracking Session') {
          topicTitle = tPart;
        }
      }
    }

    // 2. Check if topicTitle has combined "[Project] - [Story/Task/Bug] ..."
    if (topicTitle.includes(" - [Story") || topicTitle.includes(" - [Task") || topicTitle.includes(" - [Bug") || topicTitle.includes(" - Story") || topicTitle.includes(" - Task") || topicTitle.includes(" - Bug")) {
      const splitIdx = topicTitle.search(/\s*-\s*\[?(?:Story|Task|Bug)\]?/i);
      if (splitIdx !== -1) {
        const pPart = topicTitle.substring(0, splitIdx).trim();
        const tPart = topicTitle.substring(splitIdx).replace(/^\s*-\s*/, '').trim();
        if (!projectTitle || projectTitle === 'General' || projectTitle === 'Project' || projectTitle === 'Project Workspace') {
          projectTitle = pPart;
        }
        topicTitle = tPart;
      }
    }

    // 3. If topicTitle starts with projectTitle e.g. "Let Agent Deal (LAD) - [Task]..."
    if (topicTitle && projectTitle && topicTitle.toLowerCase().startsWith(projectTitle.toLowerCase())) {
      const stripped = topicTitle.substring(projectTitle.length).replace(/^[\s\-–:]+/, '').trim();
      if (stripped) {
        topicTitle = stripped;
      }
    }

    if (!projectTitle) {
      projectTitle = "Project";
    }

    if (!topicTitle || topicTitle === 'Active Session' || topicTitle === 'General Work' || topicTitle === 'Time Tracking Session') {
      topicTitle = entry.notes || (entry.issue ? (entry.issue.title || `Issue #${entry.issue.id}`) : "-");
    }

    if (!topicTitle) {
      topicTitle = "-";
    }

    return { projectTitle, topicTitle };
  };

  if (userLoading || activeLoading) {
    return <TimeClockSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Time Clock</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Clock In/Out Card */}
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

                    {/* Heading: Project in Black */}
                    <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                      <FolderKanban className="h-4 w-4 text-gray-800 flex-shrink-0" />
                      <span className="truncate">{getEntryDisplay(currentEntry).projectTitle}</span>
                    </div>

                    {/* Subheading: Story / Task / Bug in Blue */}
                    <p className="font-semibold text-blue-600 text-sm leading-snug">
                      {getEntryDisplay(currentEntry).topicTitle}
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
                    {/* Field 1: Project Selection */}
                    <div>
                      <Label className="mb-2 block text-sm font-medium">
                        Select Project <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={selectedProjectId}
                        onValueChange={(val) => {
                          setSelectedProjectId(val);
                          setSelectedTopicId(""); // Reset topic selection
                        }}
                      >
                        <SelectTrigger className="w-full text-sm font-medium border-gray-300 focus:border-[#0B1957] focus:ring-[#0B1957]/20 bg-white">
                          <SelectValue placeholder={projectsList.length === 0 ? "No projects created yet in Task Board" : "Select a project..."} />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-60">
                          {projectsList.length === 0 ? (
                            <div className="py-3 px-4 text-xs text-gray-500 text-center">
                              No projects created yet in Task Board
                            </div>
                          ) : (
                            projectsList.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} ({project.key})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Field 2: Select Story / Task / Bug */}
                    <div>
                      <Label className="mb-2 block text-sm font-medium">
                        Select Story / Task / Bug {user?.role === 'admin' ? <span className="text-xs text-muted-foreground font-normal">(Optional)</span> : <span className="text-red-500">*</span>}
                      </Label>
                      <Select
                        disabled={!selectedProjectId || availableTopics.length === 0}
                        value={selectedTopicId}
                        onValueChange={(val) => setSelectedTopicId(val)}
                      >
                        <SelectTrigger className="w-full text-sm font-medium border-gray-300 focus:border-[#0B1957] focus:ring-[#0B1957]/20 bg-white disabled:opacity-50 disabled:bg-gray-50">
                          <SelectValue
                            placeholder={
                              !selectedProjectId
                                ? "Select a project first..."
                                : availableTopics.length === 0
                                ? "No To Do or In Progress topics in this project"
                                : "Select a story, task, or bug..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-60">
                          {availableTopics.length === 0 ? (
                            <div className="py-3 px-4 text-xs text-gray-500 text-center">
                              No To Do or In Progress topics in this project
                            </div>
                          ) : (
                            availableTopics.map((item) => {
                              const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                              return (
                                <SelectItem key={item.id} value={String(item.id)}>
                                  [{typeLabel}] {item.key}: {item.title}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
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
                  <Button onClick={clockIn} disabled={loading} className="w-full bg-[#0B1957] hover:bg-[#081342] text-white" size="lg">
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
                  {timeEntries.slice(0, 15).map((entry) => {
                    const { projectTitle, topicTitle } = getEntryDisplay(entry);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          {/* Heading: Project in Black */}
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.status === "clocked_in"
                                ? "bg-green-500"
                                : entry.status === "paused"
                                  ? "bg-amber-500"
                                  : "bg-gray-400"
                                }`}
                            />
                            <h3 className="font-semibold text-gray-900 text-sm truncate">
                              {projectTitle}
                            </h3>
                          </div>

                          {/* Subheading: Story / Task / Bug in Blue */}
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mt-0.5 ml-4 truncate">
                            <FolderKanban className="h-3 w-3 flex-shrink-0 text-blue-600" />
                            <span className="truncate">{topicTitle}</span>
                          </div>

                          <p className="text-xs text-muted-foreground ml-4 mt-0.5">
                            {format(new Date(entry.clock_in), "PPp")}
                            {entry.clock_out &&
                              ` - ${format(new Date(entry.clock_out), "PPp")}`}
                          </p>
                          {Number(entry.paused_duration) > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                              Paused: {formatHours(Number(entry.paused_duration))}
                            </p>
                          )}
                          {entry.status === "paused" && entry.pause_reason && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 ml-4">
                              Pause Reason: {entry.pause_reason}
                            </p>
                          )}
                          {entry.latitude != null && entry.longitude != null && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 ml-4">
                              📍 {Number(entry.latitude).toFixed(4)}, {Number(entry.longitude).toFixed(4)}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          {entry.total_hours ? (
                            <p className="text-base font-bold text-gray-900">
                              {formatHours(entry.total_hours)}
                            </p>
                          ) : (
                            <p className={`text-xs font-semibold ${entry.status === "paused"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-green-600 dark:text-green-400"
                              }`}>
                              {entry.status === "paused" ? "Paused" : "In Progress"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
              Stories & Tasks/Bugs Tracker
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
                    dataKey="Stories"
                    name="Stories"
                    stroke="#0B1957"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#0B1957', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="linear"
                    dataKey="TasksAndBugs"
                    name="Tasks & Bugs"
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
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-lg rounded-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-left text-lg font-bold">Pause Work</DialogTitle>
            <DialogDescription className="text-left text-sm text-gray-500">
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
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-2xl rounded-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-left text-lg font-bold">Clock Out</DialogTitle>
            <DialogDescription className="text-left text-sm text-gray-500">
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

