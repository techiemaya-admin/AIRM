import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
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
  useCreateFjtIssue,
  useFjtBoardData,
  FjtIssueType,
  FjtStatus,
  FjtPriority,
  FjtMember,
  FjtComment,
} from '@/sdk/features/fjt-board';
import { IssueTypeIcon } from './IssueCard';
import { GithubIssueTimeline } from './GithubIssueTimeline';
import { MemberMultiSelect } from './MemberMultiSelect';
import { useUsers } from '@/hooks/useUsers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from '@/hooks/use-toast';
import { X, Calendar, Hash, AlertTriangle, ArrowUp, Equal, ArrowDown } from 'lucide-react';

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: FjtIssueType;
  defaultEpicId?: string;
  defaultStoryId?: string;
  defaultLinkedTaskId?: string;
}

export const CreateIssueDialog: React.FC<CreateIssueDialogProps> = ({
  open,
  onOpenChange,
  defaultType = 'task',
  defaultEpicId,
  defaultStoryId,
  defaultLinkedTaskId,
}) => {
  const { data: boardData } = useFjtBoardData();
  const createIssueMutation = useCreateFjtIssue();
  const { data: dbUsers = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();

  const [issueType, setIssueType] = useState<FjtIssueType>(defaultType);
  const [status, setStatus] = useState<FjtStatus>('to_do');
  const [summary, setSummary] = useState('');
  const [epicName, setEpicName] = useState('');
  const [epicId, setEpicId] = useState<string>(defaultEpicId || 'none');
  const [storyId, setStoryId] = useState<string>(defaultStoryId || 'none');
  const [linkedTaskId, setLinkedTaskId] = useState<string>(defaultLinkedTaskId || 'none');
  const [storyPoints, setStoryPoints] = useState<string>('none');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [descriptionSaved, setDescriptionSaved] = useState(false);
  const [descriptionCreatedAt, setDescriptionCreatedAt] = useState<string>('');
  const [comments, setComments] = useState<FjtComment[]>([]);
  const [priority, setPriority] = useState<FjtPriority>('medium');
  const [labelsInput, setLabelsInput] = useState<string>('');
  const [selectedAssignees, setSelectedAssignees] = useState<FjtMember[]>([]);

  const epics = boardData?.epics || [];

  // Active Project from board data
  const activeProject = useMemo(() => {
    if (boardData?.projects && boardData.projects.length > 0) {
      if (boardData.currentProjectId) {
        const found = boardData.projects.find((p) => p.id === boardData.currentProjectId);
        if (found) return found;
      }
      return boardData.projects[0];
    }
    return {
      id: 'proj-1',
      key: boardData?.project?.key || 'FJT',
      name: boardData?.project?.name || 'Free Jira Training (FJT)',
    };
  }, [boardData]);

  const projectsList = useMemo(() => {
    if (boardData?.projects && boardData.projects.length > 0) {
      return boardData.projects;
    }
    return [activeProject];
  }, [boardData?.projects, activeProject]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProject.id);

  // Sync selected project and default props whenever boardData changes or dialog opens
  useEffect(() => {
    if (activeProject?.id) {
      setSelectedProjectId(activeProject.id);
    }
    if (open) {
      setIssueType(defaultType || 'task');
      setEpicId(defaultEpicId || 'none');
      setStoryId(defaultStoryId || 'none');
      setLinkedTaskId(defaultLinkedTaskId || 'none');
    }
  }, [activeProject?.id, open, defaultType, defaultEpicId, defaultStoryId, defaultLinkedTaskId]);

  const selectedProject = useMemo(() => {
    return projectsList.find((p) => p.id === selectedProjectId) || activeProject;
  }, [projectsList, selectedProjectId, activeProject]);

  // Stories available for Task / Bug linking
  const availableStories = useMemo(() => {
    if (!boardData?.issues) return [];
    return boardData.issues.filter((i) => i.type === 'story');
  }, [boardData?.issues]);

  // Tasks available for tagging to new Task / Bug
  const availableTasks = useMemo(() => {
    if (!boardData?.issues) return [];
    return boardData.issues.filter((i) => i.type === 'task');
  }, [boardData?.issues]);

  // Current active user as FjtMember
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

  // Build employee list from DB users with fallback to company staff
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

  const availableForAssignees = useMemo(() => {
    return availableMembers;
  }, [availableMembers]);

  const formRef = React.useRef<HTMLFormElement>(null);

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

  // Reset form completely so unsubmitted drafts are never kept on close
  const resetForm = useCallback(() => {
    setIssueType(defaultType);
    setStatus('to_do');
    setSummary('');
    setEpicName('');
    setEpicId(defaultEpicId || 'none');
    setStoryId(defaultStoryId || 'none');
    setLinkedTaskId(defaultLinkedTaskId || 'none');
    setStoryPoints('none');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setDescriptionSaved(false);
    setDescriptionCreatedAt('');
    setComments([]);
    setPriority('medium');
    setLabelsInput('');
    setSelectedAssignees([]);
    if (activeProject?.id) {
      setSelectedProjectId(activeProject.id);
    }
  }, [defaultType, defaultEpicId, defaultStoryId, defaultLinkedTaskId, activeProject?.id]);

  // Reset and scroll to top when modal closes or opens fresh
  useEffect(() => {
    if (!open) {
      resetForm();
    } else {
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollTop = 0;
        }
      }, 10);
    }
  }, [open, issueType, resetForm]);

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSaveDescription = (newDesc: string, author?: FjtMember, createdAt?: string) => {
    setDescription(newDesc);
    setDescriptionSaved(true);
    setDescriptionCreatedAt(createdAt || new Date().toISOString());
  };

  const handleAddComment = (comment: FjtComment) => {
    setComments((prev) => [...prev, comment]);
  };

  const handleUpdateComment = (commentId: string, newContent: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content: newContent, updatedAt: new Date().toISOString() } : c))
    );
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveSummary = summary.trim() || (issueType === 'epic' ? epicName.trim() : '');

    if (issueType !== 'epic' && !summary.trim()) {
      toast({
        title: 'Summary is required',
        description: 'Please enter a summary for the issue.',
        variant: 'destructive',
      });
      return;
    }

    if (issueType === 'epic' && !epicName.trim() && !summary.trim()) {
      toast({
        title: 'Epic Name is required',
        description: 'Provide a short name to identify this epic.',
        variant: 'destructive',
      });
      return;
    }

    // Date Logic Validation: End Date must be >= Start Date & Start Date not in past
    if (dateError) {
      toast({
        title: 'Invalid Date Selection',
        description: dateError,
        variant: 'destructive',
      });
      return;
    }

    const parsedLabels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const parsedStoryPoints = storyPoints !== 'none' ? parseInt(storyPoints, 10) : undefined;
    const selectedEpicObj = epics.find((e) => e.id === epicId);
    const selectedStoryObj = availableStories.find((s) => s.id === storyId);
    const selectedLinkedTaskObj = availableTasks.find((t) => t.id === linkedTaskId);

    try {
      const created = await createIssueMutation.mutateAsync({
        type: issueType,
        summary: effectiveSummary,
        epicName: issueType === 'epic' ? epicName.trim() : (selectedEpicObj ? (selectedEpicObj.epicName || (selectedEpicObj as any).name || selectedEpicObj.summary) : undefined),
        epicId: issueType === 'story' && epicId !== 'none' ? epicId : undefined,
        epicKey: issueType === 'story' && selectedEpicObj ? selectedEpicObj.key : undefined,
        epicColor: issueType === 'story' && selectedEpicObj ? selectedEpicObj.color : undefined,
        storyId: (issueType === 'task' || issueType === 'bug') && storyId !== 'none' ? storyId : undefined,
        storyKey: (issueType === 'task' || issueType === 'bug') && selectedStoryObj ? selectedStoryObj.key : undefined,
        storySummary: (issueType === 'task' || issueType === 'bug') && selectedStoryObj ? selectedStoryObj.summary : undefined,
        linkedTaskId: (issueType === 'task' || issueType === 'bug') && linkedTaskId !== 'none' ? linkedTaskId : undefined,
        linkedTaskKey: (issueType === 'task' || issueType === 'bug') && selectedLinkedTaskObj ? selectedLinkedTaskObj.key : undefined,
        linkedTaskSummary: (issueType === 'task' || issueType === 'bug') && selectedLinkedTaskObj ? selectedLinkedTaskObj.summary : undefined,
        storyPoints: issueType !== 'epic' ? parsedStoryPoints : undefined,
        startDate: issueType !== 'epic' ? (startDate || undefined) : undefined,
        endDate: issueType !== 'epic' ? (endDate || undefined) : undefined,
        description: description.trim(),
        descriptionAuthor: currentMember,
        descriptionCreatedAt: descriptionCreatedAt || new Date().toISOString(),
        descriptionSaved: descriptionSaved || !!description.trim(),
        comments,
        status,
        priority: issueType !== 'epic' ? priority : 'medium',
        labels: issueType !== 'epic' ? parsedLabels : [],
        projectId: selectedProject.id,
        projectKey: selectedProject.key,
        projectName: selectedProject.name,
        assignees: issueType !== 'epic' ? selectedAssignees : [],
        assignee: issueType !== 'epic' ? selectedAssignees[0] : undefined,
        assigneeName: issueType !== 'epic' ? selectedAssignees.map((a) => a.name).join(', ') : undefined,
      } as any);

      toast({
        title: `Created (${created.key})`,
        description: `${created.key} created successfully.`,
      });

      handleClose();
      onOpenChange(false);
    } catch (err: any) {
      let friendlyMessage = 'Unable to create this item. Please check the entered fields and try again.';
      const rawMsg = String(err?.message || '').toLowerCase();
      if (rawMsg.includes('duplicate') || rawMsg.includes('unique') || rawMsg.includes('already exists')) {
        friendlyMessage = 'An item with this key or name already exists in this project.';
      } else if (rawMsg.includes('null value') || rawMsg.includes('not-null') || rawMsg.includes('required')) {
        friendlyMessage = 'Please ensure all required fields are filled before submitting.';
      } else if (rawMsg.includes('network') || rawMsg.includes('failed to fetch')) {
        friendlyMessage = 'Network connection issue. Please check your connection and try again.';
      } else if (err?.message && !err.message.includes('relation') && !err.message.includes('column') && !err.message.includes('constraint')) {
        friendlyMessage = err.message;
      }

      toast({
        title: 'Could not create item',
        description: friendlyMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
      <DialogContent
        hideDefaultClose
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        className="sm:max-w-[720px] max-h-[92vh] overflow-hidden flex flex-col bg-white p-0 gap-0 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="h-14 sm:h-15 px-5 sm:px-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
          <DialogTitle className="text-lg font-bold text-gray-900 m-0 leading-none">
            Create issue
          </DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none flex items-center justify-center -mr-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* 1. Project Selector (Main Container) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Project <span className="text-red-500">*</span>
            </label>
            {projectsList.length > 1 ? (
              <Select value={selectedProject.id} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#0B1957] text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {selectedProject.key?.[0] || selectedProject.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <span className="truncate">
                      {selectedProject.name}
                      {selectedProject.key && !selectedProject.name.includes(selectedProject.key) ? ` (${selectedProject.key})` : ''}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {projectsList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[#0B1957] text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {p.key?.[0] || p.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <span>
                          {p.name}
                          {p.key && !p.name.includes(p.key) ? ` (${p.key})` : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800 font-medium">
                <div className="w-5 h-5 bg-[#0B1957] text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {selectedProject.key?.[0] || selectedProject.name?.[0]?.toUpperCase() || 'P'}
                </div>
                <span className="truncate">
                  {selectedProject.name}
                  {selectedProject.key && !selectedProject.name.includes(selectedProject.key) ? ` (${selectedProject.key})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* 2. Issue Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Issue type <span className="text-red-500">*</span>
            </label>
            <Select value={issueType} onValueChange={(val) => setIssueType(val as FjtIssueType)}>
              <SelectTrigger className="w-full bg-white border-gray-300">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="story">
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type="story" />
                    <span>Story</span>
                  </div>
                </SelectItem>
                <SelectItem value="task">
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type="task" />
                    <span>Task</span>
                  </div>
                </SelectItem>
                <SelectItem value="bug">
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type="bug" />
                    <span>Bug</span>
                  </div>
                </SelectItem>
                <SelectItem value="epic">
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type="epic" />
                    <span>Epic</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-500 mt-1">
              {issueType === 'epic' && 'Epic: A large strategic goal inside the Project.'}
              {issueType === 'story' && 'Story: A user requirement that lives inside an Epic.'}
              {issueType === 'task' && 'Task: A technical or operational action item that lives inside a Story.'}
              {issueType === 'bug' && 'Bug: A defect or issue that lives inside a Story.'}
            </p>
          </div>

          {/* 3. Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Status
            </label>
            <Select value={status} onValueChange={(val) => setStatus(val as FjtStatus)}>
              <SelectTrigger className="w-44 bg-white border-gray-300">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="to_do">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Epic Name (Only when IssueType is Epic) */}
          {issueType === 'epic' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Epic Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={epicName}
                onChange={(e) => setEpicName(e.target.value)}
                placeholder="e.g. WhatsApp Integration & Media"
                className="bg-white border-gray-300"
              />
              <p className="text-[11px] text-gray-500 mt-1">Provide a short name to identify this epic inside the project.</p>
            </div>
          )}

          {/* 5. Epic Link (Only when IssueType is Story: Story lives inside Epic) */}
          {issueType === 'story' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Epic Link (Parent Epic)
              </label>
              <Select value={epicId} onValueChange={setEpicId}>
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="Select Epic" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-56">
                  <SelectItem value="none">
                    <span className="text-gray-400">None</span>
                  </SelectItem>
                  {epics.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: epic.color }}
                        />
                        <span className="font-medium text-gray-900">{epic.epicName || (epic as any).name || epic.summary}</span>
                        <span className="text-xs text-gray-400">({epic.key})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 6. Tag Existing Task (Task Link) - Only enabled when IssueType is Task or Bug */}
          {(issueType === 'task' || issueType === 'bug') && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                <SelectTrigger className="w-full bg-white border-gray-300 text-xs">
                  <SelectValue placeholder="Select an existing task to tag/link..." />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-56">
                  <SelectItem value="none">
                    <span className="text-gray-400">None (No linked task)</span>
                  </SelectItem>
                  {availableTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      <div className="flex items-center gap-2 min-w-0 max-w-full">
                        <IssueTypeIcon type="task" className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 whitespace-nowrap flex-shrink-0 text-xs">
                          {task.key}:
                        </span>
                        <span className="truncate text-gray-700 text-xs">{task.summary}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-500 mt-1">
                Optional: Tag an existing task related to this {issueType}.
              </p>
            </div>
          )}

          {/* 7. Story Link (When IssueType is Task or Bug: Task/Bug lives inside Story) */}
          {(issueType === 'task' || issueType === 'bug') && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Story Link (Parent Story)
              </label>
              <Select value={storyId} onValueChange={setStoryId}>
                <SelectTrigger className="w-full bg-white border-gray-300 text-xs">
                  <SelectValue placeholder="Select Parent Story" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-56">
                  <SelectItem value="none">
                    <span className="text-gray-400">None (Standalone)</span>
                  </SelectItem>
                  {availableStories.map((story) => (
                    <SelectItem key={story.id} value={story.id}>
                      <div className="flex items-center gap-2 min-w-0 max-w-full">
                        <IssueTypeIcon type="story" className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 whitespace-nowrap flex-shrink-0 text-xs">
                          {story.key}:
                        </span>
                        <span className="truncate text-gray-700 text-xs">{story.summary}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-500 mt-1">Select the Story this {issueType} belongs to.</p>
            </div>
          )}

          {/* 7. Summary */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Summary {issueType === 'epic' ? <span className="text-gray-400 font-normal text-[11px]">(Optional for Epic)</span> : <span className="text-red-500">*</span>}
            </label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={issueType === 'epic' ? 'e.g. Detailed objective of this epic' : 'e.g. Implement user login session caching'}
              className="bg-white border-gray-300"
            />
          </div>

          {/* 8. Story Points & Dates Grid (Hidden for Epics) */}
          {issueType !== 'epic' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-3.5 rounded-lg border border-gray-200">
              {/* Story Points (1 - 10) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-blue-600" />
                  Story Points (1-10)
                </label>
                <Select value={storyPoints} onValueChange={setStoryPoints}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-xs">
                    <SelectValue placeholder="Select Points" />
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

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
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
                  className={`bg-white text-xs ${startDate && (startDate < todayStr || startDate.split('-')[0]?.length > 4) ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-red-600" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || todayStr}
                  max="9999-12-31"
                  onChange={(e) => setEndDate(sanitizeDateInput(e.target.value))}
                  className={`bg-white text-xs ${endDate && (endDate < todayStr || (startDate && endDate < startDate) || endDate.split('-')[0]?.length > 4) ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>

              {/* Real-time Inline Date Error Banner */}
              {dateError && (
                <div className="col-span-1 sm:col-span-3 text-xs text-red-600 font-medium flex items-center gap-1.5 bg-red-50 border border-red-200 p-2 rounded-md">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                  <span>{dateError}</span>
                </div>
              )}
            </div>
          )}

          {/* 9. Description & Activity */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Description & Activity
            </label>
            <GithubIssueTimeline
              description={description}
              descriptionAuthor={currentMember}
              descriptionCreatedAt={descriptionCreatedAt}
              descriptionSaved={descriptionSaved}
              comments={comments}
              onSaveDescription={handleSaveDescription}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>

          {/* 10. Labels & Priority Grid (Hidden for Epics) */}
          {issueType !== 'epic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Labels */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Labels
                </label>
                <Input
                  type="text"
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder="e.g. frontend, bug, auth"
                  className="bg-white border-gray-300"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Priority
                </label>
                <Select value={priority} onValueChange={(val) => setPriority(val as FjtPriority)}>
                  <SelectTrigger className="w-full bg-white border-gray-300">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent side="top" className="bg-white">
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
            </div>
          )}

          {/* 11. Assignees Multi-Select (Hidden for Epics) */}
          {issueType !== 'epic' && (
            <div className="pt-1">
              <MemberMultiSelect
                label="Assignees"
                placeholder="Select assignees..."
                selectedMembers={selectedAssignees}
                availableMembers={availableForAssignees}
                onChange={setSelectedAssignees}
                badgeColor="#0B1957"
                direction="up"
              />
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="px-4 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createIssueMutation.isPending}
              className="bg-[#0B1957] hover:bg-[#071038] text-white px-5 font-semibold shadow-xs"
            >
              {createIssueMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
