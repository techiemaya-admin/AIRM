import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIssueDetails, useIssueMutation } from "@/hooks/useIssues";
import { useLabels, useLabelMutation } from "@/hooks/useLabels";
import { useUsers } from "@/hooks/useUsers";
import { useProjects } from "@/hooks/useProjects";
import { api } from "@sdk/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, MessageSquare, Tag, User, X, Plus, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Issue {
  id: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_name: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  estimated_hours?: number;
}

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_email: string;
}

interface Activity {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  user_email: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Assignee {
  user_id: string;
  email: string;
}


export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // React Query Hooks
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: issue, isLoading: issueLoading, isError } = useIssueDetails(id);
  const { data: availableLabels = [], isLoading: labelsLoading } = useLabels();
  const labelMutation = useLabelMutation();
  const { data: availableUsersRaw = [], isLoading: usersLoading } = useUsers();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const issueMutation = useIssueMutation();

  const isAdmin = currentUser?.role === 'admin';
  const loading = userLoading || issueLoading || labelsLoading || usersLoading || projectsLoading;

  const availableUsers = useMemo(() => availableUsersRaw.map((u: any) => ({
    user_id: u.user_id || u.id,
    email: u.email
  })), [availableUsersRaw]);

  const comments = issue?.comments || [];
  const activities = issue?.activities || [];
  const issueLabels = issue?.labels || [];
  const assignees = issue?.assignees || [];

  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366f1");

  const [newComment, setNewComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [editEstimatedHours, setEditEstimatedHours] = useState<string>("0");
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);
  const [showLogTimeDialog, setShowLogTimeDialog] = useState(false);
  const [logDuration, setLogDuration] = useState("1");
  const [logComment, setLogComment] = useState("");
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editLogDuration, setEditLogDuration] = useState("0");
  const [editLogComment, setEditLogComment] = useState("");

  useEffect(() => {
    if (issue) {
      setEditTitle(issue.title || "");
      setEditDescription(issue.description || "");
      setEditProjectName(issue.project_name || "");
      setEditEstimatedHours(String(issue.estimated_hours || 0));
    }
  }, [issue]);

  useEffect(() => {
    if (!id || (isError && !issueLoading)) {
      navigate("/issues");
    }
  }, [id, isError, issueLoading, navigate]);

  const createCustomLabel = async () => {
    if (!newLabelName.trim()) {
      toast({
        title: "Error",
        description: "Label name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await labelMutation.create.mutateAsync({
        name: newLabelName,
        color: newLabelColor,
        description: ""
      });

      toast({
        title: "Success",
        description: `Label "${newLabelName}" created successfully`,
      });

      setNewLabelName("");
      setShowLabelDialog(false);

      // Auto-assign the new label to the current issue
      if (id) {
        // We'll need to invalidate labels query as well
        // queryClient.invalidateQueries({ queryKey: ['labels'] });
        await issueMutation.addLabel.mutateAsync({ id, labelId: newLabelName }); // Using name as ID for now or need the ID from response
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create label",
        variant: "destructive",
      });
    }
  };

  const updateIssueStatus = async (newStatus: 'open' | 'in_progress' | 'closed') => {
    if (!id) return;
    try {
      await issueMutation.update.mutateAsync({
        id,
        data: {
          status: newStatus,
          ...(newStatus === 'closed' ? { closed_at: new Date().toISOString() } : {})
        }
      });

      toast({
        title: "Success",
        description: `Issue status updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const saveIssue = async () => {
    if (!id) return;

    try {
      await issueMutation.update.mutateAsync({
        id,
        data: {
          title: editTitle,
          description: editDescription,
          project_name: editProjectName,
          estimated_hours: parseFloat(editEstimatedHours) || 0
        }
      });

      toast({
        title: "Success",
        description: "Issue updated successfully",
      });
      setIsEditing(false);
      setShowEstimateDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update issue",
        variant: "destructive",
      });
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      await issueMutation.addComment.mutateAsync({ id: id!, comment: newComment });

      toast({
        title: "Success",
        description: "Comment added successfully",
      });

      setNewComment("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const logManualTime = async () => {
    if (!id || parseFloat(logDuration) < 0) return;

    try {
      await issueMutation.logTime.mutateAsync({
        id,
        data: {
          duration: Math.round(parseFloat(logDuration)),
          comment: logComment
        }
      });

      toast({
        title: "Success",
        description: "Time logged successfully",
      });

      setShowLogTimeDialog(false);
      setLogDuration("1"); // Reset to default 1 hour
      setLogComment("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log time",
        variant: "destructive",
      });
    }
  };

  const updateTimeEntry = async () => {
    if (!id || !editingActivity) return;

    try {
      await issueMutation.updateActivity.mutateAsync({
        id,
        activityId: editingActivity.id,
        data: {
          duration: Math.round(parseFloat(editLogDuration)),
          comment: editLogComment
        }
      });

      toast({
        title: "Success",
        description: "Time entry updated successfully",
      });

      setEditingActivity(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    }
  };

  const addLabel = async (labelId: string) => {
    if (!id) return;

    try {
      await issueMutation.addLabel.mutateAsync({ id, labelId });

      toast({
        title: "Success",
        description: "Label added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add label",
        variant: "destructive",
      });
    }
  };

  const removeLabel = async (labelId: string) => {
    if (!id) return;

    try {
      await issueMutation.removeLabel.mutateAsync({ id, labelId });

      toast({
        title: "Success",
        description: "Label removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove label",
        variant: "destructive",
      });
    }
  };

  const assignUser = async (userId: string) => {
    if (!id) return;

    try {
      await issueMutation.assignUser.mutateAsync({ id, userId });

      toast({
        title: "Success",
        description: "Employee assigned successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign employee",
        variant: "destructive",
      });
    }
  };

  const assignMultipleUsers = async () => {
    if (!id || selectedUserIds.length === 0) return;

    try {
      await issueMutation.assignUsers.mutateAsync({ id, userIds: selectedUserIds });

      toast({
        title: "Success",
        description: `${selectedUserIds.length} employee(s) assigned successfully`,
      });

      setSelectedUserIds([]);
      setShowAssigneesDropdown(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign employees",
        variant: "destructive",
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const unassignUser = async (userId: string) => {
    if (!id) return;

    try {
      await issueMutation.unassignUser.mutateAsync({ id, userId });

      toast({
        title: "Success",
        description: "Employee unassigned successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unassign employee",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'closed':
        return <CheckCircle2 className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  if (loading || !issue) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-8 w-3/4" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-10 w-24 mt-6" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-10 w-full mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-20" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-14" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-4 text-[#24292f]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="h-9 px-3 text-sm font-semibold border-[#d0d7de] text-[#24292f] hover:bg-[#f6f8fa] shadow-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Issues
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issue Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {getStatusIcon(issue.status)}
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-2xl font-bold"
                      />
                    ) : (
                      <div>
                        <h1 className="text-2xl font-bold">{issue.title}</h1>
                        <p className="text-gray-500 mt-1">#{issue.id}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={6}
                      />
                    </div>
                    <div>
                      <Label>Project</Label>
                      <select
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select a project</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.name}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-500 font-medium mb-1.5 block">Estimated Hours</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={editEstimatedHours}
                        onChange={(e) => setEditEstimatedHours(e.target.value)}
                        className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-100 transition-all rounded-lg"
                        placeholder="e.g. 2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveIssue}>Save</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 whitespace-pre-wrap">{issue.description || "No description provided."}</p>
                    {isAdmin && (
                      <Button className="mt-4" variant="outline" onClick={() => setIsEditing(true)}>
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card id="comments-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-gray-300 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{comment.user_email}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}

                <div className="mt-4 space-y-2">
                  <Label>Add Comment</Label>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                  />
                  <Button onClick={addComment} disabled={!newComment.trim()}>
                    Comment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const isTimeEntry = activity.action === 'work_recorded' || activity.action === 'work_completed';
                    const details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;

                    return (
                      <div key={activity.id} className="flex gap-2 text-sm items-start border-b border-gray-100 pb-2">
                        <span className="text-gray-500 whitespace-nowrap">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                        <div className="flex-1">
                          <span className="font-semibold mr-1">{activity.user_email}</span>
                          <span className={`${isTimeEntry ? 'text-blue-600 font-medium' : ''}`}>
                            {activity.action === 'work_completed' || activity.action === 'work_recorded' ? 'logged time' : activity.action}
                          </span>
                          {activity.details && (
                            <div className="text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                              {isTimeEntry ? (
                                <span>
                                  <strong>{parseFloat(details?.duration || details?.hours_worked || 0).toFixed(2)}h</strong> - {details?.comment || details?.note || 'No comment'}
                                </span>
                              ) : (
                                <span>{typeof activity.details === 'string' ? activity.details : JSON.stringify(activity.details)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full"
                    variant={issue.status === 'open' ? 'default' : 'outline'}
                    onClick={() => updateIssueStatus('open')}
                  >
                    Open
                  </Button>
                  <Button
                    className="w-full"
                    variant={issue.status === 'in_progress' ? 'default' : 'outline'}
                    onClick={() => updateIssueStatus('in_progress')}
                  >
                    In Progress
                  </Button>
                  <Button
                    className="w-full"
                    variant={issue.status === 'closed' ? 'default' : 'outline'}
                    onClick={() => updateIssueStatus('closed')}
                  >
                    Closed
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Assignees */}
            <Card>
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 ${isAdmin ? 'cursor-pointer hover:text-blue-600' : ''}`}
                  onClick={() => isAdmin && setShowAssigneesDropdown(!showAssigneesDropdown)}
                >
                  <User className="h-4 w-4" />
                  Assignees
                  {isAdmin && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {showAssigneesDropdown ? '▼' : '▶'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignees.map((assignee) => (
                  <div key={assignee.user_id} className="flex items-center justify-between">
                    <span className="text-sm">{assignee.email}</span>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => unassignUser(assignee.user_id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {assignees.length === 0 && !showAssigneesDropdown && (
                  <p className="text-sm text-gray-500 text-center py-2">No assignees</p>
                )}
                {/* Show Add Assignees button only for admins - always show when dropdown is closed */}
                {isAdmin && !showAssigneesDropdown && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowAssigneesDropdown(true)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Add Assignees
                  </Button>
                )}
                {isAdmin && showAssigneesDropdown && (
                  <div className="border rounded p-3 space-y-2 max-h-60 overflow-y-auto">
                    {availableUsers
                      .filter(u => !assignees.some(a => a.user_id === u.user_id))
                      .map(user => (
                        <label
                          key={user.user_id}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.user_id)}
                            onChange={() => toggleUserSelection(user.user_id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{user.email}</span>
                        </label>
                      ))}
                    {availableUsers.filter(u => !assignees.some(a => a.user_id === u.user_id)).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">No available users to assign</p>
                    )}
                    {selectedUserIds.length > 0 && (
                      <div className="pt-2 border-t">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={assignMultipleUsers}
                        >
                          Assign {selectedUserIds.length} User{selectedUserIds.length > 1 ? 's' : ''}
                        </Button>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setShowAssigneesDropdown(false);
                          setSelectedUserIds([]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Labels */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Labels
                  </CardTitle>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowLabelDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {issueLabels.map((label) => (
                    <div
                      key={label.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      <span>{label.name}</span>
                      {isAdmin && (
                        <button onClick={() => removeLabel(label.id)}>
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {isAdmin && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addLabel(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="">Add label...</option>
                    {availableLabels
                      .filter(l => !issueLabels.some(il => il.id === l.id))
                      .map(label => (
                        <option key={label.id} value={label.id}>
                          {label.name}
                        </option>
                      ))}
                  </select>
                )}
              </CardContent>
            </Card>

            {/* Time Tracking Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Estimated</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">{parseFloat(issue.estimated_hours as any || 0).toFixed(2)}h</p>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowEstimateDialog(true)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Completed</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {activities
                        .filter(a => a.action === 'work_recorded' || a.action === 'work_completed')
                        .reduce((sum, a) => {
                          const details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
                          return sum + (parseFloat(details?.duration || details?.hours_worked || 0));
                        }, 0).toFixed(2)}h
                    </p>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span>Progress</span>
                    <span>
                      {Math.round((activities
                        .filter(a => a.action === 'work_recorded' || a.action === 'work_completed')
                        .reduce((sum, a) => {
                          const details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
                          return sum + (parseFloat(details?.duration || details?.hours_worked || 0));
                        }, 0) / (parseFloat(issue.estimated_hours as any || 0) || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (activities
                          .filter(a => a.action === 'work_recorded' || a.action === 'work_completed')
                          .reduce((sum, a) => {
                            const details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
                            return sum + (parseFloat(details?.duration || details?.hours_worked || 0));
                          }, 0) / (parseFloat(issue.estimated_hours as any || 0) || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Priority:</span>
                  <span className="capitalize">{issue.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Project:</span>
                  <span>{issue.project_name || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Estimate:</span>
                  <div className="flex items-center gap-1">
                    <span>{parseFloat(issue.estimated_hours as any || 0).toFixed(2)}h</span>
                    {isAdmin && (
                      <button onClick={() => setShowEstimateDialog(true)} className="text-blue-600 hover:text-blue-800">
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Created:</span>
                    <span>{new Date(issue.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Updated:</span>
                    <span>{new Date(issue.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Label Dialog */}
      <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Label</DialogTitle>
            <DialogDescription>
              Create a new label and pick a color for it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label-name">Label Name</Label>
              <Input
                id="label-name"
                placeholder="e.g. Frontend, Critical, UI/UX"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-color">Label Color</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="label-color"
                  type="color"
                  className="w-12 h-10 p-1 rounded cursor-pointer"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                />
                <Input
                  type="text"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                {['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b'].map(color => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: color, borderColor: newLabelColor === color ? 'black' : 'white' }}
                    onClick={() => setNewLabelColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLabelDialog(false)}>Cancel</Button>
            <Button onClick={createCustomLabel}>Create & Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estimate Dialog */}
      <Dialog open={showEstimateDialog} onOpenChange={setShowEstimateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Estimate</DialogTitle>
            <DialogDescription>
              Update the estimated hours for this task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="estimate-hours" className="text-gray-500 font-medium">Estimated Hours</Label>
              <Input
                id="estimate-hours"
                type="number"
                step="1"
                min="0"
                value={editEstimatedHours}
                onChange={(e) => setEditEstimatedHours(e.target.value)}
                className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-100 transition-all rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEstimateDialog(false)}>Cancel</Button>
            <Button onClick={saveIssue}>Update Estimate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Manual Time Dialog */}
      <Dialog open={showLogTimeDialog} onOpenChange={setShowLogTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Work Time</DialogTitle>
            <DialogDescription>
              Record manual work hours for this task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="log-duration" className="text-gray-500 font-medium">Duration (Hours)</Label>
              <Input
                id="log-duration"
                type="number"
                step="1"
                min="0"
                value={logDuration}
                onChange={(e) => setLogDuration(e.target.value)}
                className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-100 transition-all rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-comment">Work Description</Label>
              <Textarea
                id="log-comment"
                placeholder="What did you work on?"
                value={logComment}
                onChange={(e) => setLogComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogTimeDialog(false)}>Cancel</Button>
            <Button onClick={logManualTime}>Log Time</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Time Entry Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Record</DialogTitle>
            <DialogDescription>
              Adjust previously recorded work hours
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-log-duration" className="text-gray-500 font-medium">Duration (Hours)</Label>
              <Input
                id="edit-log-duration"
                type="number"
                step="1"
                min="0"
                value={editLogDuration}
                onChange={(e) => setEditLogDuration(e.target.value)}
                className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-100 transition-all rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-log-comment">Work Description</Label>
              <Textarea
                id="edit-log-comment"
                placeholder="What did you work on?"
                value={editLogComment}
                onChange={(e) => setEditLogComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingActivity(null)}>Cancel</Button>
            <Button onClick={updateTimeEntry}>Update Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
