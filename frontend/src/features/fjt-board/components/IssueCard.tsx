import React, { useMemo } from 'react';
import { FjtIssue, FjtStatus, extractMentionsFromText, getAllIssueText } from '@/sdk/features/fjt-board';
import {
  Bookmark,
  Check,
  Bug,
  Zap,
  ArrowUp,
  ArrowDown,
  Equal,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  Calendar,
  AtSign,
  ArrowRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IssueCardProps {
  issue: FjtIssue;
  onStatusChange?: (issueId: string, status: FjtStatus) => void;
  onDelete?: (issueId: string) => void;
  onClick?: (issue: FjtIssue) => void;
  timeSpent?: string;
  onOpenTimeTracking?: (issue: FjtIssue) => void;
}


export const getDueWarning = (endDateStr?: string, status?: string) => {
  if (!endDateStr) return null;
  if (status === 'done') {
    return {
      text: 'Completed',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      isOverdue: false,
      days: 0,
    };
  }

  try {
    let end: Date;
    if (endDateStr.includes('-')) {
      const cleanStr = endDateStr.split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length !== 3) return null;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        end = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        end = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        end = new Date(endDateStr);
      }
    } else {
      end = new Date(endDateStr);
    }

    if (isNaN(end.getTime())) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = end.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (isNaN(diffDays)) return null;

    if (diffDays < 0) {
      const overdue = Math.abs(diffDays);
      return {
        text: overdue === 1 ? 'Overdue (1 day)' : `Overdue (${overdue} days)`,
        className: 'bg-red-100 text-red-700 border-red-300 font-bold',
        isOverdue: true,
        days: diffDays,
      };
    } else if (diffDays === 0) {
      return {
        text: 'Due today',
        className: 'bg-red-50 text-red-600 border-red-200 font-bold',
        isOverdue: true,
        days: 0,
      };
    } else if (diffDays === 1) {
      return {
        text: '1 day left',
        className: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
        isOverdue: false,
        days: 1,
      };
    } else if (diffDays <= 3) {
      return {
        text: `${diffDays} days left`,
        className: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
        isOverdue: false,
        days: diffDays,
      };
    } else {
      return {
        text: `${diffDays} days left`,
        className: 'bg-blue-50 text-blue-700 border-blue-200/80 font-medium',
        isOverdue: false,
        days: diffDays,
      };
    }
  } catch {
    return null;
  }
};

export const IssueTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'h-4 w-4' }) => {
  const normType = (type || '').toLowerCase();

  switch (normType) {
    case 'bug':
      return (
        <span
          title="Bug"
          className={`inline-flex items-center justify-center rounded-[3px] bg-[#E5493A] text-white flex-shrink-0 shadow-xs ${className}`}
        >
          <Bug className="w-[72%] h-[72%] text-white fill-white" />
        </span>
      );
    case 'task':
      return (
        <span
          title="Task"
          className={`inline-flex items-center justify-center rounded-[3px] bg-[#4BADE8] text-white flex-shrink-0 shadow-xs ${className}`}
        >
          <Check className="w-[72%] h-[72%] text-white stroke-[3.5]" />
        </span>
      );
    case 'story':
      return (
        <span
          title="Story"
          className={`inline-flex items-center justify-center rounded-[3px] bg-[#63BA3C] text-white flex-shrink-0 shadow-xs ${className}`}
        >
          <Bookmark className="w-[68%] h-[68%] text-white fill-white" />
        </span>
      );
    case 'epic':
      return (
        <span
          title="Epic"
          className={`inline-flex items-center justify-center rounded-[3px] bg-[#904EE2] text-white flex-shrink-0 shadow-xs ${className}`}
        >
          <Zap className="w-[68%] h-[68%] text-white fill-white" />
        </span>
      );
    default:
      return (
        <span
          title={type || 'Task'}
          className={`inline-flex items-center justify-center rounded-[3px] bg-[#4BADE8] text-white flex-shrink-0 shadow-xs ${className}`}
        >
          <Check className="w-[72%] h-[72%] text-white stroke-[3.5]" />
        </span>
      );
  }
};

export const PriorityIcon: React.FC<{ priority: string; className?: string }> = ({ priority, className = 'h-3.5 w-3.5' }) => {
  const normPriority = (priority || 'medium').toLowerCase();
  switch (normPriority) {
    case 'high':
    case 'highest':
      return (
        <span title="High priority" className="inline-flex items-center text-red-600 flex-shrink-0">
          <ArrowUp className={`${className} text-red-600 stroke-[2.5]`} />
        </span>
      );
    case 'low':
    case 'lowest':
      return (
        <span title="Low priority" className="inline-flex items-center text-blue-500 flex-shrink-0">
          <ArrowDown className={`${className} text-blue-500 stroke-[2.5]`} />
        </span>
      );
    case 'medium':
    default:
      return (
        <span title="Medium priority" className="inline-flex items-center text-amber-500 flex-shrink-0">
          <Equal className={`${className} text-amber-500 stroke-[2.5]`} />
        </span>
      );
  }
};

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onStatusChange,
  onDelete,
  onClick,
  timeSpent,
  onOpenTimeTracking,
}) => {
  const dueWarning = getDueWarning(issue.endDate, issue.status);


  const mentionList = useMemo(() => {
    const texts = getAllIssueText(issue);
    const mentions = new Set<string>();
    texts.forEach((t) => {
      extractMentionsFromText(t).forEach((m) => mentions.add(m));
    });
    return Array.from(mentions);
  }, [issue]);

  return (
    <div
      onClick={() => onClick?.(issue)}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 sm:p-3 hover:shadow-md transition-all cursor-pointer relative group flex flex-col gap-2 select-none w-full max-w-full overflow-hidden"
    >
      {/* Summary */}
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-xs sm:text-sm font-medium text-gray-900 leading-snug hover:text-blue-600 transition-colors line-clamp-2 sm:line-clamp-3">
          {issue.summary}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 flex-shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 bg-white">
            {issue.status !== 'to_do' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(issue.id, 'to_do'); }}>
                Move to To Do
              </DropdownMenuItem>
            )}
            {issue.status !== 'in_progress' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(issue.id, 'in_progress'); }}>
                Move to In Progress
              </DropdownMenuItem>
            )}
            {issue.status !== 'done' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(issue.id, 'done'); }}>
                Move to Done
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(issue.id); }}
                className="text-red-600 hover:bg-red-50 focus:text-red-600"
              >
                Delete Issue
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hierarchy Badges: Epic Tag, Story Tag, Linked Task Tag, Mentions & Due Date Warning */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Epic Badge (Highlighted for Story, Task or Bug) */}
        {(issue.epicName || issue.epicKey) && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase truncate max-w-[200px] whitespace-nowrap flex-shrink-0 flex items-center gap-1 shadow-2xs"
            style={{
              backgroundColor: `${issue.epicColor || '#ea580c'}1f`,
              color: issue.epicColor || '#ea580c',
              border: `1px solid ${issue.epicColor || '#ea580c'}44`,
            }}
            title={`Epic: ${issue.epicName || issue.epicKey}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: issue.epicColor || '#ea580c' }}
            />
            <span className="truncate">{issue.epicName || issue.epicKey}</span>
          </span>
        )}

        {/* Linked Parent Story Badge (for Task or Bug) */}
        {(issue.storyKey || issue.storySummary) && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300/90 flex items-center gap-1 max-w-[220px] truncate whitespace-nowrap flex-shrink-0 shadow-2xs"
            title={`Parent Story: ${issue.storyKey || ''} - ${issue.storySummary || ''}`}
          >
            <IssueTypeIcon type="story" className="h-3 w-3 flex-shrink-0" />
            <span className="truncate font-mono font-medium">{issue.storyKey || issue.storySummary}</span>
          </span>
        )}

        {/* Linked Task Badge (for Task or Bug tagged to an existing task) */}
        {(issue.linkedTaskKey || issue.linkedTaskSummary) && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-300/90 flex items-center gap-1 max-w-[200px] truncate whitespace-nowrap flex-shrink-0 shadow-2xs"
            title={`Tagged Task: ${issue.linkedTaskKey || ''} - ${issue.linkedTaskSummary || ''}`}
          >
            <IssueTypeIcon type="task" className="h-3 w-3 flex-shrink-0" />
            <span className="truncate font-mono font-medium">{issue.linkedTaskKey || issue.linkedTaskSummary}</span>
          </span>
        )}

        {/* Mention Badge */}
        {mentionList.length > 0 && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center max-w-[150px] truncate whitespace-nowrap flex-shrink-0 shadow-2xs"
            title={`Mentioned: ${mentionList.map((m) => `@${m.replace(/^@+/, '')}`).join(', ')}`}
          >
            <span className="truncate font-medium">
              @{mentionList[0].replace(/^@+/, '')}
              {mentionList.length > 1 ? ` +${mentionList.length - 1}` : ''}
            </span>
          </span>
        )}


        {/* Due Date Countdown Warning Badge */}
        {dueWarning && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 max-w-[220px] truncate whitespace-nowrap flex-shrink-0 ${dueWarning.className}`}
            title={`Due Date: ${issue.endDate || ''}${issue.startDate ? ` (Start: ${issue.startDate})` : ''}`}
          >
            {dueWarning.isOverdue ? (
              <AlertTriangle className="h-3 w-3 flex-shrink-0 text-red-600" />
            ) : (
              <Clock className="h-3 w-3 flex-shrink-0 text-amber-600" />
            )}
            <span>{dueWarning.text}</span>
          </span>
        )}
      </div>


      {/* Footer Info: Type, Key, Priority, Story Points, Dates, Assignee */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <IssueTypeIcon type={issue.type} />
          <PriorityIcon priority={issue.priority} />
          <span className="font-semibold text-gray-700 whitespace-nowrap flex-shrink-0">{issue.key}</span>
          {Boolean(issue.storyPoints && Number(issue.storyPoints) > 0) && (
            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.2 rounded ring-1 ring-gray-200 whitespace-nowrap flex-shrink-0">
              {issue.storyPoints}pt
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {issue.labels && issue.labels.length > 0 ? (
            <div className="flex items-center gap-1">
              <span
                className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-200/70 truncate max-w-[100px]"
                title={issue.labels.join(', ')}
              >
                {issue.labels[0]}
              </span>
              {issue.labels.length > 1 && (
                <span
                  className="bg-gray-100 text-gray-600 text-[9px] font-bold px-1 py-0.5 rounded"
                  title={issue.labels.slice(1).join(', ')}
                >
                  +{issue.labels.length - 1}
                </span>
              )}
            </div>
          ) : null}

          {/* Assignees Avatar Stack */}
          {issue.assignees && issue.assignees.length > 0 ? (
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {issue.assignees.slice(0, 3).map((assignee, idx) => (
                <div
                  key={assignee.id || assignee.name || idx}
                  className="w-6 h-6 rounded-full bg-[#0B1957] text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white"
                  title={assignee.name}
                >
                  {assignee.initials || assignee.name.slice(0, 2).toUpperCase()}
                </div>
              ))}
              {issue.assignees.length > 3 && (
                <div
                  className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[9px] font-bold ring-2 ring-white"
                  title={`${issue.assignees.length - 3} more assignees`}
                >
                  +{issue.assignees.length - 3}
                </div>
              )}
            </div>
          ) : issue.assignee ? (
            <div
              className="w-6 h-6 rounded-full bg-[#0B1957] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
              title={issue.assignee.name}
            >
              {issue.assignee.initials || issue.assignee.name.slice(0, 2).toUpperCase()}
            </div>
          ) : null}
        </div>
      </div>

      {/* Time Spent Row & Time Tracking Analysis Trigger */}
      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[11px]">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenTimeTracking?.(issue);
          }}
          className="flex items-center gap-1.5 text-gray-600 hover:text-blue-700 cursor-pointer transition-colors font-medium"
          title="Click to view time tracking analysis & history"
        >
          <Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
          <span>Time Spent:</span>
          <span className="font-bold text-gray-900">{timeSpent || '0h 00m'}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTimeTracking?.(issue);
          }}
          className="p-1 rounded-md text-gray-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center"
          title="Open time spent analysis modal"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

