import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, Play, Square, Pause, FolderKanban } from "lucide-react";

interface Issue {
  id: number;
  title: string;
  project_name?: string;
  status: string;
  estimated_hours?: number;
}

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  total_hours: number | null;
  status: string; // 'clocked_in' | 'paused' | 'clocked_out'
  issue: Issue | null;
  project_name: string | null;
  pause_start: string | null;
  paused_duration: number | null; // Total paused time in hours
  pause_reason: string | null; // Reason for pausing
  latitude: number | null; // Location latitude
  longitude: number | null; // Location longitude
  location_timestamp: string | null; // When location was captured
  location_address: string | null; // Human-readable address
}

const TimeClock = () => {
  const [user, setUser] = useState<any>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);
  const [clockOutComment, setClockOutComment] = useState("");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      try {
        setInitializing(true);
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('auth_token');

        if (!userData.id || !token) {
          // Redirect to auth if not logged in
          window.location.href = '/auth';
          return;
        }

        setUser(userData);
        const currentUser = await api.auth.getMe() as any;
        const adminStatus = currentUser?.user?.role === 'admin';
        setIsAdmin(adminStatus);
        await Promise.all([
          loadIssues(),
          loadProjects(),
          loadCurrentEntry(),
          loadTimeEntries()
        ]);
      } catch (error: any) {
        console.error('Error initializing user:', error);
        // If auth fails, redirect to login
        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
          window.location.href = '/auth';
          return;
        }
      } finally {
        setInitializing(false);
      }
    };
    initUser();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.projects.getAll() as any;
      const allProjects = response?.projects || response || [];
      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
      setProjects([]);
    }
  };

  const loadIssues = async () => {
    try {
      const response = await api.issues.getAll() as any;
      const allIssues = response?.issues || response || [];

      // Filter open and in-progress issues
      const activeIssues = allIssues.filter((issue: any) =>
        issue.status === 'open' || issue.status === 'in_progress'
      );

      // Transform to match Issue interface
      const transformedIssues = activeIssues.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        project_name: issue.project_name,
        status: issue.status,
        estimated_hours: issue.estimated_hours,
      }));

      setIssues(transformedIssues);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading issues:", error);
      }
      setIssues([]);
    }
  };

  const loadCurrentEntry = async () => {
    try {
      const response = await api.timesheets.getCurrent() as any;
      const entry = response?.entry;

      if (entry) {
        // Transform API response to TimeEntry format
        setCurrentEntry({
          id: entry.id,
          clock_in: entry.clock_in,
          clock_out: entry.clock_out,
          notes: entry.notes,
          total_hours: entry.total_hours,
          status: entry.status,
          issue: entry.issue,
          project_name: entry.project_name,
          pause_start: entry.pause_start,
          paused_duration: entry.paused_duration,
          pause_reason: entry.pause_reason,
          latitude: entry.latitude,
          longitude: entry.longitude,
          location_timestamp: entry.location_timestamp,
          location_address: entry.location_address,
        });
      } else {
        setCurrentEntry(null);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading current entry:", error);
      }
      setCurrentEntry(null);
    }
  };

  const loadTimeEntries = async () => {
    try {
      const response = await api.timesheets.getEntries({ limit: 10 }) as any;
      const entries = response?.entries || [];

      // Transform API response to TimeEntry format
      const transformedEntries = entries.map((entry: any) => ({
        id: entry.id,
        clock_in: entry.clock_in,
        clock_out: entry.clock_out,
        notes: entry.notes,
        total_hours: entry.total_hours,
        status: entry.status,
        issue: entry.issue,
        project_name: entry.project_name,
        pause_start: entry.pause_start,
        paused_duration: entry.paused_duration,
        pause_reason: entry.pause_reason,
        latitude: entry.latitude,
        longitude: entry.longitude,
        location_timestamp: entry.location_timestamp,
        location_address: entry.location_address,
      }));

      setTimeEntries(transformedEntries);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading time entries:", error);
      }
      setTimeEntries([]);
    }
  };

  const getUserLocation = (): Promise<{ latitude: number, longitude: number, accuracy?: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser");
        toast({
          title: "Location Unavailable",
          description: "Your browser doesn't support geolocation.",
          variant: "destructive",
        });
        resolve(null);
        return;
      }

      // Request high accuracy location with proper settings
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy, // Accuracy in meters
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

          toast({
            title: "Location Error",
            description: errorMessage,
          });

          resolve(null); // Don't block clock in if location fails
        },
        {
          enableHighAccuracy: true,  // Use GPS for better accuracy
          timeout: 10000,             // Wait up to 10 seconds for accurate position
          maximumAge: 0               // Don't use cached position, always get fresh location
        }
      );
    });
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TechieMaya-Timesheet-App'
          }
        }
      );

      if (!response.ok) {
        console.warn("Failed to fetch address");
        return null;
      }

      const data = await response.json();

      // Build a readable address from the response
      const address = data.address;
      const parts = [];

      if (address.road) parts.push(address.road);
      if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
      if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);

      return parts.length > 0 ? parts.join(", ") : data.display_name;
    } catch (error) {
      console.warn("Error fetching address:", error);
      return null;
    }
  };

  const clockIn = async () => {
    if (!user) return;

    if (!selectedIssueId) {
      toast({
        title: "Issue Required",
        description: "Please select an issue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Show location fetching message
      toast({
        title: "Getting location...",
        description: "Please wait while we get your accurate location.",
      });

      // Get user location
      const location = await getUserLocation();

      // Get address from coordinates (if location available)
      let locationAddress = null;
      if (location) {
        locationAddress = await getAddressFromCoordinates(location.latitude, location.longitude);
      }

      const issueIdNum = selectedIssueId ? parseInt(selectedIssueId, 10) : null;
      if (!issueIdNum || isNaN(issueIdNum)) {
        throw new Error('Invalid issue selected');
      }

      const response = await api.timesheets.clockIn({
        issue_id: issueIdNum,
        project_name: projectName || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        location_address: locationAddress || null,
      }) as any;

      const entry = response?.entry;

      // Transform API response to TimeEntry format
      setCurrentEntry({
        id: entry.id,
        clock_in: entry.clock_in,
        clock_out: entry.clock_out,
        notes: notes || null,
        total_hours: entry.total_hours,
        status: entry.status,
        issue: entry.issue,
        project_name: entry.project_name,
        pause_start: entry.pause_start,
        paused_duration: entry.paused_duration,
        pause_reason: entry.pause_reason,
        latitude: entry.latitude,
        longitude: entry.longitude,
        location_timestamp: entry.location_timestamp,
        location_address: entry.location_address,
      });
      setSelectedIssueId("");
      setProjectName("");
      setNotes("");

      // Build location message with accuracy info
      let locationMsg = "";
      if (locationAddress) {
        locationMsg = ` Location: ${locationAddress}`;
        if (location?.accuracy) {
          const accuracyText = location.accuracy < 50 ? "High accuracy" :
            location.accuracy < 100 ? "Good accuracy" : "Approximate";
          locationMsg += ` (${accuracyText}: ±${Math.round(location.accuracy)}m)`;
        }
      } else if (location) {
        locationMsg = ` Location captured`;
        if (location.accuracy) {
          locationMsg += ` (±${Math.round(location.accuracy)}m accuracy)`;
        }
      }

      toast({
        title: "Clocked In Successfully",
        description: `Time tracking started!${locationMsg}`,
      });
      loadTimeEntries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clockOut = async () => {
    if (!user || !currentEntry) return;

    // Always show the comment dialog to get work summary/bloggers
    setShowClockOutDialog(true);
  };

  const performClockOut = async (comment?: string) => {
    if (!user || !currentEntry) return;

    setLoading(true);
    try {
      const response = await api.timesheets.clockOut({ comment: comment || undefined }) as any;
      const totalHours = response?.total_hours || 0;

      setCurrentEntry(null);
      setShowClockOutDialog(false);
      setClockOutComment("");

      // Dispatch custom event to notify timesheet page to refresh
      window.dispatchEvent(new CustomEvent('timesheetClockOut', {
        detail: { totalHours, timestamp: Date.now() }
      }));

      // Also set localStorage trigger for cross-tab communication
      localStorage.setItem('timesheetRefreshTrigger', Date.now().toString());

      toast({
        title: "Clocked Out Successfully",
        description: `${totalHours.toFixed(2)} hours saved to timesheet${comment ? ' with comment' : ''}. Timesheet will refresh automatically.`,
        duration: 5000,
      });

      loadTimeEntries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseClick = () => {
    setShowPauseDialog(true);
    setPauseReason("");
  };

  const pauseWork = async () => {
    if (!user || !currentEntry || !pauseReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for pausing",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.timesheets.pause({ reason: pauseReason.trim() }) as any;
      const entry = response?.entry;

      setCurrentEntry({
        ...currentEntry,
        pause_start: entry.pause_start,
        pause_reason: entry.pause_reason,
        status: entry.status,
      });

      toast({
        title: "Work Paused",
        description: "Timer has been paused",
      });
      setShowPauseDialog(false);
      setPauseReason("");
      loadTimeEntries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to pause",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resumeWork = async () => {
    if (!user || !currentEntry || !currentEntry.pause_start) return;

    setLoading(true);
    try {
      const response = await api.timesheets.resume() as any;
      const entry = response?.entry;

      setCurrentEntry({
        ...currentEntry,
        pause_start: entry.pause_start,
        pause_reason: entry.pause_reason,
        paused_duration: entry.paused_duration,
        status: entry.status,
      });

      toast({
        title: "Work Resumed",
        description: "Timer has been resumed",
      });
      loadTimeEntries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Time Clock</h1>
        </div>

        {/* Clock In/Out Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {currentEntry ? "Clock Out" : "Clock In"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentEntry ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${currentEntry.status === 'paused'
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}>
                  <p className="text-sm text-muted-foreground">
                    {currentEntry.status === 'paused' ? 'Work Paused' : 'Currently clocked in'}
                  </p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-blue-600" />
                    {currentEntry.project_name || "Project"}
                  </p>
                  <p className="text-base font-medium">
                    Issue: {currentEntry.issue ? `#${currentEntry.issue.id} - ${currentEntry.issue.title}` : "No issue selected"}
                  </p>
                  {currentEntry.issue?.estimated_hours !== undefined && (
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Estimate: {parseFloat(currentEntry.issue.estimated_hours as any).toFixed(2)} hours
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Started: {currentEntry.clock_in ? format(new Date(currentEntry.clock_in), "PPp") : "Unknown"}
                  </p>
                  {currentEntry.paused_duration && currentEntry.paused_duration > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Paused time: {currentEntry.paused_duration.toFixed(2)} hours
                    </p>
                  )}
                  {currentEntry.notes && (
                    <p className="text-sm mt-2">Notes: {currentEntry.notes}</p>
                  )}
                  {currentEntry.status === 'paused' && currentEntry.pause_reason && (
                    <p className="text-sm mt-2 text-amber-600 dark:text-amber-400 font-medium">
                      Pause Reason: {currentEntry.pause_reason}
                    </p>
                  )}
                  {(currentEntry.location_address || (currentEntry.latitude && currentEntry.longitude)) && (
                    <p className="text-sm mt-2 text-blue-600 dark:text-blue-400">
                      📍 {currentEntry.location_address || `${currentEntry.latitude?.toFixed(6)}, ${currentEntry.longitude?.toFixed(6)}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentEntry.status === 'paused' ? (
                    <Button onClick={resumeWork} disabled={loading} className="flex-1" size="lg" variant="default">
                      <Play className="mr-2 h-5 w-5" />
                      Resume
                    </Button>
                  ) : (
                    <Button onClick={handlePauseClick} disabled={loading} className="flex-1" size="lg" variant="outline">
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </Button>
                  )}
                  <Button onClick={clockOut} disabled={loading} className="flex-1" size="lg" variant="destructive">
                    <Square className="mr-2 h-5 w-5" />
                    Clock Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">
                      Select Project <span className="text-red-500">*</span>
                    </Label>
                    <select
                      className="w-full p-2 border rounded-md bg-background focus:ring-1 focus:ring-blue-500 outline-none"
                      value={selectedProjectId}
                      onChange={(e) => {
                        const projId = e.target.value;
                        setSelectedProjectId(projId);
                        setSelectedIssueId(""); // Reset issue selection

                        const selectedProj = projects.find(p => String(p.id) === projId);
                        if (selectedProj) {
                          setProjectName(selectedProj.name);
                        } else {
                          setProjectName("");
                        }
                      }}
                    >
                      <option value="all">Select a project...</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      Select Issue <span className="text-red-500">*</span>
                    </Label>
                    <select
                      className="w-full p-2 border rounded-md bg-background focus:ring-1 focus:ring-blue-500 outline-none"
                      value={selectedIssueId}
                      onChange={(e) => {
                        const issueId = e.target.value;
                        setSelectedIssueId(issueId);

                        const selectedIssue = issues.find(i => String(i.id) === issueId);
                        if (selectedIssue?.project_name) {
                          setProjectName(selectedIssue.project_name);
                          const proj = projects.find(p => p.name === selectedIssue.project_name);
                          if (proj) setSelectedProjectId(String(proj.id));
                        }
                      }}
                    >
                      <option value="">Select an issue...</option>
                      {issues
                        .filter(issue => selectedProjectId === 'all' || issue.project_name === projectName)
                        .map((issue) => (
                          <option key={issue.id} value={issue.id}>
                            #{issue.id} - {issue.title} {issue.estimated_hours ? `(${issue.estimated_hours}h)` : ''}
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
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
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
                        {entry.clock_in ? format(new Date(entry.clock_in), "PPp") : "Unknown"}
                        {entry.clock_out &&
                          ` - ${format(new Date(entry.clock_out), "PPp")}`}
                      </p>
                      {entry.paused_duration && entry.paused_duration > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Paused: {Number(entry.paused_duration).toFixed(2)}h
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
                          {entry.total_hours}h
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
              variant="outline"
              onClick={() => {
                setShowPauseDialog(false);
                setPauseReason("");
              }}
            >
              Cancel
            </Button>
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
              variant="outline"
              onClick={() => {
                setShowClockOutDialog(false);
                setClockOutComment("");
              }}
            >
              Cancel
            </Button>
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

