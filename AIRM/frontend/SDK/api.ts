/**
 * API Client for Backend
 * Uses PostgreSQL database via Express.js backend
 */

// Get API base URL from environment variable, with localhost fallback for local development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Warn in production if VITE_API_BASE_URL is not set
if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  console.warn('⚠️  WARNING: VITE_API_BASE_URL not set in production build. Using localhost fallback.');
}

// Get auth token from localStorage
const getToken = () => {
  return localStorage.getItem('auth_token');
};

// API request helper
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const fullUrl = `${API_BASE_URL}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  console.log(`📡 API Request: ${options.method || 'GET'} ${fullUrl}`);
  if (token) {
    console.log('📡 Auth token present:', token.substring(0, 20) + '...');
  } else {
    console.warn('⚠️ No auth token found!');
  }

  const doFetch = async (url: string) =>
    fetch(url, {
      ...options,
      // Avoid cached 304 responses (304 has no body and breaks response.json())
      cache: 'no-store',
      headers: {
        ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        'Cache-Control': 'no-cache',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

  // If headers explicitly unset Content-Type (e.g. for FormData boundary auto-generation), remove it
  if (options.headers && 'Content-Type' in options.headers && (options.headers as any)['Content-Type'] === undefined) {
    // It's already omitted by the spread if not set, but we might need to actively remove if merged
  }

  try {
    let response = await doFetch(fullUrl);

    // If some proxy/browser still returns 304, retry once with a cache-busting query param.
    if (response.status === 304) {
      const bust = fullUrl.includes('?') ? '&' : '?';
      response = await doFetch(`${fullUrl}${bust}_cb=${Date.now()}`);
    }

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Handle connection errors more gracefully
      if (response.status === 0 || response.type === 'error') {
        console.error('❌ Connection error - server may not be running');
        throw new Error(`Cannot connect to server at ${API_BASE_URL}. Please check your VITE_API_BASE_URL configuration.`);
      }
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      console.error('❌ API Error:', error);
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    // Some responses (e.g. 204) have no body
    const data = await response.json().catch(() => ({} as any));
    console.log(`✅ API Success: ${endpoint}`, data);
    return data;
  } catch (error: any) {
    console.error(`❌ API Request failed for ${endpoint}:`, error);
    throw error;
  }
}

// API methods
export const api = {
  // Direct HTTP methods
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    }),

  put: <T>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  // Auth
  auth: {
    sendMagicLink: (email: string) =>
      apiRequest('/auth/send-magic-link', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),

    verifyMagicLink: (token: string) =>
      apiRequest('/auth/verify-magic-link', {
        method: 'POST',
        body: JSON.stringify({ token })
      }),

    getMe: () => apiRequest('/auth/me'),

    updateProfile: (data: { full_name?: string }) =>
      apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Projects
  projects: {
    getAll: () => apiRequest('/projects'),

    getById: (id: string) => apiRequest(`/projects/${id}`),

    create: (data: {
      name: string;
      description?: string;
      visibility?: 'private' | 'internal' | 'public';
    }) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: any) =>
      apiRequest(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: string) =>
      apiRequest(`/projects/${id}`, { method: 'DELETE' }),

    getMembers: (id: string) => apiRequest(`/projects/${id}/members`),

    addMember: (id: string, data: { user_id: string; access_level?: number }) =>
      apiRequest(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // Issues
  issues: {
    getAll: (params?: { status?: string; assignee?: string }) => {
      const query = new URLSearchParams(params as any).toString();
      return apiRequest(`/issues?${query}`);
    },

    getById: (id: string) => apiRequest(`/issues/${id}`),

    create: (data: any) =>
      apiRequest('/issues', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: any) =>
      apiRequest(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    addComment: (id: string, comment: string) =>
      apiRequest(`/issues/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),

    assignUser: (id: string, user_id: string) =>
      apiRequest(`/issues/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ user_id }),
      }),

    assignUsers: (id: string, user_ids: string[]) =>
      apiRequest(`/issues/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ user_ids }),
      }),

    unassignUser: (id: string, user_id: string) =>
      apiRequest(`/issues/${id}/assign/${user_id}`, {
        method: 'DELETE',
      }),

    addLabel: (id: string, label_id: string) =>
      apiRequest(`/issues/${id}/labels`, {
        method: 'POST',
        body: JSON.stringify({ label_id }),
      }),

    removeLabel: (id: string, label_id: string) =>
      apiRequest(`/issues/${id}/labels/${label_id}`, {
        method: 'DELETE',
      }),

    delete: (id: string) =>
      apiRequest(`/issues/${id}`, {
        method: 'DELETE'
      }),

    logTime: (id: string, data: { duration: number; comment?: string }) =>
      apiRequest(`/issues/${id}/log-time`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateActivity: (issueId: string, activityId: string, data: { duration?: number; comment?: string }) =>
      apiRequest(`/issues/${issueId}/activity/${activityId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Timesheets
  timesheets: {
    clockIn: (data: any) =>
      apiRequest('/timesheets/clock-in', { method: 'POST', body: JSON.stringify(data) }),

    clockOut: (data?: { comment?: string }) =>
      apiRequest('/timesheets/clock-out', { method: 'POST', body: JSON.stringify(data || {}) }),

    pause: (data?: { reason?: string }) =>
      apiRequest('/timesheets/pause', { method: 'POST', body: JSON.stringify(data || {}) }),

    resume: () =>
      apiRequest('/timesheets/resume', { method: 'POST' }),

    getCurrent: () => apiRequest('/timesheets/current'),

    getEntries: (params?: any) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/timesheets/entries?${query}`);
    },

    getTimesheets: (params?: { week_start?: string; user_id?: string }) => {
      const query = new URLSearchParams(params as any).toString();
      const url = `/timesheets${query ? `?${query}` : ''}`;
      console.log('🌐 Frontend calling:', `${API_BASE_URL}${url}`);
      console.log('🌐 With params:', params);
      return apiRequest(url);
    },

    getActive: () => apiRequest('/timesheets/active'),

    save: (data: { week_start: string; entries: any[] }) =>
      apiRequest('/timesheets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Users
  users: {
    getAll: () => apiRequest('/users'),

    getWithRoles: () => apiRequest('/users/with-roles'),

    updateRole: (id: string, role: string) =>
      apiRequest(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),

    create: (data: { email: string; full_name?: string; role?: string }) =>
      apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest(`/users/${id}`, {
        method: 'DELETE',
      }),
  },

  // Profiles
  profiles: {
    getAll: () => apiRequest('/profiles'),

    getById: (id: string) => apiRequest(`/profiles/${id}`),

    update: (id: string, data: {
      phone?: string;
      skills?: string[];
      join_date?: string;
      experience_years?: number;
      previous_projects?: any[];
      bio?: string;
      linkedin_url?: string;
      github_url?: string;
      full_name?: string;
      job_title?: string;
      department?: string;
      employment_type?: string;
      employee_id?: string;
      reporting_manager?: string;
      personal_email?: string;
      emergency_contact?: string;
      education?: any[];
      certifications?: any[];
      project_history?: any[];
      performance_reviews?: any[];
      documents?: any[];
      burnout_score?: number;
    }) =>
      apiRequest(`/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Notifications
  notifications: {
    getAll: (unreadOnly?: boolean) => {
      const query = unreadOnly ? '?unread_only=true' : '';
      return apiRequest(`/notifications${query}`);
    },

    markRead: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),

    markAllRead: () =>
      apiRequest('/notifications/read-all', { method: 'PUT' }),

    getUnreadCount: () => apiRequest('/notifications/unread-count'),
  },

  // Leave
  leave: {
    getAll: () => apiRequest('/leave'),

    create: (data: any) =>
      apiRequest('/leave', { method: 'POST', body: JSON.stringify(data) }),

    updateStatus: (id: string, status: string, admin_notes?: string) =>
      apiRequest(`/leave/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, admin_notes }),
      }),
  },

  // Leave Calendar (extended features)
  leaveCalendar: {
    // Leave Balances
    getBalances: () => apiRequest('/leave-calendar/balances'),

    getBalancesForUser: (userId: string) =>
      apiRequest(`/leave-calendar/balances/${userId}`),

    updateBalance: (data: {
      user_id: string;
      leave_type: string;
      financial_year: string;
      opening_balance: number;
      availed: number;
      balance: number;
      lapse: number;
      lapse_date?: string;
    }) => apiRequest('/leave-calendar/balances', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

    // Shift Roster
    getShifts: (start_date: string, end_date: string) =>
      apiRequest(`/leave-calendar/shifts?start_date=${start_date}&end_date=${end_date}`),

    updateShift: (data: {
      user_id: string;
      date: string;
      shift_type: string;
      start_time: string;
      end_time: string;
    }) => apiRequest('/leave-calendar/shifts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

    // Attendance
    getAttendance: (start_date: string, end_date: string) =>
      apiRequest(`/leave-calendar/attendance?start_date=${start_date}&end_date=${end_date}`),

    updateAttendance: (data: {
      user_id: string;
      date: string;
      status?: string;
      clock_in?: string;
      clock_out?: string;
      total_hours?: number;
    }) => apiRequest('/leave-calendar/attendance', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  },

  // Labels
  labels: {
    getAll: () => apiRequest('/labels'),

    create: (data: any) =>
      apiRequest('/labels', { method: 'POST', body: JSON.stringify(data) }),

    delete: (id: string) =>
      apiRequest(`/labels/${id}`, { method: 'DELETE' }),
  },

  // Git
  git: {
    getCommits: (repo?: string) => apiRequest(`/git/commits${repo ? `?repo=${repo}` : ''}`),

    getIssues: (repo?: string) => apiRequest(`/git/issues${repo ? `?repo=${repo}` : ''}`),

    getCommit: (sha: string) => apiRequest(`/git/commits/${sha}`),

    getIssue: (id: string) => apiRequest(`/git/issues/${id}`),
    getRepos: () => apiRequest('/git/repos'),
    createIssue: (data: any) => apiRequest('/git/issues', { method: 'POST', body: JSON.stringify(data) }),
    addComment: (id: string, content: string) => apiRequest(`/git/issues/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
    updateIssue: (id: string, data: any) => apiRequest(`/git/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    getRepoLabels: () => apiRequest('/git/repo/labels'),
    getRepoAssignees: () => apiRequest('/git/repo/assignees'),

    syncUsers: () => apiRequest('/git/sync-users', { method: 'POST' }),

    syncIssues: () => apiRequest('/git/sync-issues', { method: 'POST' }),

    getUsers: () => apiRequest('/git/users'),
  },

  // HR Documents
  hrDocuments: {
    uploadTemplate: (type: string, file: File) => {
      const formData = new FormData();
      formData.append('templateType', type);
      formData.append('template', file);
      return apiRequest('/hr-documents/template/upload', {
        method: 'POST',
        body: formData,
      });
    },
    getTemplate: async (type: string) => {
      const token = localStorage.getItem('auth_token');
      const url = `${API_BASE_URL}/api/hr-documents/template/${type}`;
      const response = await fetch(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) {
        throw new Error('Template not found');
      }
      return response.blob();
    }
  },
};

