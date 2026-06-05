import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@sdk/api';
import { logger } from "@/lib/logger";

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

interface Issue {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    name: string;
    username: string;
  };
  assignee?: {
    id: number;
    name: string;
    username: string;
  };
  labels: string[];
  web_url: string;
}

export default function Git() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'commits' | 'issues' | 'repositories' | 'sync'>('commits');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  useEffect(() => {
    fetchGitData(selectedRepo);
  }, [selectedRepo]);

  const fetchGitData = async (repoName: string | null = null) => {
    try {
      setLoading(true);
      logger.log('--- Fetching Git Data (DEBUG) ---');
      logger.log('Current repoName param:', repoName);
      const [commitsData, issuesData, reposData] = await Promise.all([
        api.git.getCommits(repoName || undefined), // Fetch commits for specific repo if selected
        api.git.getIssues(repoName || undefined),
        repos.length === 0 ? api.git.getRepos() : Promise.resolve(repos)
      ]);
      logger.log('Received Issues from API:', (issuesData as any)?.length);

      setCommits(Array.isArray(commitsData) ? commitsData : []);
      setIssues(Array.isArray(issuesData) ? issuesData : []);
      if (repos.length === 0 && Array.isArray(reposData)) {
        setRepos(reposData);
      }
    } catch (error) {
      logger.error('Error fetching Git data:', error);
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
      logger.error('Error syncing users:', error);
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
      logger.error('Error syncing issues:', error);
      alert('❌ Error syncing issues');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl bg-red-50/5">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">GIT INTEGRATION (DEBUG)</h1>
        <p className="text-muted-foreground">
          View recent commits and manage project issues
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('commits')}
          className={`whitespace-nowrap flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'commits'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Recent Commits
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`whitespace-nowrap flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'issues'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Issues
        </button>
        <button
          onClick={() => setActiveTab('repositories')}
          className={`whitespace-nowrap flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'repositories'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Repositories
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`whitespace-nowrap flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'sync'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Sync
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading Git data...</p>
        </div>
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
                              {(commit as any).repository && (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {(commit as any).repository}
                                </span>
                              )}
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Issues ({issues.length}) {selectedRepo && <span className="text-sm font-normal text-muted-foreground ml-2">in {selectedRepo}</span>}
                </CardTitle>
                {selectedRepo && (
                  <button 
                    onClick={() => setSelectedRepo(null)}
                    className="text-xs text-primary hover:underline ml-auto"
                  >
                    Clear Filter
                  </button>
                )}
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
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
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
                              <span>Created by {issue.author.name}</span>
                              <span>
                                {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                              </span>
                              {issue.assignee && (
                                <span>Assigned to {issue.assignee.name}</span>
                              )}
                            </div>
                            {issue.labels.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {issue.labels.map((label) => (
                                  <span
                                    key={label}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                  >
                                    {label}
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
          )}

          {/* Repositories Tab */}
          {activeTab === 'repositories' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub Repositories ({repos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {repos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No repositories found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {repos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => {
                          setSelectedRepo(repo.name);
                          setActiveTab('issues');
                        }}
                        className={`border rounded-lg p-5 cursor-pointer transition-colors ${
                          selectedRepo === repo.name 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-primary/50 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{repo.name}</h3>
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">
                            {repo.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                          {repo.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
                              {repo.language}
                            </span>
                          )}
                          <span className="flex flex-row items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            {repo.stars}
                          </span>
                          <span>Updated {formatDistanceToNow(new Date(repo.updated_at))} ago</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                          Import GitLab users into Pulse user management system.
                        </p>
                        <button
                          onClick={syncUsers}
                          disabled={syncing}
                          className="w-full bg-[#1E3A8A] hover:bg-[#152a63] text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                          Import GitLab issues into Pulse project management.
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
