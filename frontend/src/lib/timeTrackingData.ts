export interface StoryItem {
  id: string;
  key: string;
  summary: string;
  projectName: string;
}

export interface TaskBugItem {
  id: number;
  key: string;
  title: string;
  type: 'task' | 'bug';
  storyId: string;
}

// Clean dynamic data - populated from real DB via FJT Board
export const STORIES_LIST: StoryItem[] = [];

export const TASKS_BUGS_BY_STORY: Record<string, TaskBugItem[]> = {};

export const ALL_TASKS_BUGS: TaskBugItem[] = [];

export function findTaskBugById(id?: number | string | null): TaskBugItem | undefined {
  if (!id) return undefined;
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return ALL_TASKS_BUGS.find(item => item.id === numId);
}

export function formatStoryDisplay(storySummaryOrName?: string | null): string {
  if (!storySummaryOrName) return "Story";
  return storySummaryOrName;
}

export function formatTaskBugDisplay(issueId?: number | string | null, fallbackTitle?: string | null): {
  type: 'task' | 'bug' | 'issue';
  label: string;
  fullTitle: string;
} {
  const found = findTaskBugById(issueId);
  if (found) {
    return {
      type: found.type,
      label: `[${found.type === 'bug' ? 'Bug' : 'Task'}] ${found.key}`,
      fullTitle: `[${found.type === 'bug' ? 'Bug' : 'Task'}] ${found.key}: ${found.title}`
    };
  }
  return {
    type: 'issue',
    label: issueId ? `#${issueId}` : 'Task',
    fullTitle: fallbackTitle 
      ? (issueId ? `#${issueId} – ${fallbackTitle}` : fallbackTitle) 
      : (issueId ? `Task #${issueId}` : 'Task')
  };
}
