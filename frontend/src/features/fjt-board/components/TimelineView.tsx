import React, { useState, useMemo } from 'react';
import { useFjtBoardData, FjtIssue } from '@/sdk/features/fjt-board';
import { IssueTypeIcon } from './IssueCard';
import { ChevronRight, ChevronDown, Plus, Layers, CornerDownRight, Bookmark, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateIssueDialog } from './CreateIssueDialog';
import { IssueDetailDialog } from './IssueDetailDialog';

export const TimelineView: React.FC = () => {
  const { data: boardData, isLoading } = useFjtBoardData();
  // Epics default to expanded (undefined => true)
  const [collapsedEpics, setCollapsedEpics] = useState<Record<string, boolean>>({});
  // Stories default to expanded (undefined => true)
  const [collapsedStories, setCollapsedStories] = useState<Record<string, boolean>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailIssue, setDetailIssue] = useState<FjtIssue | null>(null);

  const toggleEpic = (epicId: string) => {
    setCollapsedEpics((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const toggleStory = (storyId: string) => {
    setCollapsedStories((prev) => ({ ...prev, [storyId]: !prev[storyId] }));
  };

  // Real-time Dynamic Month Range Calculation
  const { dynamicMonths, timelineStartMs, timelineEndMs, totalDurationMs, todayLeftPct } = useMemo(() => {
    const now = new Date();
    const timestamps: number[] = [now.getTime()];

    boardData?.issues?.forEach((issue) => {
      if (issue.startDate) {
        const t = new Date(issue.startDate).getTime();
        if (!isNaN(t)) timestamps.push(t);
      }
      if (issue.endDate) {
        const t = new Date(issue.endDate).getTime();
        if (!isNaN(t)) timestamps.push(t);
      }
    });

    const minTs = Math.min(...timestamps);
    const startDateObj = new Date(minTs);
    
    // Choose start month: min of earliest activity and current month
    let startYear = startDateObj.getFullYear();
    let startMonth = startDateObj.getMonth();

    // Default 4 months displayed
    const monthCount = 4;
    const monthsList: { name: string; isCurrent: boolean; startMs: number; endMs: number }[] = [];

    for (let i = 0; i < monthCount; i++) {
      const mDate = new Date(startYear, startMonth + i, 1);
      const nextMDate = new Date(startYear, startMonth + i + 1, 1);
      const isCurrent =
        mDate.getFullYear() === now.getFullYear() && mDate.getMonth() === now.getMonth();
      
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(mDate);
      monthsList.push({
        name: monthName,
        isCurrent,
        startMs: mDate.getTime(),
        endMs: nextMDate.getTime() - 1,
      });
    }

    const tStart = monthsList[0].startMs;
    const tEnd = monthsList[monthsList.length - 1].endMs;
    const tDuration = Math.max(1, tEnd - tStart);
    const tTodayLeft = ((now.getTime() - tStart) / tDuration) * 100;

    return {
      dynamicMonths: monthsList,
      timelineStartMs: tStart,
      timelineEndMs: tEnd,
      totalDurationMs: tDuration,
      todayLeftPct: Math.max(0, Math.min(100, tTodayLeft)),
    };
  }, [boardData]);

  // Gantt Bar Position Helper for Stories / Tasks / Bugs
  const getBarStyle = (
    item: { startDate?: string; endDate?: string; status: string; createdAt?: string },
    staggerIdx: number = 0
  ) => {
    const now = new Date();
    let start: number;
    let end: number;

    if (item.startDate || item.endDate) {
      start = item.startDate ? new Date(item.startDate).getTime() : now.getTime();
      end = item.endDate ? new Date(item.endDate).getTime() : start + 7 * 86400000;
    } else {
      // Default: stagger relative to creation or today
      const base = item.createdAt ? new Date(item.createdAt).getTime() : now.getTime();
      start = base + (staggerIdx % 5) * 2 * 86400000;
      end = start + 7 * 86400000;
    }

    if (start < timelineStartMs) start = timelineStartMs;
    if (end > timelineEndMs) end = timelineEndMs;
    if (end <= start) end = start + 3 * 86400000;

    const leftPct = Math.max(1, Math.min(88, ((start - timelineStartMs) / totalDurationMs) * 100));
    const widthPct = Math.max(8, Math.min(98 - leftPct, ((end - start) / totalDurationMs) * 100));

    return {
      marginLeft: `${leftPct}%`,
      width: `${widthPct}%`,
    };
  };

  // Gantt Bar Position for Epics (Encompasses child tasks or active duration)
  const getEpicBarStyle = (epic: any, childIssues: FjtIssue[], idx: number) => {
    const now = new Date();
    const childDates: number[] = [];

    childIssues.forEach((c) => {
      if (c.startDate) {
        const t = new Date(c.startDate).getTime();
        if (!isNaN(t)) childDates.push(t);
      }
      if (c.endDate) {
        const t = new Date(c.endDate).getTime();
        if (!isNaN(t)) childDates.push(t);
      }
    });

    let start: number;
    let end: number;

    if (childDates.length > 0) {
      start = Math.min(...childDates);
      end = Math.max(...childDates);
      if (end <= start) end = start + 14 * 86400000;
    } else {
      start = now.getTime() + idx * 4 * 86400000;
      end = start + 28 * 86400000;
    }

    if (start < timelineStartMs) start = timelineStartMs;
    if (end > timelineEndMs) end = timelineEndMs;
    if (end <= start) end = start + 7 * 86400000;

    const leftPct = Math.max(1, Math.min(85, ((start - timelineStartMs) / totalDurationMs) * 100));
    const widthPct = Math.max(12, Math.min(98 - leftPct, ((end - start) / totalDurationMs) * 100));

    return {
      marginLeft: `${leftPct}%`,
      width: `${widthPct}%`,
    };
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Stories not assigned to any Epic
  const unassignedStories =
    boardData?.issues.filter((i) => i.type === 'story' && !i.epicId) || [];

  // Truly standalone tasks & bugs (not linked to any Epic AND not linked to any Story)
  const standaloneTasksAndBugs =
    boardData?.issues.filter((i) => {
      if (i.type !== 'task' && i.type !== 'bug') return false;
      return !i.epicId && !i.storyId;
    }) || [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Bar */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold text-gray-900">Timeline & Roadmap</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Clock className="h-3 w-3 text-blue-600" />
              Real-time Active View
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
            Visualize Epics, Story deliverables, and Task milestones dynamically mapped across actual dates.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          size="sm"
          className="bg-[#0B1957] hover:bg-[#071038] text-white text-xs font-semibold gap-1 sm:gap-1.5 flex-shrink-0 h-8 px-2.5 sm:px-3"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Create</span> Epic
        </Button>
      </div>

      {/* Timeline Grid Container */}
      <div className="flex-1 overflow-auto p-2 sm:p-6 bg-gray-50/50">
        <div className="min-w-[700px] sm:min-w-[900px] bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
          {/* Header Months */}
          <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 relative">
            <div className="w-48 sm:w-72 flex-shrink-0 p-2.5 sm:p-3 border-r border-gray-200 sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
              Work Item
            </div>
            <div
              className="flex-1 min-w-[450px] sm:min-w-[600px] relative"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${dynamicMonths.length}, minmax(0, 1fr))`,
              }}
            >
              {dynamicMonths.map((m) => (
                <div
                  key={m.name}
                  className={`p-2.5 sm:p-3 text-center border-r border-gray-200 last:border-r-0 truncate text-[11px] sm:text-xs ${
                    m.isCurrent ? 'bg-blue-50/80 text-blue-900 font-bold' : 'text-gray-600 bg-gray-50'
                  }`}
                >
                  {m.name}
                  {m.isCurrent && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[9px] bg-blue-600 text-white rounded font-medium">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Epics List and Gantt Bars */}
          <div className="divide-y divide-gray-100">
            {boardData?.epics.map((epic, idx) => {
              // Direct stories under this epic
              const stories = boardData.issues.filter((i) => i.epicId === epic.id && i.type === 'story');
              // Direct tasks & bugs under this epic without story
              const directTasksAndBugs = boardData.issues.filter(
                (i) => i.epicId === epic.id && (i.type === 'task' || i.type === 'bug') && !i.storyId
              );

              // All tasks & bugs linked to this epic (directly or through a story)
              const allChildTasksAndBugs = boardData.issues.filter((i) => {
                if (i.type !== 'task' && i.type !== 'bug') return false;
                if (i.epicId === epic.id) return true;
                const parentStory = boardData.issues.find((s) => s.id === i.storyId);
                return parentStory?.epicId === epic.id;
              });

              const isEpicExpanded = !collapsedEpics[epic.id];
              const completedCount = allChildTasksAndBugs.filter((i) => i.status === 'done').length;
              const totalItems = allChildTasksAndBugs.length;
              const progressPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

              return (
                <div key={epic.id} className="text-xs">
                  {/* Epic Row */}
                  <div className="flex items-center hover:bg-gray-50/80 transition-colors bg-white">
                    <div className="w-48 sm:w-72 flex-shrink-0 p-2 sm:p-3 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <button
                        type="button"
                        onClick={() => toggleEpic(epic.id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 flex-shrink-0 cursor-pointer"
                        title={isEpicExpanded ? 'Collapse Epic' : 'Expand Epic'}
                      >
                        {isEpicExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700" />
                        )}
                      </button>
                      <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                      <span className="font-bold text-gray-900 truncate text-[11px] sm:text-xs">
                        {epic.epicName || (epic as any).name || epic.summary}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">({epic.key})</span>
                    </div>

                    {/* Gantt Bar Area */}
                    <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-2 sm:p-3 relative flex items-center">
                      <div
                        className="h-5 sm:h-6 rounded-md shadow-xs flex items-center px-2 sm:px-3 text-white text-[10px] sm:text-[11px] font-bold truncate transition-all"
                        style={{
                          backgroundColor: epic.color,
                          ...getEpicBarStyle(epic, allChildTasksAndBugs, idx),
                        }}
                      >
                        <span className="truncate">{epic.epicName || (epic as any).name || epic.summary}</span>
                        <span className="ml-auto text-[9px] sm:text-[10px] font-medium opacity-90 flex-shrink-0 pl-1">
                          {progressPct}% ({completedCount}/{totalItems} done)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Stories & Their Tasks/Bugs */}
                  {isEpicExpanded && (
                    <div>
                      {/* 1. Stories */}
                      {stories.map((story, sIdx) => {
                        const storyTasksAndBugs = boardData.issues.filter(
                          (i) => (i.type === 'task' || i.type === 'bug') && i.storyId === story.id
                        );
                        const isStoryExpanded = !collapsedStories[story.id];

                        return (
                          <div key={story.id} className="border-t border-gray-100/80">
                            {/* Story Row */}
                            <div className="flex items-center bg-gray-50/50 hover:bg-gray-100/60 transition-colors">
                              <div className="w-48 sm:w-72 flex-shrink-0 p-2 sm:p-2.5 pl-6 sm:pl-8 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                {storyTasksAndBugs.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleStory(story.id)}
                                    className="p-0.5 hover:bg-gray-200 rounded text-gray-500 flex-shrink-0 cursor-pointer"
                                    title={isStoryExpanded ? 'Collapse Story' : 'Expand Story'}
                                  >
                                    {isStoryExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-gray-700" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-gray-700" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-3.5 flex-shrink-0" />
                                )}
                                <IssueTypeIcon type="story" className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="font-semibold text-emerald-800 font-mono text-[10px] sm:text-[11px] flex-shrink-0">
                                  {story.key}
                                </span>
                                <span
                                  onClick={() => setDetailIssue(story)}
                                  className="text-gray-900 truncate font-medium cursor-pointer hover:text-blue-600 text-[11px] sm:text-xs"
                                >
                                  {story.summary}
                                </span>
                                {storyTasksAndBugs.length > 0 && (
                                  <span className="text-[9px] sm:text-[10px] bg-gray-200/80 text-gray-600 px-1 py-0.2 rounded font-semibold ml-auto flex-shrink-0">
                                    {storyTasksAndBugs.length}
                                  </span>
                                )}
                              </div>

                              {/* Story Timeline Bar */}
                              <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-2 sm:p-2.5 flex items-center">
                                <div
                                  className={`h-4.5 rounded px-2 text-[10px] font-semibold flex items-center gap-1.5 shadow-2xs truncate transition-all cursor-pointer hover:opacity-90 ${
                                    story.status === 'done'
                                      ? 'bg-emerald-500 text-white'
                                      : story.status === 'in_progress'
                                      ? 'bg-emerald-600 text-white ring-1 ring-emerald-400'
                                      : 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                                  }`}
                                  style={getBarStyle(story, sIdx)}
                                  onClick={() => setDetailIssue(story)}
                                  title={`${story.key}: ${story.summary} (${story.status})`}
                                >
                                  <span className="font-mono font-bold">{story.key}</span>
                                  <span className="truncate hidden sm:inline">{story.summary}</span>
                                  <span className="ml-auto text-[9px] opacity-85 capitalize font-normal">
                                    {story.status.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Nested Tasks and Bugs under Story */}
                            {isStoryExpanded &&
                              storyTasksAndBugs.map((item, tIdx) => (
                                <div
                                  key={item.id}
                                  className="flex items-center bg-white hover:bg-blue-50/40 transition-colors border-t border-gray-100/60"
                                >
                                  <div className="w-48 sm:w-72 flex-shrink-0 p-1.5 sm:p-2 pl-10 sm:pl-14 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                    <CornerDownRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                    <IssueTypeIcon type={item.type} className="h-3 w-3 flex-shrink-0" />
                                    <span className="font-semibold text-gray-600 font-mono text-[10px] sm:text-[11px] flex-shrink-0">
                                      {item.key}
                                    </span>
                                    <span
                                      onClick={() => setDetailIssue(item)}
                                      className="text-gray-800 truncate text-[11px] sm:text-xs cursor-pointer hover:text-blue-600"
                                    >
                                      {item.summary}
                                    </span>
                                    {item.assigneeName && (
                                      <span className="text-[9px] sm:text-[10px] text-gray-400 truncate hidden lg:inline ml-auto flex-shrink-0">
                                        {item.assigneeName}
                                      </span>
                                    )}
                                  </div>

                                  {/* Task / Bug Timeline Bar */}
                                  <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-1.5 sm:p-2 flex items-center">
                                    <div
                                      className={`h-4 sm:h-4.5 rounded px-2 text-[9px] sm:text-[10px] font-semibold flex items-center gap-1.5 shadow-2xs truncate transition-all cursor-pointer hover:opacity-90 ${
                                        item.status === 'done'
                                          ? 'bg-emerald-600 text-white'
                                          : item.status === 'in_progress'
                                          ? item.type === 'bug'
                                            ? 'bg-red-600 text-white ring-1 ring-red-400 animate-pulse'
                                            : 'bg-blue-600 text-white ring-1 ring-blue-400'
                                          : item.type === 'bug'
                                          ? 'bg-red-100 text-red-900 border border-red-300'
                                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                                      }`}
                                      style={getBarStyle(item, sIdx * 3 + tIdx + 1)}
                                      onClick={() => setDetailIssue(item)}
                                      title={`${item.key}: ${item.summary} (${item.status})`}
                                    >
                                      <span className="font-mono font-bold">{item.key}</span>
                                      <span className="truncate hidden md:inline">{item.summary}</span>
                                      <span className="ml-auto text-[8px] sm:text-[9px] opacity-90 capitalize font-normal">
                                        {item.status.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        );
                      })}

                      {/* 2. Direct Tasks & Bugs under Epic without Story */}
                      {directTasksAndBugs.map((item, dIdx) => (
                        <div
                          key={item.id}
                          className="flex items-center bg-white hover:bg-blue-50/40 transition-colors border-t border-gray-100"
                        >
                          <div className="w-48 sm:w-72 flex-shrink-0 p-1.5 sm:p-2 pl-7 sm:pl-10 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <CornerDownRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <IssueTypeIcon type={item.type} className="h-3 w-3 flex-shrink-0" />
                            <span className="font-semibold text-gray-600 font-mono text-[10px] sm:text-[11px] flex-shrink-0">
                              {item.key}
                            </span>
                            <span
                              onClick={() => setDetailIssue(item)}
                              className="text-gray-800 truncate text-[11px] sm:text-xs cursor-pointer hover:text-blue-600"
                            >
                              {item.summary}
                            </span>
                            {item.assigneeName && (
                              <span className="text-[9px] sm:text-[10px] text-gray-400 truncate hidden lg:inline ml-auto flex-shrink-0">
                                {item.assigneeName}
                              </span>
                            )}
                          </div>

                          {/* Task / Bug Timeline Bar */}
                          <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-1.5 sm:p-2 flex items-center">
                            <div
                              className={`h-4 sm:h-4.5 rounded px-2 text-[9px] sm:text-[10px] font-semibold flex items-center gap-1.5 shadow-2xs truncate transition-all cursor-pointer hover:opacity-90 ${
                                item.status === 'done'
                                  ? 'bg-emerald-600 text-white'
                                  : item.status === 'in_progress'
                                  ? item.type === 'bug'
                                    ? 'bg-red-600 text-white ring-1 ring-red-400'
                                    : 'bg-blue-600 text-white ring-1 ring-blue-400'
                                  : item.type === 'bug'
                                  ? 'bg-red-100 text-red-900 border border-red-300'
                                  : 'bg-blue-100 text-blue-900 border border-blue-300'
                              }`}
                              style={getBarStyle(item, dIdx + 1)}
                              onClick={() => setDetailIssue(item)}
                              title={`${item.key}: ${item.summary} (${item.status})`}
                            >
                              <span className="font-mono font-bold">{item.key}</span>
                              <span className="truncate hidden md:inline">{item.summary}</span>
                              <span className="ml-auto text-[8px] sm:text-[9px] opacity-90 capitalize font-normal">
                                {item.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Stories without Epic Section */}
            {unassignedStories.length > 0 && (
              <div className="text-xs">
                <div className="flex items-center bg-gray-100/70 border-t-2 border-gray-200">
                  <div className="w-48 sm:w-72 flex-shrink-0 p-2.5 sm:p-3 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 font-bold text-gray-700 sticky left-0 bg-gray-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[11px] sm:text-xs">
                    <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">Stories (No Epic)</span>
                    <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-semibold ml-auto flex-shrink-0">
                      {unassignedStories.length}
                    </span>
                  </div>
                  <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-2.5 sm:p-3 text-[11px] sm:text-xs text-gray-500 font-medium">
                    Deliverables & Subtasks
                  </div>
                </div>

                {unassignedStories.map((story, sIdx) => {
                  const storyTasksAndBugs = boardData.issues.filter(
                    (i) => (i.type === 'task' || i.type === 'bug') && i.storyId === story.id
                  );
                  const isStoryExpanded = !collapsedStories[story.id];

                  return (
                    <div key={story.id} className="border-t border-gray-100">
                      {/* Story Row */}
                      <div className="flex items-center bg-gray-50/50 hover:bg-gray-100/60 transition-colors">
                        <div className="w-48 sm:w-72 flex-shrink-0 p-2 sm:p-2.5 pl-4 sm:pl-6 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {storyTasksAndBugs.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleStory(story.id)}
                              className="p-0.5 hover:bg-gray-200 rounded text-gray-500 flex-shrink-0 cursor-pointer"
                              title={isStoryExpanded ? 'Collapse Story' : 'Expand Story'}
                            >
                              {isStoryExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-700" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-700" />
                              )}
                            </button>
                          ) : (
                            <div className="w-3.5 flex-shrink-0" />
                          )}
                          <IssueTypeIcon type="story" className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-semibold text-emerald-800 font-mono text-[10px] sm:text-[11px] flex-shrink-0">
                            {story.key}
                          </span>
                          <span
                            onClick={() => setDetailIssue(story)}
                            className="text-gray-900 truncate font-medium cursor-pointer hover:text-blue-600 text-[11px] sm:text-xs"
                          >
                            {story.summary}
                          </span>
                          {storyTasksAndBugs.length > 0 && (
                            <span className="text-[9px] sm:text-[10px] bg-gray-200/80 text-gray-600 px-1 py-0.2 rounded font-semibold ml-auto flex-shrink-0">
                              {storyTasksAndBugs.length}
                            </span>
                          )}
                        </div>

                        {/* Story Timeline Bar */}
                        <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-2 sm:p-2.5 flex items-center">
                          <div
                            className={`h-4.5 rounded px-2 text-[10px] font-semibold flex items-center gap-1.5 shadow-2xs truncate transition-all cursor-pointer hover:opacity-90 ${
                              story.status === 'done'
                                ? 'bg-emerald-500 text-white'
                                : story.status === 'in_progress'
                                ? 'bg-emerald-600 text-white ring-1 ring-emerald-400'
                                : 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                            }`}
                            style={getBarStyle(story, sIdx)}
                            onClick={() => setDetailIssue(story)}
                            title={`${story.key}: ${story.summary} (${story.status})`}
                          >
                            <span className="font-mono font-bold">{story.key}</span>
                            <span className="truncate hidden sm:inline">{story.summary}</span>
                            <span className="ml-auto text-[9px] opacity-85 capitalize font-normal">
                              {story.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Nested Tasks and Bugs under Story */}
                      {isStoryExpanded &&
                        storyTasksAndBugs.map((item, tIdx) => (
                          <div
                            key={item.id}
                            className="flex items-center bg-white hover:bg-blue-50/40 transition-colors border-t border-gray-100/60"
                          >
                            <div className="w-48 sm:w-72 flex-shrink-0 p-1.5 sm:p-2 pl-9 sm:pl-12 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              <CornerDownRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <IssueTypeIcon type={item.type} className="h-3 w-3 flex-shrink-0" />
                              <span className="font-semibold text-gray-600 font-mono text-[10px] sm:text-[11px] flex-shrink-0">
                                {item.key}
                              </span>
                              <span
                                onClick={() => setDetailIssue(item)}
                                className="text-gray-800 truncate text-[11px] sm:text-xs cursor-pointer hover:text-blue-600"
                              >
                                {item.summary}
                              </span>
                              {item.assigneeName && (
                                <span className="text-[9px] sm:text-[10px] text-gray-400 truncate hidden lg:inline ml-auto flex-shrink-0">
                                  {item.assigneeName}
                                </span>
                              )}
                            </div>

                            {/* Task / Bug Timeline Bar */}
                            <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-1.5 sm:p-2 flex items-center">
                              <div
                                className={`h-4 sm:h-4.5 rounded px-2 text-[9px] sm:text-[10px] font-semibold flex items-center gap-1.5 shadow-2xs truncate transition-all cursor-pointer hover:opacity-90 ${
                                  item.status === 'done'
                                    ? 'bg-emerald-600 text-white'
                                    : item.status === 'in_progress'
                                    ? item.type === 'bug'
                                      ? 'bg-red-600 text-white ring-1 ring-red-400 animate-pulse'
                                      : 'bg-blue-600 text-white ring-1 ring-blue-400'
                                    : item.type === 'bug'
                                    ? 'bg-red-100 text-red-900 border border-red-300'
                                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                                }`}
                                style={getBarStyle(item, sIdx * 3 + tIdx + 1)}
                                onClick={() => setDetailIssue(item)}
                                title={`${item.key}: ${item.summary} (${item.status})`}
                              >
                                <span className="font-mono font-bold">{item.key}</span>
                                <span className="truncate hidden md:inline">{item.summary}</span>
                                <span className="ml-auto text-[8px] sm:text-[9px] opacity-90 capitalize font-normal">
                                  {item.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standalone Tasks & Bugs Section (Only truly unlinked issues) */}
            {standaloneTasksAndBugs.length > 0 && (
              <div className="text-xs">
                <div className="flex items-center bg-gray-100/70 border-t-2 border-gray-200">
                  <div className="w-48 sm:w-72 flex-shrink-0 p-2.5 sm:p-3 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 font-bold text-gray-700 sticky left-0 bg-gray-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[11px] sm:text-xs">
                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate">Standalone Issues</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.2 rounded font-semibold ml-auto flex-shrink-0">
                      {standaloneTasksAndBugs.length}
                    </span>
                  </div>
                  <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-2.5 sm:p-3 text-[11px] sm:text-xs text-gray-500 font-medium">
                    Unlinked Tasks & Bugs Timeline
                  </div>
                </div>
                {standaloneTasksAndBugs.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center bg-white hover:bg-blue-50/40 transition-colors border-t border-gray-100"
                  >
                    <div className="w-48 sm:w-72 flex-shrink-0 p-1.5 sm:p-2 pl-6 sm:pl-9 border-r border-gray-200 flex items-center gap-1.5 sm:gap-2 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <IssueTypeIcon type={item.type} className="h-3 w-3 flex-shrink-0" />
                      <span className="font-semibold text-gray-600 font-mono text-[10px] sm:text-[11px] flex-shrink-0">
                        {item.key}
                      </span>
                      <span
                        onClick={() => setDetailIssue(item)}
                        className="text-gray-800 truncate text-[11px] sm:text-xs cursor-pointer hover:text-blue-600"
                      >
                        {item.summary}
                      </span>
                    </div>
                    <div className="flex-1 min-w-[450px] sm:min-w-[600px] p-1.5 sm:p-2 flex items-center">
                      <div
                        className={`h-4 sm:h-4.5 rounded px-2 text-[9px] sm:text-[10px] font-semibold flex items-center gap-1.5 shadow-2xs truncate transition-all cursor-pointer hover:opacity-90 ${
                          item.status === 'done'
                            ? 'bg-emerald-600 text-white'
                            : item.status === 'in_progress'
                            ? item.type === 'bug'
                              ? 'bg-red-600 text-white ring-1 ring-red-400'
                              : 'bg-blue-600 text-white ring-1 ring-blue-400'
                            : item.type === 'bug'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                        style={getBarStyle(item, idx + 1)}
                        onClick={() => setDetailIssue(item)}
                        title={`${item.key}: ${item.summary} (${item.status})`}
                      >
                        <span className="font-mono font-bold">{item.key}</span>
                        <span className="truncate hidden md:inline">{item.summary}</span>
                        <span className="ml-auto text-[8px] sm:text-[9px] opacity-90 capitalize font-normal">
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateIssueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType="epic"
      />

      <IssueDetailDialog
        issue={detailIssue}
        open={!!detailIssue}
        onOpenChange={(isOpen) => !isOpen && setDetailIssue(null)}
      />
    </div>
  );
};
