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
  getIssue: (id: string) => apiRequest<any>(`/git/issues/${id}`),
  createIssue: (data: any) => apiRequest<any>('/git/issues', { method: 'POST', body: JSON.stringify(data) }),
  addComment: (id: string, content: string) => apiRequest<any>(`/git/issues/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  updateIssue: (id: string, data: any) => apiRequest<any>(`/git/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getRepos: () => apiRequest<any[]>('/git/repos'),
  getRepoLabels: () => apiRequest<any[]>('/git/repo/labels'),
  getRepoAssignees: () => apiRequest<any[]>('/git/repo/assignees'),
  syncUsers: () => apiRequest<any>('/git/sync-users', { method: 'POST' }),
  syncIssues: () => apiRequest<any>('/git/sync-issues', { method: 'POST' }),
};

