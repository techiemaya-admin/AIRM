/**
 * Git Service
 * HTTP calls to backend
 * Feature-prefixed endpoints
 * Typed responses
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not set!');

/**
 * Get auth token from localStorage
 */
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

/**
 * API request helper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const errorMessage = error.message || error.error || `HTTP error! status: ${response.status}`;
    console.error(`[API Error] ${fullUrl}:`, errorMessage, error);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`[API Success] ${fullUrl}:`, data);
  return data;
}

// Add Git-specific API functions
export const git = {
  getCommits: (repo?: string) => apiRequest<any[]>(`/git/commits${repo ? `?repo=${repo}` : ''}`),
  getIssues: (repo?: string) => apiRequest<any[]>(`/git/issues${repo ? `?repo=${repo}` : ''}`),
  getIssue: (id: string, repo?: string) => apiRequest<any>(`/git/issues/${id}${repo ? `?repo=${repo}` : ''}`),
  createIssue: (data: any, repo?: string) => apiRequest<any>('/git/issues', { method: 'POST', body: JSON.stringify({ ...data, repository: repo }) }),
  addComment: (id: string, content: string, repo?: string) => apiRequest<any>(`/git/issues/${id}/comments`, { method: 'POST', body: JSON.stringify({ content, repository: repo }) }),
  updateIssue: (id: string, data: any) => apiRequest<any>(`/git/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getRepos: () => apiRequest<any[]>('/git/repos'),
  getRepoLabels: (repo?: string) => apiRequest<any[]>(`/git/repo/labels${repo ? `?repo=${repo}` : ''}`),
  getRepoAssignees: (repo?: string) => apiRequest<any[]>(`/git/repo/assignees${repo ? `?repo=${repo}` : ''}`),
  getProjects: () => apiRequest<any[]>('/git/projects'),
  getRepoProjects: (owner: string, repo: string) => apiRequest<any[]>(`/git/repos/${owner}/${repo}/projects`),
  getRepoPullRequests: (owner: string, repo: string) => apiRequest<any[]>(`/git/repos/${owner}/${repo}/pulls`),
  addProjectItem: (projectId: string, title: string) => apiRequest<any>('/git/projects/items', { method: 'POST', body: JSON.stringify({ projectId, title }) }),
  getProjectItems: (projectId: string) => apiRequest<any[]>(`/git/projects/${encodeURIComponent(projectId)}/items`),
  getProjectFields: (projectId: string) => apiRequest<any>(`/git/projects/${encodeURIComponent(projectId)}/fields`),
  updateProjectItemStatus: (itemId: string, projectId: string, fieldId: string, optionId: string) => apiRequest<any>(`/git/projects/items/${encodeURIComponent(itemId)}/status`, { method: 'PATCH', body: JSON.stringify({ projectId, fieldId, optionId }) }),
  syncUsers: () => apiRequest<any>('/git/sync-users', { method: 'POST' }),
  syncIssues: () => apiRequest<any>('/git/sync-issues', { method: 'POST' }),
};

