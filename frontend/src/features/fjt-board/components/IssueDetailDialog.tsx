import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FjtIssue,
  FjtStatus,
  FjtPriority,
  FjtMember,
  FjtComment,
  useUpdateFjtIssue,
  useDeleteFjtIssue,
  useFjtBoardData,
} from '@/sdk/features/fjt-board';
import { IssueTypeIcon } from './IssueCard';
import { GithubIssueTimeline } from './GithubIssueTimeline';
import { MemberMultiSelect } from './MemberMultiSelect';
import { useUsers } from '@/hooks/useUsers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from '@/hooks/use-toast';
import { Trash2, X, Check, Save, AlertTriangle, ArrowUp, Equal, ArrowDown } from 'lucide-react';

interface IssueDetailDialogProps {
  issue: FjtIssue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IssueDetailDialog: React.FC<IssueDetailDialogProps> = ({
  issue,
  open,
  onOpenChange,
}) => {
  const { data: boardData } = useFjtBoardData();
  const updateMutation = useUpdateFjtIssue();
  const deleteMutation = useDeleteFjtIssue();
  const { data: dbUsers = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();

  // Local state buffers (only saved when user clicks "Save" button)
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionSaved, setDescriptionSaved] = useState(true);
  const [descriptionCreatedAt, setDescriptionCreatedAt] = useState<string>('');
  const [descriptionAuthor, setDescriptionAuthor] = useState<FjtMember | undefined>(undefined);
  const [comments, setComments] = useState<FjtComment[]>([]);
  const [status, setStatus] = useState<FjtStatus>('to_do');
  const [priority, setPriority] = useState<FjtPriority>('medium');
  const [labelsInput, setLabelsInput] = useState<string>('');
  const [epicId, setEpicId] = useState<string>('none');
  const [storyId, setStoryId] = useState<string>('none');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('none');
  const [storyPoints, setStoryPoints] = useState<string>('none');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedAssignees, setSelectedAssignees] = useState<FjtMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const epics = boardData?.epics || [];

  const availableStories = useMemo(() => {
    if (!boardData?.issues || !issue) return [];
    return boardData.issues.filter((i) => i.type === 'story' && i.id !== issue.id);
  }, [boardData?.issues, issue]);

  const availableTasks = useMemo(() => {
    if (!boardData?.issues || !issue) return [];
    return boardData.issues.filter((i) => i.type === 'task' && i.id !== issue.id);
  }, [boardData?.issues, issue]);

  // Dynamically resolve project name based on issue's projectId / projectKey
  const displayProjectName = useMemo(() => {
    if (!issue) return 'Free Jira Training (FJT)';
    const found = boardData?.projects?.find(
      (p) => p.id === (issue as any).projectId || p.key.toUpperCase() === issue.projectKey?.toUpperCase()
    );
    return found?.name || issue.projectName || boardData?.project?.name || 'Free Jira Training (FJT)';
  }, [issue, boardData]);

  // Active current user member object
  const currentMember: FjtMember = useMemo(() => {
    let localUser: any = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) localUser = JSON.parse(raw);
    } catch {}

    const u = currentUser || localUser;
    const name = u?.full_name || u?.name || u?.email?.split('@')[0] || 'Pagala Chethan Reddy';
    const email = u?.email || 'chethan.p@techiemaya.com';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'PC';

    return {
      id: String(u?.id || u?.user_id || 'usr-chethan'),
      name,
      email,
      role: u?.role || 'Admin',
      initials,
    };
  }, [currentUser]);

  // Build employee list from DB users with fallback to staff members
  const availableMembers: FjtMember[] = useMemo(() => {
    if (dbUsers && dbUsers.length > 0) {
      return dbUsers.map((u: any) => {
        const name = u.full_name || u.name || u.email.split('@')[0];
        const initials = name
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U';
        return {
          id: String(u.id || u.user_id),
          name,
          email: u.email,
          role: u.role || 'employee',
          initials,
        };
      });
    }

    return [];
  }, [dbUsers]);

  // Sync state buffer when issue opens
  const syncStateFromIssue = useCallback(() => {
    if (issue) {
      setSummary(issue.summary || '');
      setDescription(issue.description || '');
      setDescriptionSaved(issue.descriptionSaved !== undefined ? issue.descriptionSaved : !!(issue.description && issue.description.trim()));
      setDescriptionCreatedAt(issue.descriptionCreatedAt || issue.createdAt);
      setDescriptionAuthor(issue.descriptionAuthor || (issue.assignee ? { ...issue.assignee, role: 'Author' } : currentMember));
      setComments(issue.comments || []);
      setStatus(issue.status || 'to_do');
      setPriority(issue.priority || 'medium');
      setLabelsInput(issue.labels && issue.labels.length > 0 ? issue.labels.join(', ') : '');
      setEpicId(issue.epicId || 'none');
      setStoryId(issue.storyId || 'none');
      setLinkedTaskId(issue.linkedTaskId || 'none');
      setStoryPoints(issue.storyPoints ? String(issue.storyPoints) : 'none');
      setStartDate(issue.startDate || '');
      setEndDate(issue.endDate || '');

      // Populate assignees
      if (issue.assignees && issue.assignees.length > 0) {
        setSelectedAssignees(issue.assignees);
      } else if (issue.assignee) {
        setSelectedAssignees([issue.assignee]);
      } else {
        setSelectedAssignees([]);
      }
    }
  }, [issue, currentMember]);

  useEffect(() => {
    if (open) {
      syncStateFromIssue();
    }
  }, [open, syncStateFromIssue]);

  const availableForAssignees = useMemo(() => {
    return availableMembers;
  }, [availableMembers]);

  // Today date string formatted in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Sanitize date to never exceed 4 digits in year
  const sanitizeDateInput = (val: string): string => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      let year = parts[0];
      if (year.length > 4) {
        year = year.slice(0, 4);
        return `${year}-${parts[1]}-${parts[2]}`;
      }
    }
    return val;
  };

  // Date Logic Validation
  const dateError = useMemo(() => {
    if (startDate) {
      const yearStr = startDate.split('-')[0] || '';
      if (yearStr.length > 4 || parseInt(yearStr, 10) > 9999) {
        return 'Year must be a 4-digit number (YYYY).';
      }
      if (startDate < todayStr) {
        return 'Start date cannot be in the past.';
      }
    }
    if (endDate) {
      const yearStr = endDate.split('-')[0] || '';
      if (yearStr.length > 4 || parseInt(yearStr, 10) > 9999) {
        return 'Year must be a 4-digit number (YYYY).';
      }
      if (endDate < todayStr) {
        return 'End date cannot be in the past.';
      }
    }
    if (startDate && endDate && endDate < startDate) {
      return 'End date must be greater than or equal to Start date.';
    }
    return null;
  }, [startDate, endDate, todayStr]);

  if (!issue) return null;

  // Local state modifications (not persisted until user clicks "Save")
  const handleSaveDescription = (newDesc: string, author?: FjtMember, createdAt?: string) => {
    const authorToSave = author || descriptionAuthor || currentMember;
    const timeToSave = createdAt || descriptionCreatedAt || new Date().toISOString();
    setDescription(newDesc);
    setDescriptionSaved(true);
    setDescriptionAuthor(authorToSave);
    setDescriptionCreatedAt(timeToSave);
  };

  const handleAddComment = async (comment: FjtComment) => {
    const nextComments = [...comments, comment];
    setComments(nextComments);
    try {
      await updateMutation.mutateAsync({
        id: issue.id,
        comments: nextComments,
      } as any);
      toast({
        title: 'Comment posted',
        description: 'Your comment has been added.',
      });
    } catch (err: any) {
      toast({
        title: 'Error saving comment',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateComment = async (commentId: string, newContent: string) => {
    const nextComments = comments.map((c) =>
      c.id === commentId ? { ...c, content: newContent, updatedAt: new Date().toISOString() } : c
    );
    setComments(nextComments);
    try {
      await updateMutation.mutateAsync({
        id: issue.id,
        comments: nextComments,
      } as any);
      toast({ title: 'Comment updated' });
    } catch (err: any) {
      toast({
        title: 'Error updating comment',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const nextComments = comments.filter((c) => c.id !== commentId);
    setComments(nextComments);
    try {
      await updateMutation.mutateAsync({
        id: issue.id,
        comments: nextComments,
      } as any);
      toast({
        title: 'Comment deleted',
      });
    } catch (err: any) {
      toast({
        title: 'Error deleting comment',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Explicit Save
  const handleSaveChanges = async () => {
    if (!summary.trim()) {
      toast({
        title: 'Summary is required',
        description: 'Please enter a summary for the issue.',
        variant: 'destructive',
      });
      return;
    }

    if (dateError) {
      toast({
        title: 'Invalid Date Range',
        description: dateError,
        variant: 'destructive',
      });
      return;
    }

    const parsedLabels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const parsedStoryPoints = storyPoints !== 'none' ? parseInt(storyPoints, 10) : null;

    const selectedEpicObj = epics.find((e) => e.id === epicId);
    const selectedStoryObj = availableStories.find((s) => s.id === storyId);
    const selectedLinkedTaskObj = availableTasks.find((t) => t.id === linkedTaskId);

    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: issue.id,
        summary: summary.trim(),
        description: description.trim(),
        descriptionAuthor: descriptionAuthor || currentMember,
        descriptionCreatedAt: descriptionCreatedAt || issue.createdAt,
        descriptionSaved,
        comments,
        status,
        priority,
        labels: parsedLabels,
        storyPoints: parsedStoryPoints,
        startDate: startDate ? startDate : null,
        endDate: endDate ? endDate : null,
        epicId: epicId !== 'none' ? epicId : null,
        epicKey: selectedEpicObj ? selectedEpicObj.key : null,
        epicName: selectedEpicObj ? (selectedEpicObj.epicName || (selectedEpicObj as any).name || selectedEpicObj.summary) : null,
        epicColor: selectedEpicObj ? selectedEpicObj.color : null,
        storyId: (issue.type === 'task' || issue.type === 'bug') ? (storyId !== 'none' ? storyId : null) : null,
        storyKey: (issue.type === 'task' || issue.type === 'bug') && selectedStoryObj ? selectedStoryObj.key : null,
        storySummary: (issue.type === 'task' || issue.type === 'bug') && selectedStoryObj ? selectedStoryObj.summary : null,
        linkedTaskId: (issue.type === 'task' || issue.type === 'bug') ? (linkedTaskId !== 'none' ? linkedTaskId : null) : null,
        linkedTaskKey: (issue.type === 'task' || issue.type === 'bug') && selectedLinkedTaskObj ? selectedLinkedTaskObj.key : null,
        linkedTaskSummary: (issue.type === 'task' || issue.type === 'bug') && selectedLinkedTaskObj ? selectedLinkedTaskObj.summary : null,
        assignees: selectedAssignees,
        assignee: selectedAssignees[0] || null,
        assigneeName: selectedAssignees.map((a) => a.name).join(', ') || null,
      } as any);

      toast({
        title: 'Changes saved',
        description: `${issue.key} has been updated successfully.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Failed to save changes',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${issue.key}?`)) {
      try {
        await deleteMutation.mutateAsync(issue.id);
        toast({ title: `${issue.key} deleted` });
        onOpenChange(false);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleCancel = () => {
    syncStateFromIssue();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleCancel(); else onOpenChange(val); }}>
      <DialogContent
        hideDefaultClose
        className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[940px] max-h-[75vh] sm:max-h-[92vh] overflow-hidden flex flex-col bg-white p-0 gap-0 shadow-2xl rounded-xl"
      >
        {/* Top Header Bar */}
        <div className="py-4 sm:py-4.5 px-5 sm:px-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/70 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-600 font-medium min-w-0 pr-2">
            <IssueTypeIcon type={issue.type} />
            <span className="font-bold text-gray-900 text-sm flex-shrink-0">{issue.key}</span>
            <span className="text-gray-300 flex-shrink-0">•</span>
            <span className="text-gray-600 truncate">{displayProjectName}</span>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors focus:outline-none flex items-center justify-center flex-shrink-0 -mr-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 custom-scrollbar">
          {/* Left Main Column (2 spans): Title, Description & Activity */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title / Summary */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Summary
              </label>
              <Input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full text-base font-bold text-gray-900 bg-white border-gray-300 focus:border-[#0B1957]"
                placeholder="Issue summary"
              />
            </div>

            {/* GitHub-style Issue Description & Comments Timeline */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Description & Activity
              </label>
              <GithubIssueTimeline
                description={description}
                descriptionAuthor={descriptionAuthor || currentMember}
                descriptionCreatedAt={descriptionCreatedAt || issue.createdAt}
                descriptionSaved={descriptionSaved}
                comments={comments}
                onSaveDescription={handleSaveDescription}
                onAddComment={handleAddComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          </div>

          {/* Right Sidebar Column (1 span): Attributes & Assignee / Reviewers / Hierarchy Links */}
          <div className="space-y-4 bg-gray-50/70 p-4 rounded-lg border border-gray-200 text-xs">
            {/* Status Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <Select value={status} onValueChange={(val) => setStatus(val as FjtStatus)}>
                <SelectTrigger className="w-full bg-white border-gray-300 font-semibold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="to_do">TO DO</SelectItem>
                  <SelectItem value="in_progress">IN PROGRESS</SelectItem>
                  <SelectItem value="done">DONE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Epic Link (Only for Story) */}
            {issue.type === 'story' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Epic Link (Parent Epic)
                </label>
                <Select value={epicId} onValueChange={setEpicId}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-xs overflow-hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-48">
                    <SelectItem value="none">
                      <span className="text-gray-400">None</span>
                    </SelectItem>
                    {epics.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id}>
                        <div className="flex items-center gap-2 min-w-0 max-w-full">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: epic.color }}
                          />
                          <span className="font-semibold text-xs text-gray-900 whitespace-nowrap flex-shrink-0">
                            {epic.key}:
                          </span>
                          <span className="font-medium text-xs truncate text-gray-700">{epic.epicName || (epic as any).name || epic.summary}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tag Existing Task (For Task & Bug) */}
            {(issue.type === 'task' || issue.type === 'bug') && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Tag Existing Task (Task Link)
                </label>
                <Select
                  value={linkedTaskId}
                  onValueChange={(val) => {
                    setLinkedTaskId(val);
                    if (val !== 'none') {
                      const selectedTask = availableTasks.find((t) => t.id === val);
                      if (selectedTask?.storyId && storyId === 'none') {
                        setStoryId(selectedTask.storyId);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-white border-gray-300 text-xs overflow-hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-48">
                    <SelectItem value="none">
                      <span className="text-gray-400">None (No linked task)</span>
                    </SelectItem>
                    {availableTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                          <IssueTypeIcon type="task" className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-semibold text-xs whitespace-nowrap flex-shrink-0 text-gray-900">
                            {task.key}:
                          </span>
                          <span className="font-normal text-xs truncate text-gray-600">{task.summary}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Story Link (For Task & Bug) */}
            {(issue.type === 'task' || issue.type === 'bug') && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Story Link (Parent Story)
                </label>
                <Select value={storyId} onValueChange={setStoryId}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-xs overflow-hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-48">
                    <SelectItem value="none">
                      <span className="text-gray-400">None (Standalone)</span>
                    </SelectItem>
                    {availableStories.map((story) => (
                      <SelectItem key={story.id} value={story.id}>
                        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                          <IssueTypeIcon type="story" className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-semibold text-xs whitespace-nowrap flex-shrink-0 text-gray-900">
                            {story.key}:
                          </span>
                          <span className="font-normal text-xs truncate text-gray-600">{story.summary}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}            {issue.type !== 'epic' && (
              <>
                {/* Story Points (1 - 10) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Story Points (1-10)
                  </label>
                  <Select value={storyPoints} onValueChange={setStoryPoints}>
                    <SelectTrigger className="w-full bg-white border-gray-300 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">None</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pt) => (
                        <SelectItem key={pt} value={String(pt)}>
                          {pt} {pt === 1 ? 'point' : 'points'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date & End Date */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      min={todayStr}
                      max="9999-12-31"
                      onChange={(e) => {
                        const val = sanitizeDateInput(e.target.value);
                        setStartDate(val);
                        if (val && endDate && endDate < val) {
                          setEndDate(val);
                        }
                      }}
                      className={`bg-white text-xs h-8 ${startDate && (startDate < todayStr || startDate.split('-')[0]?.length > 4 || (endDate && endDate < startDate)) ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate || todayStr}
                      max="9999-12-31"
                      onChange={(e) => setEndDate(sanitizeDateInput(e.target.value))}
                      className={`bg-white text-xs h-8 ${endDate && (endDate < todayStr || (startDate && endDate < startDate) || endDate.split('-')[0]?.length > 4) ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </div>
                  {dateError && (
                    <div className="col-span-2 text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5 bg-red-50 border border-red-200 p-1.5 rounded">
                      <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
                      <span>{dateError}</span>
                    </div>
                  )}
                </div>

                {/* Assignees (Multi-Select) */}
                <MemberMultiSelect
                  label="Assignees"
                  placeholder="Select assignees..."
                  selectedMembers={selectedAssignees}
                  availableMembers={availableForAssignees}
                  onChange={setSelectedAssignees}
                  badgeColor="#0B1957"
                  direction="up"
                />

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <Select value={priority} onValueChange={(val) => setPriority(val as FjtPriority)}>
                    <SelectTrigger className="w-full bg-white border-gray-300 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="high">
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          <ArrowUp className="h-3.5 w-3.5 text-red-600 stroke-[2.5]" />
                          <span>High</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          <Equal className="h-3.5 w-3.5 text-amber-500 stroke-[2.5]" />
                          <span>Medium</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          <ArrowDown className="h-3.5 w-3.5 text-blue-500 stroke-[2.5]" />
                          <span>Low</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Labels */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Labels
                  </label>
                  <Input
                    type="text"
                    value={labelsInput}
                    onChange={(e) => setLabelsInput(e.target.value)}
                    placeholder="e.g. frontend, bug, api"
                    className="bg-white border-gray-300 text-xs h-8"
                  />
                </div>
              </>
            )}

            {/* Timestamps */}
            <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-400 space-y-1">
              <div>Created: {new Date(issue.createdAt).toLocaleDateString()}</div>
              <div>Updated: {new Date(issue.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-14 px-5 sm:px-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2.5 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={isSaving}
            className="text-gray-700 hover:bg-red-50 hover:text-red-600 text-xs font-semibold gap-1.5 h-8 px-3.5 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500 group-hover:text-red-600" />
            Delete
          </Button>
          <Button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="bg-[#0B1957] hover:bg-[#071038] text-white text-xs font-semibold h-8 px-5 gap-1.5 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
