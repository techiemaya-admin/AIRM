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
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, MessageSquare, Tag, User, X, Plus, Edit2, Github, ExternalLink, MoreHorizontal, Smile, Paperclip, Settings2, FolderKanban } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

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
        return <AlertCircle className="h-4 w-4 text-white" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-white" />;
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-white" />;
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
    <div className="min-h-screen bg-white text-[#24292f] font-sans">
      {/* Header - Fixed-like style */}
      <div className="border-b border-[#d0d7de] bg-[#f6f8fa] py-6 px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(-1)} 
                  className="h-8 px-3 text-xs font-semibold border-[#d0d7de] text-[#24292f] hover:bg-[#f6f8fa] shadow-sm bg-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Back to issues
                </Button>
                {issue.github_url && (
                  <a 
                    href={issue.github_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-[#0969da] hover:underline"
                  >
                    <Github className="h-3.5 w-3.5" />
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-semibold bg-[#2da44e] text-white border-[#1b1f2426] hover:bg-[#2c974b] shadow-sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Edit Issue
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-semibold bg-white border-[#d0d7de] hover:bg-[#f6f8fa] shadow-sm"
                    onClick={() => setShowLogTimeDialog(true)}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Log Time
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-3xl font-medium h-12 border-[#0969da] ring-1 ring-[#0969da]"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-3xl font-normal">
                    {issue.title} <span className="text-[#656d76]">#{issue.id}</span>
                  </h1>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-2 text-sm">
                <Badge 
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white font-semibold border-none ${
                    issue.status === 'open' ? 'bg-[#1a7f37]' : 
                    issue.status === 'in_progress' ? 'bg-[#9a6700]' : 
                    'bg-[#8250df]'
                  }`}
                >
                  {getStatusIcon(issue.status)}
                  <span className="capitalize">{issue.status.replace('_', ' ')}</span>
                </Badge>
                <div className="flex items-center gap-1 text-[#656d76]">
                  <span className="font-semibold text-[#24292f]">{issue.created_by || 'Unknown'}</span>
                  <span>opened this issue {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
                  <span>·</span>
                  <span>{comments.length} comments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Area - GitHub Timeline Style */}
          <div className="lg:col-span-3 space-y-8">
            {/* Initial Description Card */}
            <div className="relative pl-12 before:absolute before:left-[1.25rem] before:top-8 before:bottom-0 before:w-[2px] before:bg-[#d0d7de]">
              <div className="absolute left-0 top-0">
                <Avatar className="h-10 w-10 border border-[#d0d7de]">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                    {(issue.created_by || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="border border-[#d0d7de] rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#24292f]">{issue.created_by}</span>
                    <span className="text-sm text-[#656d76]">commented {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold text-[#656d76] uppercase tracking-wider bg-white">Author</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#656d76] hover:bg-[#d0d7de]/30">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 prose prose-sm max-w-none text-[#24292f]">
                  {isEditing ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="min-h-[200px] font-mono text-sm bg-[#f6f8fa] focus:bg-white"
                        placeholder="Leave a description"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button size="sm" className="bg-[#2da44e] hover:bg-[#2c974b] text-white border-none" onClick={saveIssue}>Update Issue</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{issue.description || <span className="italic text-[#656d76]">No description provided.</span>}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline Events (Activity) */}
            <div className="space-y-8 relative">
              {activities.map((activity, idx) => {
                const details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;
                const isTimeEntry = activity.action === 'work_recorded' || activity.action === 'work_completed';
                
                return (
                  <div key={activity.id} className="relative pl-12 flex items-center group">
                    {/* Timeline bar continues */}
                    <div className="absolute left-[1.25rem] -top-8 bottom-0 w-[2px] bg-[#d0d7de]"></div>
                    
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[#f6f8fa] border-2 border-[#d0d7de] z-10 flex items-center justify-center">
                      {isTimeEntry ? <Clock className="h-3 w-3 text-[#656d76]" /> : <Tag className="h-3 w-3 text-[#656d76]" />}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-[#656d76]">
                      <span className="font-semibold text-[#24292f]">{activity.user_email}</span>
                      <span>
                        {activity.action === 'status_changed' ? (
                          <>changed status from <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px]">{details?.old_status}</Badge> to <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px]">{details?.new_status}</Badge></>
                        ) : activity.action === 'commented' ? (
                          'added a comment'
                        ) : isTimeEntry ? (
                          <>logged <span className="font-bold text-[#0969da]">{parseFloat(details?.duration || 0).toFixed(2)}h</span> work</>
                        ) : (
                          activity.action.replace('_', ' ')
                        )}
                      </span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comments Section */}
            <div className="space-y-8">
              {comments.map((comment) => (
                <div key={comment.id} className="relative pl-12 before:absolute before:left-[1.25rem] before:-top-8 before:bottom-0 before:w-[2px] before:bg-[#d0d7de]">
                  <div className="absolute left-0 top-0">
                    <Avatar className="h-10 w-10 border border-[#d0d7de] bg-[#f6f8fa]">
                      <AvatarFallback className="text-xs text-[#656d76] uppercase">
                        {comment.user_email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="border border-[#d0d7de] rounded-lg overflow-hidden bg-white shadow-sm hover:border-[#afb8c1] transition-colors">
                    <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#24292f]">{comment.user_email}</span>
                        <span className="text-sm text-[#656d76]">commented {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#656d76] hover:bg-[#d0d7de]/30">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 text-[#24292f] text-sm leading-relaxed whitespace-pre-wrap">
                      {comment.comment}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* New Comment Box - GitHub Style */}
            <div className="relative pl-12 before:absolute before:left-[1.25rem] before:-top-8 before:top-8 before:w-[2px] before:bg-[#d0d7de]">
              <div className="absolute left-0 top-0">
                <Avatar className="h-10 w-10 border border-[#d0d7de] bg-[#f6f8fa]">
                  <AvatarFallback className="text-xs text-[#656d76] uppercase">
                    {(currentUser?.email || 'U').charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="border border-[#d0d7de] rounded-lg overflow-hidden bg-white shadow-sm focus-within:border-[#0969da] focus-within:ring-1 focus-within:ring-[#0969da]/30 transition-all">
                <div className="bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center">
                  <div className="px-4 py-2 border-b-2 border-[#fd8c73] bg-white text-sm font-medium">Write</div>
                  <div className="px-4 py-2 text-sm text-[#656d76] hover:text-[#24292f] cursor-not-allowed">Preview</div>
                  <div className="ml-auto flex items-center pr-2 gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#656d76]"><Smile className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Add emoji</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div className="p-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Leave a comment"
                    className="min-h-[120px] border-none focus:ring-0 bg-[#f6f8fa]/50 focus:bg-white transition-colors text-sm resize-y"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#656d76] italic">
                      <Paperclip className="h-3 w-3" />
                      Attach files by dragging & dropping, selecting or pasting them.
                    </div>
                    <Button 
                      onClick={addComment} 
                      disabled={!newComment.trim()}
                      className="bg-[#2da44e] hover:bg-[#2c974b] text-white border-none h-8 px-4 font-semibold shadow-sm disabled:opacity-50"
                    >
                      Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - GitHub Style */}
          <div className="space-y-6 lg:border-l lg:pl-8 lg:border-[#d0d7de]">
            {/* Status Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#656d76] uppercase tracking-wider">Status</h4>
              <div className="grid grid-cols-1 gap-2">
                {['open', 'in_progress', 'closed'].map((status) => (
                  <Button
                    key={status}
                    variant={issue.status === status ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 justify-start text-xs font-semibold ${
                      issue.status === status 
                        ? 'bg-[#0969da] text-white' 
                        : 'bg-white text-[#24292f] border-[#d0d7de] hover:bg-[#f6f8fa]'
                    }`}
                    onClick={() => updateIssueStatus(status as any)}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      status === 'open' ? 'bg-[#1a7f37]' : 
                      status === 'in_progress' ? 'bg-[#9a6700]' : 
                      'bg-[#8250df]'
                    }`} />
                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-[#d0d7de]" />

            {/* Assignees Section */}
            <div className="space-y-3 relative group">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#656d76] uppercase tracking-wider">Assignees</h4>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#656d76]" onClick={() => setShowAssigneesDropdown(!showAssigneesDropdown)}>
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              
              {showAssigneesDropdown && (
                <div className="absolute right-0 top-8 w-64 bg-white border border-[#d0d7de] rounded-md shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 border-b border-[#d0d7de] bg-[#f6f8fa] text-[10px] font-bold text-[#656d76]">Assign up to 10 people</div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {availableUsers
                      .filter(u => !assignees.some(a => a.user_id === u.user_id))
                      .map(user => (
                        <div
                          key={user.user_id}
                          className="flex items-center gap-2 p-2 hover:bg-[#f6f8fa] rounded cursor-pointer transition-colors"
                          onClick={() => toggleUserSelection(user.user_id)}
                        >
                          <input type="checkbox" checked={selectedUserIds.includes(user.user_id)} className="rounded border-[#d0d7de]" readOnly />
                          <span className="text-sm text-[#24292f]">{user.email}</span>
                        </div>
                      ))}
                    {selectedUserIds.length > 0 && (
                      <Button size="sm" className="w-full mt-2 bg-[#0969da]" onClick={assignMultipleUsers}>Apply</Button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {assignees.map((assignee) => (
                  <div key={assignee.user_id} className="flex items-center justify-between group/user">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-[#d0d7de]">
                        <AvatarFallback className="text-[10px]">{assignee.email.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-[#24292f]">{assignee.email}</span>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/user:opacity-100 transition-opacity" onClick={() => unassignUser(assignee.user_id)}>
                        <X className="h-3.5 w-3.5 text-[#cf222e]" />
                      </Button>
                    )}
                  </div>
                ))}
                {assignees.length === 0 && <span className="text-sm text-[#656d76] italic">No assignees</span>}
              </div>
            </div>

            <Separator className="bg-[#d0d7de]" />

            {/* Labels Section */}
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#656d76] uppercase tracking-wider">Labels</h4>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#656d76]" onClick={() => setShowLabelDialog(true)}>
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issueLabels.map((label) => (
                  <Badge
                    key={label.id}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-white font-bold border-none"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                    {isAdmin && <X className="h-3 w-3 cursor-pointer hover:text-white/80" onClick={() => removeLabel(label.id)} />}
                  </Badge>
                ))}
                {issueLabels.length === 0 && <span className="text-sm text-[#656d76] italic">None yet</span>}
              </div>
            </div>

            <Separator className="bg-[#d0d7de]" />

            {/* Projects Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#656d76] uppercase tracking-wider">Project</h4>
              {issue.project_name ? (
                <div className="flex items-center gap-2 text-sm font-medium text-[#24292f]">
                  <FolderKanban className="h-4 w-4 text-[#0969da]" />
                  {issue.project_name}
                </div>
              ) : (
                <span className="text-sm text-[#656d76] italic">None yet</span>
              )}
            </div>

            <Separator className="bg-[#d0d7de]" />

            {/* Estimates Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#656d76] uppercase tracking-wider">Estimates</h4>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-[#656d76]" />
                <span className="font-semibold text-[#24292f]">{issue.estimated_hours || 0}h</span>
                <span className="text-[#656d76]">estimated</span>
              </div>
            </div>
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
