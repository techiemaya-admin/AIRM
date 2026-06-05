/**
 * GitLab Service
 * GitLab API integration for projects
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
 * Update project in GitLab
 */
export async function updateGitLabProject(gitlabProjectId, updates) {
  const response = await gitlabApi.put(`/projects/${gitlabProjectId}`, updates);
  return response.data;
}

/**
 * Delete project from GitLab
 */
export async function deleteGitLabProject(gitlabProjectId) {
  await gitlabApi.delete(`/projects/${gitlabProjectId}`);
}

/**
 * Get project members from GitLab
 */
export async function getProjectMembers(gitlabProjectId) {
  const response = await gitlabApi.get(`/projects/${gitlabProjectId}/members/all`);
  return response.data;
}

/**
 * Add member to GitLab project
 */
export async function addProjectMember(gitlabProjectId, userId, accessLevel) {
  const response = await gitlabApi.post(`/projects/${gitlabProjectId}/members`, {
    user_id: userId,
    access_level: accessLevel
  });
  return response.data;
}

