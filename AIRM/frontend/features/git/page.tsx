import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@sdk/api';
import { TableSkeleton } from '@/components/PageSkeletons';

interface Commit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  created_at: string;
  web_url: string;
}

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  language: string;
  stars: number;
  forks: number;
  updated_at: string;
  private: boolean;
}

interface IssueNote {
  id: number;
  body: string;
  author: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
}

interface GitUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitLabel {
  id: number;
  name: string;
  color: string;
  description: string;
}

interface Issue {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  repository?: string;
  created_at: string;
  updated_at: string;
  author: {
    login: string;
    avatar_url: string;
  };
  assignees: GitUser[];
  labels: GitLabel[];
  web_url: string;
  notes?: IssueNote[];
}

export default function Git({ defaultRepo = null }: { defaultRepo?: string | null }) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'commits' | 'issues' | 'repos' | 'sync'>('commits');
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'detail' | 'new'>('list');
  const [filterRepo, setFilterRepo] = useState<string | null>(defaultRepo);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newIssue, setNewIssue] = useState({ 
    title: '', 
    description: '', 
    labels: [] as string[],
    assignees: [] as string[]
  });
  const [creatingIssue, setCreatingIssue] = useState(false);
  
  // Repo-wide entities for dropdowns
  const [repoLabels, setRepoLabels] = useState<GitLabel[]>([]);
  const [repoAssignees, setRepoAssignees] = useState<GitUser[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  useEffect(() => {
    fetchGitData(filterRepo);
  }, [filterRepo]);

  useEffect(() => {
    if (defaultRepo) setFilterRepo(defaultRepo);
  }, [defaultRepo]);

  const fetchGitData = async (repoName: string | null = null) => {
    try {
      setLoading(true);
      const [commitsData, issuesData, reposData, labelsData, assigneesData] = await Promise.all([
        api.git.getCommits(repoName || undefined),
        api.git.getIssues(repoName || undefined),
        api.git.getRepos(),
        api.git.getRepoLabels(),
        api.git.getRepoAssignees()
      ]);
      console.log('Repos data received:', reposData);
      
      setCommits(Array.isArray(commitsData) ? commitsData : []);
      setIssues(Array.isArray(issuesData) ? issuesData : []);
      setRepos(Array.isArray(reposData) ? reposData : []);
      setRepoLabels(Array.isArray(labelsData) ? labelsData : []);
      setRepoAssignees(Array.isArray(assigneesData) ? assigneesData : []);
    } catch (error) {
      console.error('Error fetching Git data:', error);
      setCommits([]);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const syncUsers = async () => {
    try {
      setSyncing(true);
      const result: any = await api.git.syncUsers();
      alert(`✅ ${result.message}`);
    } catch (error) {
      console.error('Error syncing users:', error);
      alert('❌ Error syncing users');
    } finally {
      setSyncing(false);
    }
  };

  const syncIssues = async () => {
    try {
      setSyncing(true);
      const result: any = await api.git.syncIssues();
      alert(`✅ ${result.message}`);
      // Refresh issues data
      fetchGitData();
    } catch (error) {
      console.error('Error syncing issues:', error);
      alert('❌ Error syncing issues');
    } finally {
      setSyncing(false);
    }
  };

  const showIssueDetail = async (iid: number, repo?: string) => {
    try {
      setLoadingDetail(true);
      setActiveSubTab('detail');
      const issueDetail = await api.git.getIssue(iid.toString(), repo);
      setSelectedIssue(issueDetail as any);
    } catch (error) {
      console.error('Error fetching issue detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedIssue || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      await api.git.addComment(selectedIssue.iid.toString(), newComment, selectedIssue.repository);
      setNewComment('');
      // Refresh issue details to show new comment
      await showIssueDetail(selectedIssue.iid, selectedIssue.repository);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment to GitHub');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssue.title.trim()) return;

    try {
      setCreatingIssue(true);
      const created: any = await api.git.createIssue({...newIssue, repository: filterRepo || undefined});
      alert(`✅ Issue created in ${filterRepo || 'default repo'}: #${created.number || created.iid}`);
      setNewIssue({ 
        title: '', 
        description: '', 
        labels: [],
        assignees: []
      });
      setActiveSubTab('list');
      fetchGitData(filterRepo); // Refresh list with current filter
    } catch (error) {
      console.error('Error creating issue:', error);
      alert('Failed to create issue on GitHub');
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleUpdateIssue = async (updates: any) => {
    if (!selectedIssue) return;
    try {
      await api.git.updateIssue(selectedIssue.iid.toString(), {
        ...updates,
        repository: selectedIssue.repository
      });
      await showIssueDetail(selectedIssue.iid, selectedIssue.repository);
    } catch (error) {
      console.error('Error updating issue:', error);
      alert('Failed to update issue on GitHub');
    }
  };

  return (
    <div className="w-full px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">GitHub Activities</h1>
          <p className="text-sm text-muted-foreground">
            Monitor real-time updates and manage GitHub issues
          </p>
        </div>
        {syncing && (
          <div className="flex items-center gap-2 text-blue-600 animate-pulse text-sm font-medium">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Syncing...
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('commits')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'commits'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Recent Commits
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'issues'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Issues
        </button>
        <button
          onClick={() => setActiveTab('repos')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'repos'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Repositories
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'sync'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Sync
        </button>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} cols={3} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Commits Tab */}
          {activeTab === 'commits' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                  </svg>
                  Recent Commits ({commits.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {commits.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium">No commits found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Git repository data is not available or there are no recent commits.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commits.map((commit) => (
                      <div
                        key={commit.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium leading-none mb-2">
                              {commit.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {commit.author_name}
                              </span>
                              <span>
                                {formatDistanceToNow(new Date(commit.created_at), { addSuffix: true })}
                              </span>
                              <code className="px-2 py-1 bg-muted rounded font-mono text-xs">
                                {commit.short_id}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && (
            <div className="space-y-6">
              {activeSubTab === 'list' ? (
                <Card>
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Issues ({issues.length})
                        </CardTitle>
                        {filterRepo && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium animate-in zoom-in-95 duration-200">
                            <span>Repo: <strong>{filterRepo}</strong></span>
                            <button 
                              onClick={() => setFilterRepo(null)}
                              className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                              title="Clear filter"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveSubTab('new')}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm"
                      >
                        New Issue
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {issues.length === 0 ? (
                      <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium">No issues found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Git repository data is not available or there are no open issues.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {issues.map((issue) => (
                          <div
                            key={issue.id}
                            onClick={() => showIssueDetail(issue.iid, issue.repository)}
                            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    #{issue.iid}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${issue.state === 'opened'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                    }`}>
                                    {issue.state}
                                  </span>
                                </div>
                                <h3 className="font-medium leading-none mb-2">
                                  {issue.title}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Created by {issue.author.login}</span>
                                  <span>
                                    {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                                  </span>
                                  {issue.assignees && issue.assignees.length > 0 && (
                                    <div className="flex -space-x-2 overflow-hidden">
                                      {issue.assignees.map(a => (
                                        <img key={a.id} src={a.avatar_url} className="inline-block h-5 w-5 rounded-full ring-2 ring-background" title={a.login} alt={a.login} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {issue.labels.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {issue.labels.map((label) => (
                                      <span
                                        key={label.id}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
                                        style={{ 
                                          backgroundColor: `#${label.color}22`,
                                          borderColor: `#${label.color}`,
                                          color: `#${label.color}`
                                        }}
                                      >
                                        {label.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : activeSubTab === 'new' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button
                    onClick={() => setActiveSubTab('list')}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to issues
                  </button>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span>Create New Issue on GitHub</span>
                        {filterRepo && (
                          <span className="text-xs font-normal text-muted-foreground bg-blue-50 px-2 py-1 rounded border border-blue-100">
                            Target: <strong className="text-blue-700">{filterRepo}</strong>
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Title</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Issue title"
                            value={newIssue.title}
                            onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none min-h-[150px]"
                            placeholder="Describe the issue..."
                            value={newIssue.description}
                            onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                          {/* Assignees Selection */}
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assignees</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {newIssue.assignees.map(login => (
                                <span key={login} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                                  {login}
                                  <button onClick={() => setNewIssue({...newIssue, assignees: newIssue.assignees.filter(a => a !== login)})}>
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                            <select 
                              className="w-full text-xs border rounded-md p-1.5 outline-none"
                              onChange={(e) => {
                                if (e.target.value && !newIssue.assignees.includes(e.target.value)) {
                                  setNewIssue({...newIssue, assignees: [...newIssue.assignees, e.target.value]});
                                }
                              }}
                              value=""
                            >
                              <option value="">Add Assignee...</option>
                              {repoAssignees.map(user => (
                                <option key={user.id} value={user.login}>{user.login}</option>
                              ))}
                            </select>
                          </div>

                          {/* Labels Selection */}
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Labels</label>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {newIssue.labels.map(name => {
                                const labelData = repoLabels.find(l => l.name === name);
                                return (
                                  <span 
                                    key={name} 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                    style={{ 
                                      backgroundColor: labelData ? `#${labelData.color}22` : '#eee',
                                      borderColor: labelData ? `#${labelData.color}` : '#ccc',
                                      color: labelData ? `#${labelData.color}` : '#666'
                                    }}
                                  >
                                    {name}
                                    <button onClick={() => setNewIssue({...newIssue, labels: newIssue.labels.filter(l => l !== name)})}>
                                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                            <select 
                              className="w-full text-xs border rounded-md p-1.5 outline-none"
                              onChange={(e) => {
                                if (e.target.value && !newIssue.labels.includes(e.target.value)) {
                                  setNewIssue({...newIssue, labels: [...newIssue.labels, e.target.value]});
                                }
                              }}
                              value=""
                            >
                              <option value="">Add Label...</option>
                              {repoLabels.map(label => (
                                <option key={label.id} value={label.name}>{label.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={() => setActiveSubTab('list')}
                            className="px-4 py-2 border rounded-md hover:bg-muted transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateIssue}
                            disabled={creatingIssue || !newIssue.title.trim()}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm disabled:opacity-50"
                          >
                            {creatingIssue ? 'Creating...' : 'Submit New Issue'}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button
                    onClick={() => setActiveSubTab('list')}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to issues
                  </button>

                  {loadingDetail ? (
                    <Card>
                      <CardHeader>
                        <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="h-4 w-full bg-muted animate-pulse rounded" />
                          <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ) : selectedIssue && (
                    <div className="space-y-6">
                      <div className="border-b pb-4 mb-6">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold">{selectedIssue.title}</h2>
                          <span className="text-2xl font-light text-muted-foreground">#{selectedIssue.iid}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${selectedIssue.state === 'opened'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                            }`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {selectedIssue.state === 'opened' ? 'Open' : 'Closed'}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            <span className="font-semibold text-foreground">{selectedIssue.author.login}</span> opened this issue {formatDistanceToNow(new Date(selectedIssue.created_at), { addSuffix: true })} · {selectedIssue.notes?.length || 0} comments
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                          {/* Issue Description */}
                          <div className="border rounded-lg overflow-hidden">
                            <div className="bg-muted px-4 py-2 flex items-center justify-between border-b">
                              <span className="text-sm font-semibold">{selectedIssue.author.login} commented {formatDistanceToNow(new Date(selectedIssue.created_at), { addSuffix: true })}</span>
                              <span className="text-xs bg-muted-foreground/10 px-2 py-0.5 rounded border">Owner</span>
                            </div>
                            <div className="p-4 bg-background prose prose-sm max-w-none">
                              {selectedIssue.description ? (
                                <p className="whitespace-pre-wrap">{selectedIssue.description}</p>
                              ) : (
                                <p className="italic text-muted-foreground">No description provided.</p>
                              )}
                            </div>
                          </div>

                          {/* Timeline/Comments */}
                          <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-0 before:bottom-0 before:w-0.5 before:bg-muted">
                            {selectedIssue.notes?.map((note) => (
                              <div key={note.id} className="relative">
                                <span className="absolute -left-8 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-muted border-2 border-background z-10">
                                  <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                  </svg>
                                </span>
                                <div className="border rounded-lg overflow-hidden">
                                  <div className="bg-muted px-4 py-2 flex items-center justify-between border-b">
                                    <span className="text-sm font-semibold">{note.author.login} commented {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
                                  </div>
                                  <div className="p-4 bg-background prose prose-sm max-w-none">
                                    <p className="whitespace-pre-wrap">{note.body}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Comment Box */}
                          <div className="mt-8 border rounded-lg overflow-hidden">
                            <div className="bg-muted px-4 py-2 border-b">
                              <span className="text-sm font-semibold">Add a comment</span>
                            </div>
                            <div className="p-4 bg-background">
                              <textarea
                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-sm"
                                placeholder="Write a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                              ></textarea>
                              <div className="flex justify-end mt-3">
                                <button
                                  onClick={handleAddComment}
                                  disabled={submittingComment || !newComment.trim()}
                                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1.5 px-4 rounded-md transition-colors disabled:opacity-50"
                                >
                                  {submittingComment ? 'Posting...' : 'Comment'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                          {/* Assignees */}
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignees</h4>
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === 'assignees' ? null : 'assignees')}
                                className="text-[10px] text-muted-foreground hover:text-blue-600"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0-7a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 1c3.866 0 7 3.134 7 7s-3.134 7-7 7-7-3.134-7-7 3.134-7 7-7Z"/></svg>
                              </button>
                            </div>
                            
                            {activeDropdown === 'assignees' && (
                              <div className="absolute right-0 top-6 w-64 bg-background border rounded-md shadow-lg z-50 overflow-hidden">
                                <div className="p-2 border-b bg-muted/30 text-[10px] font-bold">Assign up to 10 people to this issue</div>
                                <div className="max-h-60 overflow-y-auto">
                                  {repoAssignees.map(user => {
                                    const isAssigned = selectedIssue.assignees?.some(a => a.id === user.id);
                                    return (
                                      <button
                                        key={user.id}
                                        onClick={() => {
                                          const newAssignees = isAssigned 
                                            ? selectedIssue.assignees.filter(a => a.id !== user.id).map(a => a.login)
                                            : [...(selectedIssue.assignees?.map(a => a.login) || []), user.login];
                                          handleUpdateIssue({ assignees: newAssignees });
                                        }}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left text-sm"
                                      >
                                        <div className="w-4 h-4 flex items-center justify-center">
                                          {isAssigned && <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.42-6.446z"/></svg>}
                                        </div>
                                        <img src={user.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                                        <span className="font-medium">{user.login}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {selectedIssue.assignees && selectedIssue.assignees.length > 0 ? (
                              <div className="space-y-2">
                                {selectedIssue.assignees.map(user => (
                                  <div key={user.id} className="flex items-center gap-2">
                                    <img src={user.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                                    <span className="text-sm text-foreground">{user.login}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">No one assigned</span>
                            )}
                          </div>

                          {/* Labels */}
                          <div className="border-t pt-4 relative">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</h4>
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === 'labels' ? null : 'labels')}
                                className="text-[10px] text-muted-foreground hover:text-blue-600"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0-7a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 1c3.866 0 7 3.134 7 7s-3.134 7-7 7-7-3.134-7-7 3.134-7 7-7Z"/></svg>
                              </button>
                            </div>

                            {activeDropdown === 'labels' && (
                              <div className="absolute right-0 top-10 w-64 bg-background border rounded-md shadow-lg z-50 overflow-hidden">
                                <div className="p-2 border-b bg-muted/30 text-[10px] font-bold">Apply labels to this issue</div>
                                <div className="max-h-60 overflow-y-auto">
                                  {repoLabels.map(label => {
                                    const isSelected = selectedIssue.labels?.some(l => 
                                      (typeof l === 'string' ? l : l.name) === label.name
                                    );
                                    return (
                                      <button
                                        key={label.id}
                                        onClick={() => {
                                          const currentLabels = selectedIssue.labels.map(l => typeof l === 'string' ? l : l.name);
                                          const newLabels = isSelected 
                                            ? currentLabels.filter(n => n !== label.name)
                                            : [...currentLabels, label.name];
                                          handleUpdateIssue({ labels: newLabels });
                                        }}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left text-sm"
                                      >
                                        <div className="w-4 h-4 flex items-center justify-center">
                                          {isSelected && <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.42-6.446z"/></svg>}
                                        </div>
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `#${label.color}` }}></div>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{label.name}</span>
                                          {label.description && <span className="text-[10px] text-muted-foreground truncate w-40">{label.description}</span>}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {selectedIssue.labels && selectedIssue.labels.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {selectedIssue.labels.map(label => (
                                  <span 
                                    key={label.id} 
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                    style={{ 
                                      backgroundColor: `#${label.color}22`,
                                      borderColor: `#${label.color}`,
                                      color: `#${label.color}`
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">None yet</span>
                            )}
                          </div>


                          <div className="border-t pt-4">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">GitHub</h4>
                            <a
                              href={selectedIssue.web_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              View on GitHub
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Repositories Tab */}
          {activeTab === 'repos' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.578.688.48C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  GitHub Repositories ({repos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {repos.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No repositories found for this user.</p>
                    </div>
                  ) : (
                    repos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => {
                          setFilterRepo(repo.name);
                          setActiveTab('issues');
                        }}
                        className="block group cursor-pointer"
                      >
                        <Card className="h-full hover:border-blue-500 hover:shadow-md transition-all">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                                {repo.name}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <a 
                                  href={repo.html_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  title="View on GitHub"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                                {repo.private ? (
                                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded border">Private</span>
                                ) : (
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Public</span>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                              {repo.description || "No description provided."}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {repo.language && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  {repo.language}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {repo.stars}
                              </span>
                              <span>
                                Updated {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}


          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔄 GitHub Integration & Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      GitHub to Pulse Mapping
                    </h3>
                    <p className="text-blue-800 mb-3">
                      Sync GitHub users, projects, and issues with your Pulse HRMS system.
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• GitHub Users → Pulse Users</li>
                      <li>• GitHub Issues → Pulse Issues</li>
                      <li>• GitHub Commits → Development Activities</li>
                      <li>• Project Management & Deployment Integration</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sync Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Import GitHub users into Pulse user management system.
                        </p>
                        <button
                          onClick={syncUsers}
                          disabled={syncing}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {syncing ? 'Syncing...' : 'Sync GitHub Users'}
                        </button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sync Issues</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Import GitHub issues into Pulse project management.
                        </p>
                        <button
                          onClick={syncIssues}
                          disabled={syncing}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {syncing ? 'Syncing...' : 'Sync GitHub Issues'}
                        </button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Syncing will create new users/issues and update existing ones</li>
                      <li>• GitHub data takes priority during sync operations</li>
                      <li>• Users will be assigned 'employee' role by default</li>
                      <li>• Make sure GitHub token is configured in backend .env</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
