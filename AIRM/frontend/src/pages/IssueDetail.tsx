import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@sdk/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, MessageSquare, Tag, User, X } from "lucide-react";
import logo from "/techiemaya-logo.png";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [issueLabels, setIssueLabels] = useState<Label[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Assignee[]>([]);
  
  const [newComment, setNewComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProjectName, setEditProjectName] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.id) {
        navigate("/auth");
        return;
      }

        const currentUserResp = await api.auth.getMe() as any;
        setIsAdmin(currentUserResp?.user?.role === 'admin');
      await loadIssueData();
      await loadLabels();
      await loadUsers();
      } catch (error) {
        console.error('Error initializing issue detail:', error);
        navigate("/auth");
      } finally {
      setLoading(false);
      }
    };

    initPage();

    // Note: Real-time subscriptions removed - would need to be re-implemented with WebSockets or polling
    // For now, comments will be loaded on page load and after adding new comments
  }, [id, navigate]);

  const loadIssueData = async () => {
    try {
      if (!id) {
      navigate("/issues");
      return;
    }

      console.log('Loading issue with ID:', id);

      // Load issue
      const issueResponse = await api.issues.getById(id) as any;
      const issueData = issueResponse.issue || issueResponse;

      if (!issueData || !issueData.id) {
        throw new Error("Issue not found");
      }

      console.log('Issue data loaded:', issueData);

    setIssue(issueData);
    setEditTitle(issueData.title);
    setEditDescription(issueData.description || "");
    setEditProjectName(issueData.project_name || "");

    // Load assignees
      const assigneesData = issueData.assignees || [];
      setAssignees(assigneesData.map((a: any) => ({
            user_id: a.user_id,
        email: a.email || 'Unknown'
      })));

    // Load labels
      const labelsData = issueData.labels || [];
      setIssueLabels(labelsData);

      // Load comments - API returns comments with user_email
      const commentsData = issueData.comments || [];
      setComments(commentsData.map((c: any) => ({
        ...c,
        user_email: c.email || c.user_email || 'Unknown'
      })));

      // Load activity - API returns activity (not activities)
      const activityData = issueData.activity || issueData.activities || [];
      setActivities(activityData.map((a: any) => ({
        ...a,
        user_email: a.email || a.user_email || 'Unknown'
      })));
    } catch (error: any) {
      console.error("Error loading issue:", error);
      console.error("Error details:", error);
      
      // Only redirect if it's a 404 (not found) error
      if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('Issue not found')) {
        toast({
          title: "Error",
          description: "Issue not found",
          variant: "destructive",
        });
        navigate("/issues");
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to load issue. Please check the console for details.",
          variant: "destructive",
        });
        // Don't redirect on other errors - let user try to refresh or check console
      }
    }
  };

  const loadLabels = async () => {
    try {
      const response = await api.labels.getAll() as any;
      const labelsData = response.labels || response || [];
      setAvailableLabels(labelsData);
    } catch (error) {
      console.error("Error loading labels:", error);
      setAvailableLabels([]);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.users.getWithRoles() as any;
      const usersData = response.users || response || [];
      setAvailableUsers(usersData.map((u: any) => ({
        user_id: u.user_id || u.id,
        email: u.email
      })));
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    }
  };

  const updateIssueStatus = async (newStatus: 'open' | 'in_progress' | 'closed') => {
    try {
      await api.issues.update(id!, {
        status: newStatus,
        ...(newStatus === 'closed' ? { closed_at: new Date().toISOString() } : {})
      });

      toast({
        title: "Success",
        description: `Issue status updated to ${newStatus.replace('_', ' ')}`,
      });
      await loadIssueData();
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
      await api.issues.update(id, {
        title: editTitle,
        description: editDescription,
        project_name: editProjectName,
      });

      toast({
        title: "Success",
        description: "Issue updated successfully",
      });
      setIsEditing(false);
      await loadIssueData();
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
      await api.issues.addComment(id!, newComment);

      toast({
        title: "Success",
        description: "Comment added successfully",
      });

      setNewComment("");
      await loadIssueData();
      // Notifications are handled by the backend API
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const addLabel = async (labelId: string) => {
    if (!id) return;
    
    try {
      await api.issues.addLabel(id, labelId);
      
      toast({
        title: "Success",
        description: "Label added successfully",
      });

      await loadIssueData();
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
      await api.issues.removeLabel(id, labelId);
      
      toast({
        title: "Success",
        description: "Label removed successfully",
      });
      
      await loadIssueData();
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
      await api.issues.assignUser(id, userId);
      
      toast({
        title: "Success",
        description: "User assigned successfully",
      });
      
      await loadIssueData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user",
        variant: "destructive",
      });
    }
  };

  const unassignUser = async (userId: string) => {
    if (!id) return;
    
    try {
      await api.issues.unassignUser(id, userId);
      
      toast({
        title: "Success",
        description: "User unassigned successfully",
      });
      
      await loadIssueData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unassign user",
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading issue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src={logo} alt="TechieMaya" className="h-40" />
            <Button variant="outline" onClick={() => navigate("/issues")}>
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
                      <Label>Project Name</Label>
                      <Input
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
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
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-2 text-sm">
                      <span className="text-gray-500">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                      <span className="font-semibold">{activity.user_email}</span>
                      <span>{activity.action}</span>
                      {activity.details && (
                        <span className="text-gray-600">
                          {JSON.stringify(activity.details)}
                        </span>
                      )}
                    </div>
                  ))}
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
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assignees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Debug info for troubleshooting assign dropdown */}
                <div style={{ fontSize: '11px', color: '#888' }}>
                  <div>isAdmin: {JSON.stringify(isAdmin)}</div>
                  <div>availableUsers: {availableUsers.length}</div>
                  <div>assignees: {assignees.length}</div>
                  <div>Assignable users: {availableUsers.filter(u => !assignees.some(a => a.user_id === u.user_id)).length}</div>
                </div>
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
                {isAdmin && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        assignUser(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="">Assign user...</option>
                    {availableUsers
                      .filter(u => !assignees.some(a => a.user_id === u.user_id))
                      .map(user => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.email}
                        </option>
                      ))}
                  </select>
                )}
              </CardContent>
            </Card>

            {/* Labels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Labels
                </CardTitle>
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

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Priority:</span>{' '}
                  <span className="capitalize">{issue.priority}</span>
                </div>
                {issue.project_name && (
                  <div>
                    <span className="font-semibold">Project:</span> {issue.project_name}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Created:</span>{' '}
                  {new Date(issue.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Updated:</span>{' '}
                  {new Date(issue.updated_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

