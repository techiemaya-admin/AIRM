import React, { useState, useMemo } from 'react';
import {
  useFjtBoardData,
  useDeleteFjtIssue,
  FjtIssue,
  FjtIssueType,
} from '@/sdk/features/fjt-board';
import { IssueTypeIcon, PriorityIcon, getDueWarning } from './IssueCard';
import { CreateIssueDialog } from './CreateIssueDialog';
import { IssueDetailDialog } from './IssueDetailDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  Search,
  Bookmark,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export const BacklogView: React.FC = () => {
  const { data: boardData, isLoading } = useFjtBoardData();
  const deleteMutation = useDeleteFjtIssue();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpicFilter, setSelectedEpicFilter] = useState<string | null>(null);
  const [showEpicsPanel, setShowEpicsPanel] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<FjtIssueType>('story');
  const [createDialogEpicId, setCreateDialogEpicId] = useState<string | undefined>(undefined);
  const [createDialogStoryId, setCreateDialogStoryId] = useState<string | undefined>(undefined);
  const [detailIssue, setDetailIssue] = useState<FjtIssue | null>(null);
  const [expandedStories, setExpandedStories] = useState<Record<string, boolean>>({});

  const toggleStoryExpand = (storyId: string) => {
    setExpandedStories((prev) => ({
      ...prev,
      [storyId]: prev[storyId] === undefined ? false : !prev[storyId],
    }));
  };

  const isStoryExpanded = (storyId: string) => {
    return expandedStories[storyId] !== false; // Default expanded
  };

  const epics = useMemo(() => {
    return boardData?.epics || [];
  }, [boardData?.epics]);

  const unassignedStoriesCount = useMemo(() => {
    return boardData?.issues?.filter((i) => i.type === 'story' && !i.epicId).length || 0;
  }, [boardData?.issues]);

  // Stories
  const stories = useMemo(() => {
    if (!boardData?.issues) return [];
    return boardData.issues.filter((i) => {
      if (i.type !== 'story') return false;
      if (selectedEpicFilter === 'none') {
        if (i.epicId) return false;
      } else if (selectedEpicFilter && i.epicId !== selectedEpicFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          i.key.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.epicName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [boardData?.issues, selectedEpicFilter, searchQuery]);

  // Tasks and Bugs grouped by parent storyId
  const tasksAndBugsByStory = useMemo(() => {
    const map: Record<string, FjtIssue[]> = {};
    if (!boardData?.issues) return map;

    boardData.issues.forEach((issue) => {
      if (issue.type === 'task' || issue.type === 'bug') {
        const key = issue.storyId || 'standalone';
        if (!map[key]) map[key] = [];
        map[key].push(issue);
      }
    });

    return map;
  }, [boardData?.issues]);

  const standaloneTasksAndBugs = useMemo(() => {
    return tasksAndBugsByStory['standalone'] || [];
  }, [tasksAndBugsByStory]);

  const handleOpenCreateForStory = (story: FjtIssue, type: FjtIssueType = 'task') => {
    setCreateDialogType(type);
    setCreateDialogStoryId(story.id);
    setCreateDialogEpicId(story.epicId);
    setCreateDialogOpen(true);
  };

  const handleOpenCreateEpic = () => {
    setCreateDialogType('epic');
    setCreateDialogEpicId(undefined);
    setCreateDialogStoryId(undefined);
    setCreateDialogOpen(true);
  };

  const handleOpenCreateStory = (epicId?: string) => {
    setCreateDialogType('story');
    setCreateDialogEpicId(epicId);
    setCreateDialogStoryId(undefined);
    setCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-white">
      {/* Mobile Epics Filter Bar (Horizontal scroll on mobile) */}
      <div className="md:hidden border-b border-gray-200 bg-gray-50/80 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-purple-600" />
            Filter by Epic
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          <button
            onClick={() => setSelectedEpicFilter(null)}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-xs flex-shrink-0 ${
              selectedEpicFilter === null
                ? 'bg-[#0B1957] text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Epics ({boardData?.issues?.filter((i) => i.type === 'story').length || 0})
          </button>
          <button
            onClick={() => setSelectedEpicFilter(selectedEpicFilter === 'none' ? null : 'none')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-xs flex-shrink-0 ${
              selectedEpicFilter === 'none'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            No Epic ({unassignedStoriesCount})
          </button>
          {epics.map((epic) => {
            const count = boardData?.issues.filter((i) => i.epicId === epic.id).length || 0;
            const isSelected = selectedEpicFilter === epic.id;
            return (
              <button
                key={epic.id}
                onClick={() => setSelectedEpicFilter(isSelected ? null : epic.id)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-xs flex-shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isSelected ? '#ffffff' : epic.color }}
                />
                <span>{epic.epicName || (epic as any).name || epic.summary}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Epics Left Sidebar (Collapsible) */}
      <div
        className={`hidden md:flex ${
          showEpicsPanel ? 'w-72' : 'w-10'
        } border-r border-gray-200 bg-gray-50/50 transition-all flex-col flex-shrink-0`}
      >
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          {showEpicsPanel ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-purple-600" />
                Epics
              </span>
              <button
                onClick={() => setShowEpicsPanel(false)}
                className="text-gray-400 hover:text-gray-600 text-xs p-1"
                title="Collapse Epics panel"
              >
                Hide
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowEpicsPanel(true)}
              className="mx-auto text-gray-500 hover:text-gray-900"
              title="Expand Epics"
            >
              <Layers className="h-4 w-4 text-purple-600" />
            </button>
          )}
        </div>

        {showEpicsPanel && (
          <div className="p-3 space-y-2 overflow-y-auto flex-1 text-xs custom-scrollbar">
            <button
              onClick={() => setSelectedEpicFilter(null)}
              className={`w-full text-left px-3 py-2 rounded-md font-semibold transition-colors flex items-center justify-between ${
                selectedEpicFilter === null ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span>All Epics</span>
              <span className="text-[11px] bg-white/70 px-1.5 py-0.5 rounded text-gray-600">
                {boardData?.issues?.filter((i) => i.type === 'story').length || 0} stories
              </span>
            </button>

            <button
              onClick={() => setSelectedEpicFilter(selectedEpicFilter === 'none' ? null : 'none')}
              className={`w-full text-left px-3 py-2 rounded-md font-semibold transition-colors flex items-center justify-between ${
                selectedEpicFilter === 'none' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span className="truncate">Issues without Epic</span>
              <span className="text-[11px] bg-white/70 px-1.5 py-0.5 rounded text-gray-600">
                {unassignedStoriesCount}
              </span>
            </button>

            {epics.map((epic) => {
              const count = boardData?.issues.filter((i) => i.epicId === epic.id).length || 0;
              const isSelected = selectedEpicFilter === epic.id;
              return (
                <div
                  key={epic.id}
                  onClick={() => setSelectedEpicFilter(isSelected ? null : epic.id)}
                  className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 truncate text-xs" style={{ color: epic.color }}>
                      {epic.epicName || (epic as any).name || epic.summary}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] bg-gray-100 font-semibold px-1.5 py-0.5 rounded text-gray-600">
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                    <span className="font-mono font-semibold">{epic.key}</span>
                    <span className="capitalize">{epic.status.replace('_', ' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Hierarchy & Backlog Area */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50/30">
        {/* Top Filter Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-gray-200 flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-full sm:max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search backlog stories, tasks, bugs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-gray-50 border-gray-200 focus:bg-white w-full"
              />
            </div>
          </div>
        </div>

        {/* Stories & Nested Tasks / Bugs Container */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Project Hierarchy: Stories & Tasks
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Epics ➔ Stories ➔ Tasks & Bugs
              </p>
            </div>
            <span className="text-[11px] sm:text-xs text-gray-500 font-medium">
              {stories.length} User {stories.length === 1 ? 'Story' : 'Stories'}
            </span>
          </div>

          {/* Stories Accordion List */}
          <div className="space-y-3 sm:space-y-4">
            {stories.map((story) => {
              const childItems = tasksAndBugsByStory[story.id] || [];
              const expanded = isStoryExpanded(story.id);

              return (
                <div
                  key={story.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden transition-all"
                >
                  {/* Story Header Row */}
                  <div
                    onClick={() => toggleStoryExpand(story.id)}
                    className="p-3 sm:p-3.5 bg-gray-50/70 hover:bg-gray-100/70 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer transition-colors border-b border-gray-200"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStoryExpand(story.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 flex-shrink-0"
                      >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      <IssueTypeIcon type="story" className="h-4 w-4 flex-shrink-0" />
                      <span className="font-bold text-gray-900 text-xs font-mono whitespace-nowrap flex-shrink-0">
                        {story.key}
                      </span>
                      <p className="font-semibold text-xs text-gray-900 truncate min-w-0 hover:text-blue-600 transition-colors">
                        {story.summary}
                      </p>

                      {story.epicName ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded uppercase flex-shrink-0 truncate max-w-[120px] sm:max-w-[200px]"
                          style={{
                            backgroundColor: `${story.epicColor || '#ea580c'}18`,
                            color: story.epicColor || '#ea580c',
                            border: `1px solid ${story.epicColor || '#ea580c'}33`,
                          }}
                          title={`Epic: ${story.epicName}`}
                        >
                          {story.epicName}
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0"
                          title="No Parent Epic"
                        >
                          No Epic
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-1.5 sm:gap-2.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Boolean(story.storyPoints && Number(story.storyPoints) > 0) && (
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap flex-shrink-0">
                            {story.storyPoints} pts
                          </span>
                        )}
                        {(() => {
                          const storyDue = getDueWarning(story.endDate, story.status);
                          return storyDue ? (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 hidden sm:flex whitespace-nowrap flex-shrink-0 ${storyDue.className}`}
                              title={`End Date: ${story.endDate}`}
                            >
                              {storyDue.isOverdue ? (
                                <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 text-red-600" />
                              ) : (
                                <Clock className="h-2.5 w-2.5 flex-shrink-0 text-amber-600" />
                              )}
                              <span>{storyDue.text}</span>
                            </span>
                          ) : story.startDate && story.endDate ? (
                            <span className="text-[11px] text-gray-500 flex items-center gap-1 hidden sm:flex whitespace-nowrap flex-shrink-0">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              {story.startDate} → {story.endDate}
                            </span>
                          ) : null;
                        })()}
                        <span className="text-xs px-2 py-0.5 rounded-md font-semibold uppercase bg-gray-200 text-gray-800 text-[10px] whitespace-nowrap flex-shrink-0">
                          {story.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5 ml-auto md:ml-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailIssue(story)}
                          className="h-6.5 sm:h-7 px-2 text-[11px] sm:text-xs text-blue-600 hover:bg-blue-50 whitespace-nowrap flex-shrink-0"
                        >
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCreateForStory(story, 'task')}
                          className="h-6.5 sm:h-7 px-2 text-[11px] sm:text-xs text-blue-700 border-blue-200 hover:bg-blue-50 gap-1 whitespace-nowrap flex-shrink-0"
                        >
                          <Plus className="h-3 w-3" />
                          <span className="hidden sm:inline">Add</span> Task
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCreateForStory(story, 'bug')}
                          className="h-6.5 sm:h-7 px-2 text-[11px] sm:text-xs text-gray-700 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:bg-red-100 gap-1 whitespace-nowrap flex-shrink-0 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          <span className="hidden sm:inline">Add</span> Bug
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Nested Tasks & Bugs for this Story */}
                  {expanded && (
                    <div className="divide-y divide-gray-100 bg-white">
                      {childItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setDetailIssue(item)}
                          className="pl-6 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 hover:bg-blue-50/40 flex items-center justify-between gap-2 text-xs transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                            <IssueTypeIcon type={item.type} className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-semibold text-gray-700 font-mono text-[11px] whitespace-nowrap flex-shrink-0">
                              {item.key}
                            </span>
                            <p className="text-gray-900 font-medium truncate min-w-0 group-hover:text-blue-600 transition-colors text-xs">
                              {item.summary}
                            </p>
                            {item.linkedTaskKey && (
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap flex-shrink-0 hidden sm:inline"
                                title={`Tagged to Task: ${item.linkedTaskKey}`}
                              >
                                Task: {item.linkedTaskKey}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            {Boolean(item.storyPoints && Number(item.storyPoints) > 0) && (
                              <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                                {item.storyPoints}pt
                              </span>
                            )}
                            {(() => {
                              const itemDue = getDueWarning(item.endDate, item.status);
                              return itemDue ? (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 hidden sm:flex whitespace-nowrap flex-shrink-0 ${itemDue.className}`}
                                  title={`End Date: ${item.endDate}`}
                                >
                                  {itemDue.isOverdue ? (
                                    <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 text-red-600" />
                                  ) : (
                                    <Clock className="h-2.5 w-2.5 flex-shrink-0 text-amber-600" />
                                  )}
                                  <span>{itemDue.text}</span>
                                </span>
                              ) : item.startDate && item.endDate ? (
                                <span className="text-[10px] text-gray-400 hidden md:inline whitespace-nowrap flex-shrink-0">
                                  {item.startDate} to {item.endDate}
                                </span>
                              ) : null;
                            })()}
                            <PriorityIcon priority={item.priority} />
                            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold uppercase bg-gray-100 text-gray-600 whitespace-nowrap flex-shrink-0">
                              {item.status.replace('_', ' ')}
                            </span>
                            {item.assignee && (
                              <div
                                className="w-5 h-5 rounded-full bg-[#0B1957] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                title={item.assignee.name}
                              >
                                {item.assignee.initials}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {childItems.length === 0 && (
                        <div className="pl-6 sm:pl-10 py-3 text-xs text-gray-400 italic flex items-center gap-2">
                          <span>No tasks or bugs under this story yet.</span>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateForStory(story, 'task')}
                            className="text-blue-600 hover:underline font-semibold text-xs"
                          >
                            + Add a task
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {stories.length === 0 && (
              <div className="p-8 sm:p-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-white">
                <Bookmark className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No Stories Found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start by creating an issue inside an Epic.
                </p>
              </div>
            )}
          </div>

          {/* Standalone Tasks & Bugs (Unlinked) */}
          {standaloneTasksAndBugs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden mt-4 sm:mt-6">
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                  Standalone / Unlinked Issues ({standaloneTasksAndBugs.length})
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {standaloneTasksAndBugs.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setDetailIssue(item)}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 flex items-center justify-between gap-2 sm:gap-3 text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <IssueTypeIcon type={item.type} />
                      <span className="font-semibold text-gray-700 font-mono text-[11px]">{item.key}</span>
                      <p className="text-gray-900 font-medium truncate group-hover:text-blue-600 transition-colors">
                        {item.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      {(() => {
                        const itemDue = getDueWarning(item.endDate, item.status);
                        return itemDue ? (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 hidden sm:flex whitespace-nowrap flex-shrink-0 ${itemDue.className}`}
                            title={`End Date: ${item.endDate}`}
                          >
                            {itemDue.isOverdue ? (
                              <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 text-red-600" />
                            ) : (
                              <Clock className="h-2.5 w-2.5 flex-shrink-0 text-amber-600" />
                            )}
                            <span>{itemDue.text}</span>
                          </span>
                        ) : null;
                      })()}
                      <PriorityIcon priority={item.priority} />
                      <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold uppercase bg-gray-100 text-gray-600">
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Issue Dialog */}
      <CreateIssueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType={createDialogType}
        defaultEpicId={createDialogEpicId}
        defaultStoryId={createDialogStoryId}
      />

      {/* Issue Detail Dialog */}
      <IssueDetailDialog
        issue={detailIssue}
        open={!!detailIssue}
        onOpenChange={(isOpen) => !isOpen && setDetailIssue(null)}
      />
    </div>
  );
};
