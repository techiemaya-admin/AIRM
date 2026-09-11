import React, { useState, useMemo } from 'react';
import {
  useFjtBoardData,
  useMoveFjtIssueStatus,
  useDeleteFjtIssue,
  FjtStatus,
  FjtIssue,
} from '@/sdk/features/fjt-board';
import { IssueCard, IssueTypeIcon } from './IssueCard';
import { CreateIssueDialog } from './CreateIssueDialog';
import { IssueDetailDialog } from './IssueDetailDialog';
import { ProjectsManagementDialog } from './ProjectsManagementDialog';
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
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from '@/hooks/use-toast';

export const ActiveBoardView: React.FC = () => {
  const { data: boardData, isLoading } = useFjtBoardData();
  const moveStatusMutation = useMoveFjtIssueStatus();
  const deleteMutation = useDeleteFjtIssue();
  const { data: dbUsers = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
  const [detailIssue, setDetailIssue] = useState<FjtIssue | null>(null);
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [mobileStatusTab, setMobileStatusTab] = useState<FjtStatus>('to_do');

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

  const currentMemberName = useMemo(() => {
    let localUser: any = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) localUser = JSON.parse(raw);
    } catch {}
    const u = currentUser || localUser;
    return u?.full_name || u?.name || u?.email?.split('@')[0] || 'User';
  }, [currentUser]);

  const availableMembers = useMemo(() => {
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

  const epics = boardData?.epics || [];
  const stories = useMemo(() => {
    return boardData?.issues.filter((i) => i.type === 'story') || [];
  }, [boardData?.issues]);

  const filteredIssues = useMemo(() => {
    if (!boardData) return [];

    return boardData.issues.filter((issue) => {
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
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
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

          {epics.length > 0 && (
            <Select
              value={selectedEpicId || 'all'}
              onValueChange={(val) => setSelectedEpicId(val === 'all' ? null : val)}
            >
              <SelectTrigger className="h-8 w-44 text-xs bg-white border-gray-300 font-medium">
                <div className="flex items-center gap-2 truncate">
                  <Layers className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                  <span className="truncate">
                    {selectedEpicId ? (epics.find((e) => e.id === selectedEpicId)?.epicName || (epics.find((e) => e.id === selectedEpicId) as any)?.name || 'Selected Epic') : 'All Epics'}
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
              </SelectContent>
            </Select>
          )}

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

          {(selectedAssignee || selectedEpicId || selectedStoryId || onlyMyIssues || recentlyUpdated || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAssignee(null);
                setSelectedEpicId(null);
                setSelectedStoryId(null);
                setOnlyMyIssues(false);
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
        defaultType="task"
      />

      <ProjectsManagementDialog
        open={projectsDialogOpen}
        onOpenChange={setProjectsDialogOpen}
      />

      {/* Issue Details Modal */}
      <IssueDetailDialog
        issue={detailIssue}
        open={!!detailIssue}
        onOpenChange={(open) => !open && setDetailIssue(null)}
      />
    </div>
  );
};
