import React, { useState, useMemo } from 'react';
import { useFjtBoardData, FjtIssue, FjtMember } from '@/sdk/features/fjt-board';
import { useUsers } from '@/hooks/useUsers';
import {
  Users,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Hash,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { IssueTypeIcon } from './IssueCard';

export const ReportsView: React.FC = () => {
  const { data: boardData, isLoading } = useFjtBoardData();
  const { data: dbUsers } = useUsers();

  const [searchMember, setSearchMember] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Available team members
  const availableMembers = useMemo(() => {
    if (dbUsers && dbUsers.length > 0) {
      return dbUsers.map((u: any) => {
        const name = u.full_name || u.name || u.email?.split('@')[0] || 'Team Member';
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
          role: u.role || 'Employee',
          initials,
        };
      });
    }

    return [];
  }, [dbUsers]);

  // Overall Board Metrics (Only Tasks and Bugs)
  const metrics = useMemo(() => {
    if (!boardData) {
      return { totalIssues: 0, doneIssues: 0, inProgressIssues: 0, todoIssues: 0, completionRate: 0 };
    }

    const workIssues = boardData.issues.filter((i) => i.type === 'task' || i.type === 'bug');
    const totalIssues = workIssues.length;
    const doneIssues = workIssues.filter((i) => i.status === 'done').length;
    const inProgressIssues = workIssues.filter((i) => i.status === 'in_progress').length;
    const todoIssues = workIssues.filter((i) => i.status === 'to_do').length;
    const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

    return { totalIssues, doneIssues, inProgressIssues, todoIssues, completionRate };
  }, [boardData]);

  // Employee Workload Analysis mapping (Tasks & Bugs only)
  const employeeAnalysis = useMemo(() => {
    if (!boardData) return [];

    const issues = boardData.issues.filter((i) => i.type === 'task' || i.type === 'bug');

    // Build analysis for each known member
    const memberStats = availableMembers.map((member) => {
      const assigned = issues.filter((i) => {
        if (i.assignees && i.assignees.length > 0) {
          return i.assignees.some((a) => a.id === member.id || a.name?.toLowerCase() === member.name.toLowerCase() || a.email === member.email);
        }
        if (i.assignee) {
          return i.assignee.id === member.id || i.assignee.name?.toLowerCase() === member.name.toLowerCase() || i.assignee.email === member.email;
        }
        return false;
      });

      const todoList = assigned.filter((i) => i.status === 'to_do');
      const inProgressList = assigned.filter((i) => i.status === 'in_progress');
      const doneList = assigned.filter((i) => i.status === 'done');

      const totalAssigned = assigned.length;
      const pendingCount = todoList.length + inProgressList.length;
      const doneCount = doneList.length;
      const completionPct = totalAssigned > 0 ? Math.round((doneCount / totalAssigned) * 100) : 0;

      const totalPoints = assigned.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
      const donePoints = doneList.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

      const tasksCount = assigned.filter((i) => i.type === 'task').length;
      const bugsCount = assigned.filter((i) => i.type === 'bug').length;

      let loadStatus: { label: string; color: string; bg: string; border: string } = {
        label: 'Optimal Load',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
      };

      if (pendingCount >= 4 || totalPoints >= 15) {
        loadStatus = {
          label: 'High Load',
          color: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
        };
      } else if (pendingCount === 0 && totalAssigned > 0) {
        loadStatus = {
          label: 'All Done 🎉',
          color: 'text-blue-700',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
        };
      } else if (totalAssigned === 0) {
        loadStatus = {
          label: 'Available',
          color: 'text-gray-500',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
        };
      }

      return {
        member,
        totalAssigned,
        pendingCount,
        todoCount: todoList.length,
        inProgressCount: inProgressList.length,
        doneCount,
        completionPct,
        totalPoints,
        donePoints,
        tasksCount,
        bugsCount,
        loadStatus,
        assignedIssues: assigned,
        todoList,
        inProgressList,
        doneList,
      };
    });

    // Also track unassigned issues
    const unassignedIssues = issues.filter((i) => (!i.assignees || i.assignees.length === 0) && !i.assignee);
    if (unassignedIssues.length > 0) {
      const todoList = unassignedIssues.filter((i) => i.status === 'to_do');
      const inProgressList = unassignedIssues.filter((i) => i.status === 'in_progress');
      const doneList = unassignedIssues.filter((i) => i.status === 'done');

      memberStats.push({
        member: { id: 'unassigned', name: 'Unassigned Issues', email: '', role: 'Backlog', initials: 'UN' },
        totalAssigned: unassignedIssues.length,
        pendingCount: todoList.length + inProgressList.length,
        todoCount: todoList.length,
        inProgressCount: inProgressList.length,
        doneCount: doneList.length,
        completionPct: Math.round((doneList.length / unassignedIssues.length) * 100),
        totalPoints: unassignedIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0),
        donePoints: doneList.reduce((sum, i) => sum + (i.storyPoints || 0), 0),
        tasksCount: unassignedIssues.filter((i) => i.type === 'task').length,
        bugsCount: unassignedIssues.filter((i) => i.type === 'bug').length,
        loadStatus: {
          label: `${unassignedIssues.length} Needs Assignee`,
          color: 'text-red-700',
          bg: 'bg-red-50',
          border: 'border-red-200',
        },
        assignedIssues: unassignedIssues,
        todoList,
        inProgressList,
        doneList,
      });
    }

    // Sort by most assigned first
    return memberStats.sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [availableMembers, boardData]);

  // Filtered by search
  const filteredAnalysis = useMemo(() => {
    if (!searchMember.trim()) return employeeAnalysis;
    const q = searchMember.toLowerCase();
    return employeeAnalysis.filter(
      (e) => e.member.name.toLowerCase().includes(q) || e.member.role?.toLowerCase().includes(q) || e.member.email?.toLowerCase().includes(q)
    );
  }, [employeeAnalysis, searchMember]);

  // Issue Type distribution (Tasks and Bugs only)
  const typeDistribution = useMemo(() => {
    if (!boardData) return [];
    const counts: Record<string, number> = { task: 0, bug: 0 };
    boardData.issues.forEach((i) => {
      if (i.type === 'task' || i.type === 'bug') {
        counts[i.type] = (counts[i.type] || 0) + 1;
      }
    });
    return [
      { type: 'task', label: 'Tasks', count: counts.task || 0, color: 'bg-blue-500' },
      { type: 'bug', label: 'Bugs', count: counts.bug || 0, color: 'bg-red-500' },
    ];
  }, [boardData]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeMembersCount = employeeAnalysis.filter((e) => e.member.id !== 'unassigned' && e.totalAssigned > 0).length;

  return (
    <div className="flex flex-col h-full bg-slate-50/60 overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Team & Employee Workload Analysis</h1>
              <span className="bg-blue-50 text-blue-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-blue-200/60 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Task Board
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live breakdown of pending vs completed issues, story points, and active workload per team member.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Filter by employee name..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-[#0B1957] rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0B1957] focus:border-[#0B1957] shadow-2xs transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3.5 hover:border-blue-300 transition-colors">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Work Items</p>
              <p className="text-2xl font-black text-gray-900">{metrics.totalIssues} <span className="text-xs font-normal text-gray-400">tickets</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3.5 hover:border-indigo-300 transition-colors">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Assigned Members</p>
              <p className="text-2xl font-black text-indigo-600">
                {activeMembersCount} <span className="text-xs font-semibold text-gray-400">working</span>
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3.5 hover:border-amber-300 transition-colors">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">In Progress Work</p>
              <p className="text-2xl font-black text-amber-600">{metrics.inProgressIssues} <span className="text-xs font-normal text-gray-400">active</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3.5 hover:border-emerald-300 transition-colors">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Completed Work</p>
              <p className="text-2xl font-black text-emerald-600">
                {metrics.doneIssues} <span className="text-xs font-semibold text-gray-400">({metrics.completionRate}%)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Employee Workload Cards */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Individual Employee Workload & Pending Issues
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Overview of assigned tasks, active in-progress items, and pending backlog per developer.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> To Do
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Done
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredAnalysis.map((item) => {
              const isExpanded = expandedMemberId === item.member.id;
              const hasWork = item.totalAssigned > 0;

              return (
                <div key={item.member.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* User Info & Avatar */}
                    <div className="flex items-center gap-3.5 min-w-[240px]">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs text-white ${
                          item.member.id === 'unassigned' ? 'bg-gray-400' : 'bg-[#0B1957]'
                        }`}
                      >
                        {item.member.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{item.member.name}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.loadStatus.bg} ${item.loadStatus.color} ${item.loadStatus.border}`}
                          >
                            {item.loadStatus.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 capitalize">{item.member.role || 'Team Member'}</p>
                      </div>
                    </div>

                    {/* Pending vs Done Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                      <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Total Work</p>
                        <p className="text-sm font-black text-gray-800">{item.totalAssigned}</p>
                      </div>
                      <div className="bg-amber-50/60 px-3 py-1.5 rounded-lg border border-amber-100">
                        <p className="text-[10px] uppercase font-bold text-amber-600">Pending</p>
                        <p className="text-sm font-black text-amber-700">{item.pendingCount}</p>
                      </div>
                      <div className="bg-emerald-50/60 px-3 py-1.5 rounded-lg border border-emerald-100">
                        <p className="text-[10px] uppercase font-bold text-emerald-600">Done</p>
                        <p className="text-sm font-black text-emerald-700">{item.doneCount}</p>
                      </div>
                    </div>

                    {/* Progress Bar & Type Pills */}
                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-500 text-[11px]">
                          {item.todoCount} To Do • {item.inProgressCount} In Progress • {item.doneCount} Done
                        </span>
                        <span className="text-gray-900">{item.completionPct}%</span>
                      </div>

                      {/* Segmented Status Bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2.5 flex overflow-hidden">
                        {item.doneCount > 0 && (
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${(item.doneCount / item.totalAssigned) * 100}%` }}
                            title={`Done: ${item.doneCount}`}
                          />
                        )}
                        {item.inProgressCount > 0 && (
                          <div
                            className="bg-amber-500 h-full transition-all duration-300"
                            style={{ width: `${(item.inProgressCount / item.totalAssigned) * 100}%` }}
                            title={`In Progress: ${item.inProgressCount}`}
                          />
                        )}
                        {item.todoCount > 0 && (
                          <div
                            className="bg-slate-400 h-full transition-all duration-300"
                            style={{ width: `${(item.todoCount / item.totalAssigned) * 100}%` }}
                            title={`To Do: ${item.todoCount}`}
                          />
                        )}
                      </div>

                      {/* Issue Types Counter */}
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-0.5">
                        {item.tasksCount > 0 && (
                          <span className="flex items-center gap-1 font-medium">
                            <IssueTypeIcon type="task" className="h-3 w-3" /> {item.tasksCount} tasks
                          </span>
                        )}
                        {item.bugsCount > 0 && (
                          <span className="flex items-center gap-1 font-medium text-red-600">
                            <IssueTypeIcon type="bug" className="h-3 w-3" /> {item.bugsCount} bugs
                          </span>
                        )}
                        {item.totalPoints > 0 && (
                          <span className="text-gray-400">
                            • {item.donePoints}/{item.totalPoints} pts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* View Details Toggle */}
                    {hasWork && (
                      <button
                        type="button"
                        onClick={() => setExpandedMemberId(isExpanded ? null : item.member.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-md flex items-center gap-1 self-end lg:self-center transition-colors"
                      >
                        <span>{isExpanded ? 'Hide Tickets' : 'View Tickets'}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Expandable Member Issues Details List */}
                  {isExpanded && hasWork && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 bg-slate-50/80 p-3.5 rounded-lg">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span>Assigned Issues for {item.member.name}</span>
                        <span className="text-gray-400 font-normal">
                          {item.pendingCount} pending / {item.totalAssigned} total
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {item.assignedIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="bg-white p-2.5 rounded-md border border-gray-200 flex items-start gap-2 shadow-2xs"
                          >
                            <IssueTypeIcon type={issue.type} className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-blue-600">{issue.key}</span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                    issue.status === 'done'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : issue.status === 'in_progress'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {issue.status === 'done' ? 'Done' : issue.status === 'in_progress' ? 'In Progress' : 'To Do'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-800 truncate mt-0.5">{issue.summary}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Issue Type Breakdown & Epic Delivery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Issue Type Distribution</h2>
            <p className="text-xs text-gray-500 mb-4">Breakdown of active stories, tasks, bugs, and epics.</p>
            <div className="space-y-3.5 text-xs">
              {typeDistribution.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-[90px]">
                    <IssueTypeIcon type={item.type} />
                    <span className="font-semibold text-gray-800">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-1 mx-4">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all duration-300`}
                        style={{
                          width: `${metrics.totalIssues ? (item.count / metrics.totalIssues) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 min-w-[24px] text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Epic Delivery Status</h2>
            <p className="text-xs text-gray-500 mb-4">Tracking progress across large business goals.</p>
            <div className="space-y-4 text-xs">
              {boardData?.epics && boardData.epics.length > 0 ? (
                boardData.epics.map((epic) => {
                  const childTasksAndBugs = boardData.issues.filter((i) => {
                    if (i.type !== 'task' && i.type !== 'bug') return false;
                    if (i.epicId === epic.id) return true;
                    const parentStory = boardData.issues.find((s) => s.id === i.storyId);
                    return parentStory?.epicId === epic.id;
                  });
                  const childCount = childTasksAndBugs.length;
                  const doneCount = childTasksAndBugs.filter((i) => i.status === 'done').length;
                  const pct = childCount > 0 ? Math.round((doneCount / childCount) * 100) : 0;
                  return (
                    <div key={epic.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate max-w-[240px]" style={{ color: epic.color }}>
                          {epic.epicName || (epic as any).name || epic.summary}
                        </span>
                        <span className="text-gray-600 font-semibold">{pct}% ({doneCount}/{childCount})</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: epic.color }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 py-4 text-center">No epics registered yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


