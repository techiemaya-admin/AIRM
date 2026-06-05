/**
 * GitLab Service for Issues
 * GitLab API integration for issue operations
 */

import axios from 'axios';

// GitLab configuration
const GITLAB_URL = process.env.GITLAB_URL || 'https://git.techiemaya.com';
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const GITLAB_API = `${GITLAB_URL}/api/v4`;

/**
 * GitLab API helper
 */
const gitlabApi = axios.create({
  baseURL: GITLAB_API,
  headers: {
    'Authorization': `Bearer ${GITLAB_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Create issue in GitLab
 */
export async function createGitLabIssue(gitlabProjectId, issueData) {
  const { title, description, labelNames, assigneeIds, estimateHours, dueDate } = issueData;

  const gitlabIssueData = {
    title: title,
    description: description || '',
    labels: labelNames || [],
    assignee_ids: assigneeIds || [],
    weight: estimateHours ? Math.ceil(estimateHours) : null,
    due_date: dueDate || null
  };

  const response = await gitlabApi.post(`/projects/${gitlabProjectId}/issues`, gitlabIssueData);
  return response.data;
}

/**
 * Update issue in GitLab
 */
export async function updateGitLabIssue(gitlabProjectId, gitlabIid, updates) {
  const gitlabUpdateData = {};
  if (updates.title) gitlabUpdateData.title = updates.title;
  if (updates.description !== undefined) gitlabUpdateData.description = updates.description;
  if (updates.status) gitlabUpdateData.state_event = updates.status === 'closed' ? 'close' : 'reopen';
  if (updates.estimate_hours !== undefined) gitlabUpdateData.weight = Math.ceil(updates.estimate_hours) || null;
  if (updates.due_date !== undefined) gitlabUpdateData.due_date = updates.due_date;
  if (updates.assignee_ids) gitlabUpdateData.assignee_ids = updates.assignee_ids;

  if (Object.keys(gitlabUpdateData).length > 0) {
    await gitlabApi.put(`/projects/${gitlabProjectId}/issues/${gitlabIid}`, gitlabUpdateData);
  }
}

/**
 * Post comment to GitLab
 */
export async function postCommentToGitLab(gitlabProjectId, gitlabIid, comment) {
  await gitlabApi.post(`/projects/${gitlabProjectId}/issues/${gitlabIid}/notes`, {
    body: comment
  });
}

/**
 * Delete issue in GitLab
 */
export async function deleteGitLabIssue(gitlabProjectId, gitlabIid) {
  await gitlabApi.delete(`/projects/${gitlabProjectId}/issues/${gitlabIid}`);
}

