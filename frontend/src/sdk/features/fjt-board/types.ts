/**
 * FJT Board Types
 * Issue Hierarchy: Epic -> Story / Task / Bug
 */

export type FjtIssueType = 'epic' | 'story' | 'task' | 'bug';

export type FjtStatus = 'to_do' | 'in_progress' | 'done';

export type FjtPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface FjtEpic {
  id: string;
  key: string;
  epicName: string;
  summary: string;
  color: string; // e.g. '#ea580c', '#9333ea', '#dc2626'
  status: FjtStatus;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FjtProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  category?: string;
  leadUserId?: string;
  lead?: string;
  leadEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FjtSprint {
  id: string;
  name: string;
  goal?: string;
  status: 'active' | 'future' | 'closed';
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFjtSprintInput {
  name: string;
  goal?: string;
  status?: 'active' | 'future' | 'closed';
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  projectId?: string;
}

export interface CreateFjtProjectInput {
  key: string;
  name: string;
  description?: string;
  category?: string;
  leadUserId?: string;
  lead?: string;
}

export interface FjtMember {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
  initials: string;
  role?: string;
}

export interface FjtComment {
  id: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorInitials: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FjtIssue {
  id: string;
  key: string; // e.g. FJT-Story-1, FJT-Task-1, FJT-Bug-1
  projectId?: string;
  projectKey: string; // 'FJT', 'COB', 'BNK'
  projectName: string;
  type: FjtIssueType;
  summary: string;
  description?: string;
  descriptionAuthor?: FjtMember;
  descriptionCreatedAt?: string;
  descriptionUpdatedAt?: string;
  descriptionSaved?: boolean;
  comments?: FjtComment[];
  status: FjtStatus;
  priority: FjtPriority;
  storyPoints?: number; // 1 - 10
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  epicId?: string; // Linked Epic ID (for Stories or inherited)
  epicKey?: string;
  epicName?: string;
  epicColor?: string;
  storyId?: string; // Linked Story ID (for Tasks & Bugs)
  storyKey?: string;
  storySummary?: string;
  linkedTaskId?: string; // Tagged/Linked Task ID (for Tasks & Bugs)
  linkedTaskKey?: string;
  linkedTaskSummary?: string;
  sprintId?: string | null;
  assigneeId?: string;
  assigneeName?: string;
  assignee?: FjtMember;
  assignees?: FjtMember[];
  reviewers?: FjtMember[];
  reporter?: {
    name: string;
    initials: string;
  };
  components?: string[];
  labels?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFjtIssueInput {
  key?: string;
  projectId?: string;
  projectKey?: string;
  projectName?: string;
  type: FjtIssueType;
  summary: string;
  description?: string;
  descriptionAuthor?: FjtMember;
  descriptionCreatedAt?: string;
  descriptionSaved?: boolean;
  comments?: FjtComment[];
  status?: FjtStatus;
  priority?: FjtPriority;
  storyPoints?: number; // 1 - 10
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  epicId?: string; // For Story: select Epic
  epicName?: string; // For creating an Epic directly
  epicColor?: string;
  storyId?: string; // For Task/Bug: select Story
  storyKey?: string;
  storySummary?: string;
  linkedTaskId?: string; // For Task/Bug: tag existing task
  linkedTaskKey?: string;
  linkedTaskSummary?: string;
  sprintId?: string | null;
  assigneeName?: string;
  assignee?: FjtMember;
  assignees?: FjtMember[];
  reviewers?: FjtMember[];
  components?: string[];
  labels?: string[];
}

export interface UpdateFjtIssueInput extends Partial<CreateFjtIssueInput> {
  id: string;
  status?: FjtStatus;
  sprintId?: string | null;
  descriptionUpdatedAt?: string;
}

export interface FjtBoardData {
  project: {
    key: string;
    name: string;
  };
  projects?: FjtProject[];
  currentProjectId?: string;
  epics: FjtEpic[];
  sprints: FjtSprint[];
  issues: FjtIssue[];
}
