import React, { useState, useMemo, useEffect } from 'react';
import {
  useFjtBoardData,
  useMoveFjtIssueStatus,
  useDeleteFjtIssue,
  FjtStatus,
  FjtIssue,
  doesIssueMentionUser,
  hasAnyMentions,
  getIssueTimeTrackingData,
} from '@/sdk/features/fjt-board';

import { IssueCard, IssueTypeIcon } from './IssueCard';
import { CreateIssueDialog } from './CreateIssueDialog';
import { IssueDetailDialog } from './IssueDetailDialog';
import { IssueTimeTrackingDialog } from './IssueTimeTrackingDialog';
import { ProjectsManagementDialog } from './ProjectsManagementDialog';
import { EpicsManagementDialog } from './EpicsManagementDialog';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Layers,
  Users,
  Briefcase,
  AtSign,
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useActiveTimesheet, useAllActiveTimesheets, useTimesheetEntries } from '@/hooks/useTimesheets';
import { toast } from '@/hooks/use-toast';
import { TaskBoardSkeleton } from '@/components/PageSkeletons';

export const ActiveBoardView: React.FC = () => {
  const { data: boardData, isLoading } = useFjtBoardData();
  const moveStatusMutation = useMoveFjtIssueStatus();
  const deleteMutation = useDeleteFjtIssue();
  const { data: dbUsers = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const { data: timeEntries = [] } = useTimesheetEntries({ limit: 1000 });
  const { data: currentActiveTimesheet } = useActiveTimesheet();
  const { data: allActiveTimesheets = [] } = useAllActiveTimesheets();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [onlyMentionedMe, setOnlyMentionedMe] = useState(false);
  const [selectedMentionFilter, setSelectedMentionFilter] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
  const [epicsDialogOpen, setEpicsDialogOpen] = useState(false);
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [detailIssue, setDetailIssue] = useState<FjtIssue | null>(null);
  const [timeTrackingIssue, setTimeTrackingIssue] = useState<FjtIssue | null>(null);
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [mobileStatusTab, setMobileStatusTab] = useState<FjtStatus>('to_do');

  const combinedActiveEntries = useMemo(() => {
    const list = Array.isArray(allActiveTimesheets) ? [...allActiveTimesheets] : [];
    if (currentActiveTimesheet && !list.some((e: any) => e.id === currentActiveTimesheet.id)) {
      list.push(currentActiveTimesheet);
    }
    return list;
  }, [allActiveTimesheets, currentActiveTimesheet]);

  const issueTimeSpentMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!boardData?.issues) return map;
    boardData.issues.forEach((issue) => {
      const data = getIssueTimeTrackingData(issue, timeEntries, combinedActiveEntries);
      map[issue.id] = data.formattedTotal;
    });
    return map;
  }, [boardData?.issues, timeEntries, combinedActiveEntries]);


  const activeProject = useMemo(() => {
    if (boardData?.projects && boardData.projects.length > 0) {
      if (boardData.currentProjectId) {
        const found = boardData.projects.find((p) => p.id === boardData.currentProjectId);
        if (found) return found;
      }
      return boardData.projects[0];
    }
    return {
      id: '',
      key: 'START',
      name: 'No Projects Created',
    };
  }, [boardData]);

  const resolvedCurrentUserObj = useMemo(() => {
    let localUser: any = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) localUser = JSON.parse(raw);
    } catch {}
    const u = currentUser || localUser;
    const name = u?.full_name || u?.name || u?.email?.split('@')[0] || 'User';
    return {
      id: String(u?.id || u?.user_id || ''),
      name,
      full_name: u?.full_name || u?.name || name,
      email: u?.email || '',
      username: u?.username || u?.email?.split('@')[0] || name.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '-'),
      initials:
        name
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U',
    };
  }, [currentUser]);

  const currentMemberName = useMemo(() => {
    return resolvedCurrentUserObj.name;
  }, [resolvedCurrentUserObj]);

  const availableMembers = useMemo(() => {
    if (dbUsers && dbUsers.length > 0) {
      return dbUsers.map((u: any) => {
        const name = u.full_name || u.name || u.email.split('@')[0];
        const email = u.email || '';
        const username = u.username || (email ? email.split('@')[0] : '') || name.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '-');
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
          full_name: u.full_name || u.name || name,
          email,
          username,
          role: u.role || 'employee',
          initials,
        };
      });
    }

    return [];
  }, [dbUsers]);

  const selectedMentionMember = useMemo(() => {
    if (!selectedMentionFilter || selectedMentionFilter === 'all' || selectedMentionFilter === 'any') return null;
    if (selectedMentionFilter === 'me') return resolvedCurrentUserObj;
    return (
      availableMembers.find((m) => m.id === selectedMentionFilter || m.name === selectedMentionFilter) || {
        name: selectedMentionFilter,
        full_name: selectedMentionFilter,
      }
    );
  }, [selectedMentionFilter, availableMembers, resolvedCurrentUserObj]);

  const currentUserMentionCount = useMemo(() => {
    if (!boardData?.issues) return 0;
    return boardData.issues.filter((issue) => {
      if (issue.type !== 'story' && issue.type !== 'task' && issue.type !== 'bug') return false;
      return doesIssueMentionUser(issue, resolvedCurrentUserObj);
    }).length;
  }, [boardData?.issues, resolvedCurrentUserObj]);

  const epics = boardData?.epics || [];
  const stories = useMemo(() => {
    return boardData?.issues.filter((i) => i.type === 'story') || [];
  }, [boardData?.issues]);

  const filteredIssues = useMemo(() => {
    if (!boardData) return [];

    return boardData.issues.filter((issue) => {
      // In Kanban board view, show cards ONLY for story, task, and bug (not epics)
      if (issue.type !== 'story' && issue.type !== 'task' && issue.type !== 'bug') {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = issue.key.toLowerCase().includes(q);
        const matchesSummary = issue.summary.toLowerCase().includes(q);
        const matchesEpic = issue.epicName?.toLowerCase().includes(q);
        const matchesStory = issue.storyKey?.toLowerCase().includes(q) || issue.storySummary?.toLowerCase().includes(q);
        const matchesLabels = issue.labels?.some((l) => l.toLowerCase().includes(q));
        if (!matchesKey && !matchesSummary && !matchesEpic && !matchesStory && !matchesLabels) return false;
      }

      if (onlyMyIssues) {
        const myName = currentMemberName.toLowerCase();
        const match =
          issue.assignees?.some(
            (a) => a.name.toLowerCase().includes(myName) || a.email?.toLowerCase() === currentUser?.email?.toLowerCase() || a.initials === 'FT'
          ) ||
          issue.assignee?.name.toLowerCase().includes(myName) ||
          issue.assignee?.initials === 'FT';
        if (!match) return false;
      } else if (selectedAssignee) {
        const match =
          issue.assignees?.some((a) => a.name === selectedAssignee || a.id === selectedAssignee) ||
          issue.assignee?.name === selectedAssignee ||
          issue.assignee?.initials === selectedAssignee;
        if (!match) return false;
      }

      // Mention-based filtering
      if (onlyMentionedMe || selectedMentionFilter === 'me') {
        if (!doesIssueMentionUser(issue, resolvedCurrentUserObj)) {
          return false;
        }
      } else if (selectedMentionFilter === 'any') {
        if (!hasAnyMentions(issue)) {
          return false;
        }
      } else if (selectedMentionFilter && selectedMentionFilter !== 'all') {
        if (!doesIssueMentionUser(issue, selectedMentionMember)) {
          return false;
        }
      }

      if (selectedEpicId && issue.epicId !== selectedEpicId) {
        return false;
      }

      if (selectedStoryId && issue.id !== selectedStoryId && issue.storyId !== selectedStoryId) {
        return false;
      }

      if (recentlyUpdated) {
        const rawTime = (issue as any).updated_at || issue.updatedAt || (issue as any).created_at || issue.createdAt;
        const issueTime = rawTime ? new Date(rawTime).getTime() : NaN;
        const cutoff24Hours = Date.now() - 24 * 60 * 60 * 1000;
        if (isNaN(issueTime) || issueTime < cutoff24Hours) {
          return false;
        }
      }

      return true;
    });
  }, [
    boardData,
    searchQuery,
    selectedAssignee,
    onlyMyIssues,
    onlyMentionedMe,
    selectedMentionFilter,
    selectedMentionMember,
    resolvedCurrentUserObj,
    recentlyUpdated,
    selectedEpicId,
    selectedStoryId,
    currentMemberName,
    currentUser,
  ]);


  const columns: { id: FjtStatus; title: string; issues: FjtIssue[] }[] = useMemo(() => {
    const sortNewestFirst = (list: FjtIssue[]) => {
      return [...list].sort((a, b) => {
        const rawA = (a as any).updated_at || a.updatedAt || (a as any).created_at || a.createdAt;
        const rawB = (b as any).updated_at || b.updatedAt || (b as any).created_at || b.createdAt;
        const timeA = rawA ? new Date(rawA).getTime() : 0;
        const timeB = rawB ? new Date(rawB).getTime() : 0;
        if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
          return timeB - timeA;
        }
        const numA = parseInt(a.key?.split('-')?.pop() || '0', 10);
        const numB = parseInt(b.key?.split('-')?.pop() || '0', 10);
        return numB - numA;
      });
    };

    return [
      {
        id: 'to_do',
        title: 'TO DO',
        issues: sortNewestFirst(filteredIssues.filter((i) => i.status === 'to_do')),
      },
      {
        id: 'in_progress',
        title: 'IN PROGRESS',
        issues: sortNewestFirst(filteredIssues.filter((i) => i.status === 'in_progress')),
      },
      {
        id: 'done',
        title: 'DONE',
        issues: sortNewestFirst(filteredIssues.filter((i) => i.status === 'done')),
      },
    ];
  }, [filteredIssues]);

  // In mobile view: Auto-switch active tab to the column with the highest count when filtering
  useEffect(() => {
    if (columns && columns.length > 0) {
      let maxCol = columns[0];
      let maxCount = maxCol.issues.length;

      for (let i = 1; i < columns.length; i++) {
        if (columns[i].issues.length > maxCount) {
          maxCount = columns[i].issues.length;
          maxCol = columns[i];
        }
      }

      if (maxCount > 0) {
        const currentCol = columns.find((c) => c.id === mobileStatusTab);
        const isMentionFilterActive =
          onlyMentionedMe || (selectedMentionFilter && selectedMentionFilter !== 'all');

        if (
          !currentCol ||
          currentCol.issues.length === 0 ||
          (isMentionFilterActive && currentCol.issues.length < maxCount)
        ) {
          setMobileStatusTab(maxCol.id as FjtStatus);
        }
      }
    }
  }, [onlyMentionedMe, selectedMentionFilter, columns]);


  const handleStatusChange = async (issueId: string, newStatus: FjtStatus) => {
    try {
      await moveStatusMutation.mutateAsync({ issueId, status: newStatus });
    } catch (err: any) {
      toast({
        title: 'Error updating status',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData('text/plain', issueId);
    setDraggedIssueId(issueId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: FjtStatus) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData('text/plain') || draggedIssueId;
    if (!issueId) return;

    setDraggedIssueId(null);
    const targetIssue = boardData?.issues.find((i) => i.id === issueId);
    if (targetIssue && targetIssue.status !== targetStatus) {
      await handleStatusChange(issueId, targetStatus);
    }
  };

  if (isLoading) {
    return <TaskBoardSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white min-h-0 overflow-hidden">
      <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <button
                type="button"
                onClick={() => setProjectsDialogOpen(true)}
                className="text-gray-600 hover:text-blue-600 hover:underline transition-colors font-medium cursor-pointer flex items-center gap-1"
                title="View & switch projects"
              >
                <Briefcase className="h-3 w-3 text-gray-500" />
                Projects
              </button>
              <span className="text-gray-300">/</span>
              <span className="font-semibold text-gray-800">
                {activeProject.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {activeProject.name}
              </h1>
              <span className="bg-blue-50 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-md border border-blue-200/80">
                {activeProject.key}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              size="sm"
              className="bg-[#0B1957] hover:bg-[#071038] text-white font-medium text-xs gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create issue
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
          <div className="relative w-56 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search this board"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>

          <Select
            value={selectedAssignee || 'all'}
            onValueChange={(val) => {
              const newAssignee = val === 'all' ? null : val;
              setSelectedAssignee(newAssignee);
              if (newAssignee) {
                setOnlyMyIssues(false);
              }
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs bg-white border-gray-300 font-medium">
              <div className="flex items-center gap-2 truncate">
                <Users className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                <SelectValue placeholder="All Users" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white max-h-60">
              <SelectItem value="all">
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] font-bold">
                    ★
                  </div>
                  <span>All Users</span>
                </div>
              </SelectItem>
              {availableMembers.map((m) => (
                <SelectItem key={m.id || m.name} value={m.name}>
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="w-5 h-5 rounded-full bg-[#0B1957] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {m.initials}
                    </div>
                    <span className="font-medium text-gray-900">{m.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedEpicId || 'all'}
            onValueChange={(val) => {
              if (val === 'manage_epics') {
                setEditingEpicId(null);
                setEpicsDialogOpen(true);
                return;
              }
              setSelectedEpicId(val === 'all' ? null : val);
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs bg-white border-gray-300 font-medium">
              <div className="flex items-center gap-2 truncate">
                <Layers className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                <span className="truncate">
                  {selectedEpicId
                    ? epics.find((e) => e.id === selectedEpicId)?.epicName ||
                      (epics.find((e) => e.id === selectedEpicId) as any)?.name ||
                      'Selected Epic'
                    : `All Epics (${epics.length})`}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white max-h-60">
              <SelectItem value="all">
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[9px] font-bold">
                    ★
                  </div>
                  <span>All Epics</span>
                </div>
              </SelectItem>
              {epics.map((epic) => (
                <SelectItem key={epic.id} value={epic.id}>
                  <div className="flex items-center gap-2 py-0.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: epic.color }}
                    />
                    <span className="font-medium text-gray-900 truncate text-xs">
                      {epic.epicName || (epic as any).name || epic.summary}
                    </span>
                  </div>
                </SelectItem>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <SelectItem
                  value="manage_epics"
                  className="text-purple-700 font-semibold focus:bg-purple-50 focus:text-purple-800 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Manage Epics ({epics.length})...</span>
                  </div>
                </SelectItem>
              </div>
            </SelectContent>
          </Select>

          {stories.length > 0 && (
            <Select
              value={selectedStoryId || 'all'}
              onValueChange={(val) => setSelectedStoryId(val === 'all' ? null : val)}
            >
              <SelectTrigger className="h-8 w-48 text-xs bg-white border-gray-300 font-medium">
                <div className="flex items-center gap-2 truncate">
                  <IssueTypeIcon type="story" className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {selectedStoryId ? stories.find((s) => s.id === selectedStoryId)?.summary || 'Selected Story' : 'All Stories'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="all">
                  <div className="flex items-center gap-2 font-medium">
                    <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[9px] font-bold">
                      ★
                    </div>
                    <span>All Stories</span>
                  </div>
                </SelectItem>
                {stories.map((story) => (
                  <SelectItem key={story.id} value={story.id}>
                    <div className="flex items-center gap-2 py-0.5">
                      <IssueTypeIcon type="story" className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate text-xs">
                        {story.key}: {story.summary}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant={onlyMyIssues ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setOnlyMyIssues((prev) => {
                const next = !prev;
                if (next) {
                  setSelectedAssignee(null);
                }
                return next;
              });
            }}
            className={`h-8 text-xs font-medium ${
              onlyMyIssues ? 'bg-[#0B1957] text-white hover:bg-[#071038]' : 'text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Only My Issues
          </Button>

          {/* Mentioned Me Quick Filter Toggle */}
          <Button
            variant={onlyMentionedMe || selectedMentionFilter === 'me' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setOnlyMentionedMe((prev) => {
                const next = !prev;
                if (next) {
                  setSelectedMentionFilter('me');
                } else {
                  setSelectedMentionFilter(null);
                }
                return next;
              });
            }}
            className={`h-8 text-xs font-semibold gap-1.5 transition-all shadow-2xs ${
              onlyMentionedMe || selectedMentionFilter === 'me'
                ? 'bg-[#0B1957] text-white hover:bg-[#071038] border-[#0B1957] shadow-sm'
                : 'text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
            title="Show all issues where you are mentioned in description or comments"
          >
            <AtSign className="h-3.5 w-3.5" />
            <span>Mentioned Me</span>
            {currentUserMentionCount > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  onlyMentionedMe || selectedMentionFilter === 'me'
                    ? 'bg-white text-[#0B1957]'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {currentUserMentionCount}
              </span>
            )}
          </Button>

          {/* Mentions Dropdown Select */}
          <Select
            value={selectedMentionFilter || 'all'}
            onValueChange={(val) => {
              if (val === 'all') {
                setSelectedMentionFilter(null);
                setOnlyMentionedMe(false);
              } else if (val === 'me') {
                setSelectedMentionFilter('me');
                setOnlyMentionedMe(true);
              } else {
                setSelectedMentionFilter(val);
                setOnlyMentionedMe(false);
              }
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs bg-white border-gray-300 font-medium">
              <div className="flex items-center gap-1.5 truncate">
                <AtSign className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                <span className="truncate">
                  {selectedMentionFilter === 'me'
                    ? `Mentioned: Me`
                    : selectedMentionFilter === 'any'
                    ? 'Any Mentions'
                    : selectedMentionMember
                    ? selectedMentionMember.name
                    : 'All Mentions'}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white max-h-60">
              <SelectItem value="all">
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] font-bold">
                    ★
                  </div>
                  <span>All Mentions (No Filter)</span>
                </div>
              </SelectItem>
              <SelectItem value="me">
                <div className="flex items-center gap-2 py-0.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    @
                  </div>
                  <span className="font-semibold text-blue-900">
                    Mentioned Me ({currentUserMentionCount})
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="any">
                <div className="flex items-center gap-2 py-0.5">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    @
                  </div>
                  <span className="font-medium text-gray-800">Any Mentioned Issue</span>
                </div>
              </SelectItem>
              {availableMembers.map((m) => (
                <SelectItem key={m.id || m.name} value={m.id || m.name}>
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="w-5 h-5 rounded-full bg-[#0B1957] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {m.initials}
                    </div>
                    <span className="font-medium text-gray-900">{m.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>


          <Button
            variant={recentlyUpdated ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRecentlyUpdated((prev) => !prev)}
            className={`h-8 text-xs font-medium ${
              recentlyUpdated ? 'bg-[#0B1957] text-white hover:bg-[#071038]' : 'text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Recently Updated
          </Button>

          {(selectedAssignee || selectedEpicId || selectedStoryId || onlyMyIssues || onlyMentionedMe || selectedMentionFilter || recentlyUpdated || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAssignee(null);
                setSelectedEpicId(null);
                setSelectedStoryId(null);
                setOnlyMyIssues(false);
                setOnlyMentionedMe(false);
                setSelectedMentionFilter(null);
                setRecentlyUpdated(false);
                setSearchQuery('');
              }}
              className="h-8 text-xs text-gray-500 hover:text-gray-900"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>


      {(!boardData?.projects || boardData.projects.length === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-50/40 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0B1957] flex items-center justify-center mb-4 shadow-sm">
            <Briefcase className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">No projects yet</h2>
          <p className="text-xs text-gray-500 max-w-md mb-6">
            Get started by creating your first project workspace to track issues, stories, and tasks.
          </p>
          <Button
            onClick={() => setProjectsDialogOpen(true)}
            className="bg-[#0B1957] hover:bg-[#071038] text-white text-xs font-semibold px-5 h-9 shadow-md gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-gray-50/40 min-h-0 overflow-hidden">
          {/* Mobile Status Tabs (Only visible in mobile mode) */}
          <div className="md:hidden px-3 pt-2.5 pb-2 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              {columns.map((col) => {
                const isActive = mobileStatusTab === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setMobileStatusTab(col.id as FjtStatus)}
                    className={`flex-1 py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-[#0B1957] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>{col.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {col.issues.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Single Column View */}
          <div className="block md:hidden flex-1 p-2.5 sm:p-3 min-h-0 flex flex-col overflow-hidden">
            {(() => {
              const activeCol = columns.find((c) => c.id === mobileStatusTab) || columns[0];
              return (
                <div className="flex-1 flex flex-col bg-gray-100/70 rounded-xl p-2.5 sm:p-3 border border-gray-200/80 min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60 px-1 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs text-gray-700 tracking-wider uppercase">
                        {activeCol.title}
                      </h3>
                      <span className="bg-[#0B1957] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {activeCol.issues.length} {activeCol.issues.length === 1 ? 'issue' : 'issues'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5 pb-6 custom-scrollbar min-h-0">
                    {activeCol.issues.map((issue) => (
                      <div key={issue.id} className="w-full">
                        <IssueCard
                          issue={issue}
                          onStatusChange={handleStatusChange}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onClick={(item) => setDetailIssue(item)}
                          timeSpent={issueTimeSpentMap[issue.id] || '0h 00m'}
                          onOpenTimeTracking={(item) => setTimeTrackingIssue(item)}
                        />
                      </div>
                    ))}

                    {activeCol.issues.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">
                        No issues in {activeCol.title}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Desktop 3-Column Kanban Board */}
          <div className="hidden md:block flex-1 p-6 overflow-x-auto min-h-0">
            <div className="grid grid-cols-3 gap-6 h-full min-w-[768px]">
              {columns.map((col) => (
                <div
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="flex flex-col bg-gray-100/70 rounded-lg p-3 border border-gray-200/80 h-full min-h-0 overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-200/60 px-1 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs text-gray-700 tracking-wider uppercase">
                        {col.title}
                      </h3>
                      <span className="bg-gray-200/90 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {col.issues.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto pr-1.5 pb-6 custom-scrollbar min-h-0">
                    {col.issues.map((issue) => (
                      <div
                        key={issue.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, issue.id)}
                        className="transition-transform active:scale-[0.98]"
                      >
                        <IssueCard
                          issue={issue}
                          onStatusChange={handleStatusChange}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onClick={(item) => setDetailIssue(item)}
                          timeSpent={issueTimeSpentMap[issue.id] || '0h 00m'}
                          onOpenTimeTracking={(item) => setTimeTrackingIssue(item)}
                        />
                      </div>
                    ))}

                    {col.issues.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-gray-200 rounded-md flex items-center justify-center text-xs text-gray-400">
                        No issues in {col.title}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <CreateIssueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType="story"
      />

      <ProjectsManagementDialog
        open={projectsDialogOpen}
        onOpenChange={setProjectsDialogOpen}
      />

      <EpicsManagementDialog
        open={epicsDialogOpen}
        onOpenChange={setEpicsDialogOpen}
        initialEditingEpicId={editingEpicId}
      />

      {/* Issue Details Modal */}
      <IssueDetailDialog
        issue={detailIssue}
        open={!!detailIssue}
        onOpenChange={(open) => !open && setDetailIssue(null)}
      />

      {/* Time Tracking Analysis Modal */}
      <IssueTimeTrackingDialog
        issue={timeTrackingIssue}
        open={Boolean(timeTrackingIssue)}
        onOpenChange={(open) => !open && setTimeTrackingIssue(null)}
        allTimesheetEntries={timeEntries}
        activeTimesheetEntry={combinedActiveEntries}
      />
    </div>
  );
};

