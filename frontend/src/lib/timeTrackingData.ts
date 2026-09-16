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

/**
 * Parses and formats an entry's project and story/task/bug details accurately.
 */
export function getEntryDisplay(entry: any): {
  projectTitle: string;
  topicTitle: string;
  hasCustomNotes: boolean;
} {
  if (!entry) {
    return { projectTitle: "Project", topicTitle: "Story / Task / Bug", hasCustomNotes: false };
  }

  let projectTitle = (entry.project_name || (entry.issue && entry.issue.project_name) || entry.issue_project || "").trim();
  let topicTitle = (entry.notes || (entry.issue ? (entry.issue.title || `Issue #${entry.issue.id}`) : "")).trim();

  // 1. Check if projectTitle has combined "[Project] - [Story/Task/Bug] ..."
  if (
    projectTitle.includes(" - [Story") ||
    projectTitle.includes(" - [Task") ||
    projectTitle.includes(" - [Bug") ||
    projectTitle.includes(" - Story") ||
    projectTitle.includes(" - Task") ||
    projectTitle.includes(" - Bug")
  ) {
    const splitIdx = projectTitle.search(/\s*-\s*\[?(?:Story|Task|Bug)\]?/i);
    if (splitIdx !== -1) {
      const pPart = projectTitle.substring(0, splitIdx).trim();
      const tPart = projectTitle.substring(splitIdx).replace(/^\s*-\s*/, '').trim();
      projectTitle = pPart;
      if (!topicTitle || topicTitle === 'Active Session' || topicTitle === 'General Work' || topicTitle === 'Time Tracking Session') {
        topicTitle = tPart;
      }
    }
  }

  // 2. Check if topicTitle has combined "[Project] - [Story/Task/Bug] ..."
  if (
    topicTitle.includes(" - [Story") ||
    topicTitle.includes(" - [Task") ||
    topicTitle.includes(" - [Bug") ||
    topicTitle.includes(" - Story") ||
    topicTitle.includes(" - Task") ||
    topicTitle.includes(" - Bug")
  ) {
    const splitIdx = topicTitle.search(/\s*-\s*\[?(?:Story|Task|Bug)\]?/i);
    if (splitIdx !== -1) {
      const pPart = topicTitle.substring(0, splitIdx).trim();
      const tPart = topicTitle.substring(splitIdx).replace(/^\s*-\s*/, '').trim();
      if (!projectTitle || projectTitle === 'General' || projectTitle === 'Project' || projectTitle === 'Project Workspace') {
        projectTitle = pPart;
      }
      topicTitle = tPart;
    }
  }

  // 3. If topicTitle starts with projectTitle e.g. "Let Agent Deal (LAD) - [Task]..."
  if (topicTitle && projectTitle && topicTitle.toLowerCase().startsWith(projectTitle.toLowerCase())) {
    const stripped = topicTitle.substring(projectTitle.length).replace(/^[\s\-–:]+/, '').trim();
    if (stripped) {
      topicTitle = stripped;
    }
  }

  // 4. If topicTitle is generic or empty, format using issue details if available
  if (!topicTitle || topicTitle === 'Active Session' || topicTitle === 'General Work' || topicTitle === 'Time Tracking Session') {
    if (entry.issue) {
      const formatted = formatTaskBugDisplay(entry.issue.id || entry.issue_id, entry.issue.title);
      topicTitle = formatted.fullTitle;
    } else if (entry.notes) {
      topicTitle = entry.notes;
    } else {
      topicTitle = "-";
    }
  }

  if (!projectTitle) {
    projectTitle = "Project";
  }

  if (!topicTitle) {
    topicTitle = "-";
  }

  // Check if raw notes has extra details beyond just topicTitle
  const rawNotes = (entry.notes || '').trim();
  const hasCustomNotes = Boolean(
    rawNotes &&
    rawNotes !== topicTitle &&
    rawNotes !== '-' &&
    !topicTitle.includes(rawNotes)
  );

  return { projectTitle, topicTitle, hasCustomNotes };
}

