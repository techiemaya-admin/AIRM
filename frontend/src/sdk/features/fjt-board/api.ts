/**
 * FJT Board API Client
 * 100% Connected to PostgreSQL Database via Express Backend
 * No LocalStorage Mock Caching
 */

import {
  FjtBoardData,
  FjtEpic,
  FjtIssue,
  FjtSprint,
  FjtProject,
  CreateFjtIssueInput,
  UpdateFjtIssueInput,
  FjtStatus,
} from './types';
import { logger } from '@/lib/logger';

// Clean out any legacy mock data from browser localStorage
try {
  [
    'airm_fjt_board_data_v1',
    'airm_fjt_board_data_v2',
    'airm_fjt_board_data_v3',
    'airm_fjt_board_data_v4',
    'airm_fjt_board_data_v5',
  ].forEach((k) => localStorage.removeItem(k));
} catch {}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function getHeaders() {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function formatTypeLabel(type?: string): string {
  if (!type) return 'Task';
  const clean = type.trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export const fjtBoardApi = {
  // Get full board dataset directly from PostgreSQL database
  getBoardData: async (): Promise<FjtBoardData> => {
    const response = await fetch(`${API_BASE}/api/fjt-board/board`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to load board data: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.message || 'Failed to fetch board data');
    }

    const dbProjects: FjtProject[] = result.data.projects || [];
    const savedActiveId = localStorage.getItem('airm_fjt_active_project_id');
    const activeProj = dbProjects.find((p) => p.id === savedActiveId) || dbProjects[0];

    return {
      project: activeProj
        ? { key: activeProj.key, name: `${activeProj.name} (${activeProj.key})` }
        : { key: '', name: 'No Projects Created' },
      currentProjectId: activeProj?.id || '',
      projects: dbProjects,
      epics: result.data.epics || [],
      sprints: result.data.sprints || [],
      issues: result.data.issues || [],
    };
  },

  // Create issue (Story, Task, Bug) or Epic in Database
  createIssue: async (input: CreateFjtIssueInput): Promise<FjtIssue | FjtEpic> => {
    if (input.type === 'epic') {
      const epicColors = ['#ea580c', '#9333ea', '#dc2626', '#2563eb', '#059669', '#d97706'];
      const randomColor = epicColors[Math.floor(Math.random() * epicColors.length)];

      const resp = await fetch(`${API_BASE}/api/fjt-board/epics`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          key: input.key,
          projectKey: input.projectKey || 'FJT',
          epic_name: input.epicName || input.summary,
          summary: input.summary || input.epicName || 'Epic',
          color: input.epicColor || randomColor,
          status: input.status || 'to_do',
          start_date: input.startDate,
          due_date: input.endDate,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create epic');
      }

      const json = await resp.json();
      const epicData = json.data || {};
      return {
        ...epicData,
        epicName: epicData.epicName || epicData.epic_name || epicData.name || epicData.summary,
        name: epicData.name || epicData.epicName || epicData.epic_name || epicData.summary,
      };
    }

    // Story, Task, Bug
    const assignee = input.assignee || (input.assignees && input.assignees[0]);
    const assigneeName = assignee?.name || (typeof assignee === 'string' ? assignee : input.assigneeName);
    const assigneeInitials =
      assignee?.initials ||
      (assigneeName
        ? assigneeName
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : null);

    const resp = await fetch(`${API_BASE}/api/fjt-board/issues`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        key: input.key,
        projectKey: input.projectKey,
        projectName: input.projectName,
        type: input.type,
        summary: input.summary,
        description: input.description,
        descriptionAuthor: input.descriptionAuthor,
        descriptionCreatedAt: input.descriptionCreatedAt,
        descriptionSaved: input.descriptionSaved,
        status: input.status || 'to_do',
        priority: input.priority || 'medium',
        storyPoints: input.storyPoints,
        epicId: input.epicId && input.epicId !== 'none' ? input.epicId : null,
        storyId: input.storyId && input.storyId !== 'none' ? input.storyId : null,
        linkedTaskId: input.linkedTaskId && input.linkedTaskId !== 'none' ? input.linkedTaskId : null,
        sprintId: input.sprintId && input.sprintId !== 'none' ? input.sprintId : null,
        assignee_id: assignee?.id || null,
        assignee: assigneeName ? { name: assigneeName, initials: assigneeInitials } : null,
        assignees: input.assignees !== undefined ? input.assignees : (assignee ? [assignee] : []),
        assigneeName,
        assigneeInitials,
        reporter_id: (input as any).reporterId || (input as any).reporter_id || undefined,
        reporter: (input as any).reporter || undefined,
        startDate: input.startDate,
        endDate: input.endDate,
        labels: input.labels || [],
        comments: (input as any).comments || [],
        raw_data: (input as any).raw_data || undefined,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create issue');
    }

    const json = await resp.json();
    return json.data;
  },

  // Update existing issue in Database
  updateIssue: async (input: UpdateFjtIssueInput): Promise<FjtIssue> => {
    const assignee = input.assignee || (input.assignees && input.assignees[0]);
    const assigneeName =
      assignee?.name !== undefined ? assignee.name : typeof assignee === 'string' ? assignee : input.assigneeName;

    const resp = await fetch(`${API_BASE}/api/fjt-board/issues/${input.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        descriptionAuthor: input.descriptionAuthor,
        descriptionCreatedAt: input.descriptionCreatedAt,
        descriptionSaved: input.descriptionSaved,
        status: input.status,
        priority: input.priority,
        storyPoints: input.storyPoints === undefined ? undefined : input.storyPoints,
        epicId: input.epicId === 'none' || input.epicId === '' ? null : input.epicId,
        epicKey: (input as any).epicKey,
        epicName: (input as any).epicName,
        epicColor: (input as any).epicColor,
        storyId: input.storyId === 'none' || input.storyId === '' ? null : input.storyId,
        storyKey: (input as any).storyKey,
        storySummary: (input as any).storySummary,
        linkedTaskId: input.linkedTaskId === 'none' || input.linkedTaskId === '' ? null : input.linkedTaskId,
        linkedTaskKey: (input as any).linkedTaskKey,
        linkedTaskSummary: (input as any).linkedTaskSummary,
        sprintId: input.sprintId === 'none' || input.sprintId === '' ? null : input.sprintId,
        assignee: assigneeName ? { name: assigneeName, initials: assignee?.initials } : null,
        assignees: input.assignees !== undefined ? input.assignees : undefined,
        assignee_id: assignee?.id || null,
        assigneeName,
        startDate: input.startDate === '' ? null : input.startDate,
        endDate: input.endDate === '' ? null : input.endDate,
        labels: input.labels || [],
        comments: (input as any).comments !== undefined ? (input as any).comments : undefined,
        raw_data: (input as any).raw_data !== undefined ? (input as any).raw_data : undefined,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update issue');
    }

    const json = await resp.json();
    return json.data;
  },

  // Move issue status (drag & drop between TO DO / IN PROGRESS / DONE)
  moveIssueStatus: async (issueId: string, status: FjtStatus): Promise<FjtIssue> => {
    const resp = await fetch(`${API_BASE}/api/fjt-board/issues/${issueId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update issue status');
    }

    const json = await resp.json();
    return json.data;
  },

  // Move issue to sprint
  moveIssueSprint: async (issueId: string, sprintId: string | null): Promise<FjtIssue> => {
    const resp = await fetch(`${API_BASE}/api/fjt-board/issues/${issueId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ sprintId }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to move issue to sprint');
    }

    const json = await resp.json();
    return json.data;
  },

  // Soft delete issue
  deleteIssue: async (issueId: string): Promise<void> => {
    const resp = await fetch(`${API_BASE}/api/fjt-board/issues/${issueId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete issue');
    }
  },

  // Update Epic in Database
  updateEpic: async (
    epicId: string,
    input: {
      epicName?: string;
      summary?: string;
      color?: string;
      status?: FjtStatus;
      startDate?: string;
      dueDate?: string;
    }
  ): Promise<FjtEpic> => {
    const resp = await fetch(`${API_BASE}/api/fjt-board/epics/${epicId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        epic_name: input.epicName || input.summary,
        summary: input.summary || input.epicName,
        color: input.color,
        status: input.status,
        start_date: input.startDate,
        due_date: input.dueDate,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update epic');
    }

    const json = await resp.json();
    const epicData = json.data || {};
    return {
      ...epicData,
      epicName: epicData.epicName || epicData.epic_name || epicData.name || epicData.summary,
      name: epicData.name || epicData.epicName || epicData.epic_name || epicData.summary,
    };
  },

  // Create sprint in Database
  createSprint: async (
    input:
      | string
      | {
          name: string;
          goal?: string;
          status?: 'active' | 'future' | 'closed';
          startDate?: string;
          startTime?: string;
          endDate?: string;
          endTime?: string;
          projectId?: string;
        }
  ): Promise<FjtSprint> => {
    const payload =
      typeof input === 'string'
        ? { name: input, status: 'future' }
        : {
            name: input.name,
            goal: input.goal,
            status: input.status || 'future',
            start_date: input.startDate,
            end_date: input.endDate,
          };

    const resp = await fetch(`${API_BASE}/api/fjt-board/sprints`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create sprint');
    }

    const json = await resp.json();
    return json.data;
  },

  // Update sprint in Database
  updateSprint: async (sprint: {
    id: string;
    name?: string;
    goal?: string;
    status?: 'active' | 'future' | 'closed';
    startDate?: string;
    endDate?: string;
  }): Promise<FjtSprint> => {
    const resp = await fetch(`${API_BASE}/api/fjt-board/sprints/${sprint.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        name: sprint.name,
        goal: sprint.goal,
        status: sprint.status,
        start_date: sprint.startDate,
        end_date: sprint.endDate,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update sprint');
    }

    const json = await resp.json();
    return json.data;
  },

  // Delete sprint
  deleteSprint: async (sprintId: string): Promise<void> => {
    // Soft update status to closed or delete
    await fetch(`${API_BASE}/api/fjt-board/sprints/${sprintId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ is_deleted: true }),
    });
  },

  // Create project directly in PostgreSQL database
  createProject: async (input: {
    key: string;
    name: string;
    description?: string;
    category?: string;
    leadUserId?: string;
    lead?: string;
    sprintIds?: string[];
  }): Promise<FjtProject> => {
    const resp = await fetch(`${API_BASE}/api/fjt-board/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        key: input.key.toUpperCase(),
        name: input.name,
        description: input.description,
        category: input.category || 'Software',
        lead_user_id: input.leadUserId,
        lead: input.lead || '-',
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create project');
    }

    const json = await resp.json();
    const created: FjtProject = json.data;

    // Set active project id in local storage pointer for user session
    localStorage.setItem('airm_fjt_active_project_id', created.id);
    return created;
  },

  // Switch / set active project
  setCurrentProject: async (projectId: string): Promise<void> => {
    localStorage.setItem('airm_fjt_active_project_id', projectId);
  },

  // Complete sprint
  completeSprint: async (sprintId: string): Promise<void> => {
    await fetch(`${API_BASE}/api/fjt-board/sprints/${sprintId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: 'closed' }),
    });
  },

  // Upload image or document attachment to GCP Cloud Storage bucket
  uploadAttachment: async (file: File): Promise<{ url: string; originalname?: string; mimetype?: string }> => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
    const formData = new FormData();
    formData.append('file', file);

    const resp = await fetch(`${API_BASE}/api/fjt-board/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upload attachment to storage');
    }

    const json = await resp.json();
    if (!json.success || !json.data?.url) {
      throw new Error(json.message || 'Upload failed');
    }

    return json.data;
  },

  // Reset helper - no-op now since dummy data is removed
  resetToDefault: async (): Promise<void> => {
    // No mock demo data
  },
};
