/**
 * Git Service
 * Business logic for Git (GitHub/GitLab) integration
 */

import axios from 'axios';
import pool from '../../../shared/database/connection.js';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'prasad758';
const GITHUB_REPO = process.env.GITHUB_REPO || 'timesheet-version';
const GITHUB_API = 'https://api.github.com';

console.log('GitHub Config:', { GITHUB_OWNER, GITHUB_REPO, hasToken: !!GITHUB_TOKEN });

/**
 * GitHub API helper
 */
const githubApi = axios.create({
  baseURL: GITHUB_API,
  headers: {
    'Authorization': GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : undefined,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }
});

/**
 * Get all commits from GitHub
 */
export async function getCommits(repoName) {
  try {
    if (repoName) {
      const response = await githubApi.get(`/repos/${GITHUB_OWNER}/${repoName}/commits?per_page=20`);
      return response.data.map(commit => ({
        id: commit.sha,
        short_id: commit.sha.substring(0, 8),
        title: commit.commit.message.split('\n')[0],
        message: commit.commit.message,
        author_name: commit.commit.author?.name || 'Unknown',
        author_email: commit.commit.author?.email || '',
        created_at: commit.commit.author?.date,
        web_url: commit.html_url,
        repository: repoName
      }));
    } else {
      // Fetch commits across all repos (top 5 by recent update)
      const reposResponse = await githubApi.get(`/users/${GITHUB_OWNER}/repos?sort=updated&per_page=5`);
      const repos = reposResponse.data;
      
      const commitPromises = repos.map(repo => 
        githubApi.get(`/repos/${GITHUB_OWNER}/${repo.name}/commits?per_page=10`)
          .then(res => res.data.map(commit => ({
            id: commit.sha,
            short_id: commit.sha.substring(0, 8),
            title: commit.commit.message.split('\n')[0],
            message: commit.commit.message,
            author_name: commit.commit.author?.name || commit.author?.login || 'Unknown',
            author_email: commit.commit.author?.email || '',
            created_at: commit.commit.author?.date,
            web_url: commit.html_url,
            repository: repo.name
          })))
          .catch(() => [])
      );
      
      const results = await Promise.all(commitPromises);
      const allCommits = results.flat().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return allCommits.slice(0, 50);
    }
  } catch (error) {
    console.error('Error fetching GitHub commits:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get all issues from GitHub
 */
export async function getIssues(repoName) {
  try {
    console.log('--- Git Service Debug ---');
    console.log('Received repoName param:', repoName);
    const targetRepo = repoName || GITHUB_REPO;
    console.log(`🔍 Fetching GitHub issues for ${GITHUB_OWNER}/${targetRepo}`);
    const response = await githubApi.get(`/repos/${GITHUB_OWNER}/${targetRepo}/issues?per_page=20&state=all`);
    console.log(`✅ GitHub returned ${response.data.length} items`);
    
    // Map GitHub issues to internal format
    return response.data.map(issue => ({
      id: issue.id,
      iid: issue.number,
      title: issue.title,
      description: issue.body || '',
      state: issue.state === 'open' ? 'opened' : 'closed', // GitLab uses 'opened'
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      author: {
        id: issue.user.id,
        name: issue.user.login,
        username: issue.user.login
      },
      assignee: issue.assignee ? {
        id: issue.assignee.id,
        name: issue.assignee.login,
        username: issue.assignee.login
      } : null,
      labels: issue.labels.map(l => l.name),
      web_url: issue.html_url
    }));
  } catch (error) {
    console.error('Error fetching GitHub issues:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get commit details
 */
export async function getCommit(sha) {
  const response = await githubApi.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${sha}`);
  const commit = response.data;
  return {
    id: commit.sha,
    short_id: commit.sha.substring(0, 8),
    title: commit.commit.message.split('\n')[0],
    message: commit.commit.message,
    author_name: commit.commit.author.name,
    author_email: commit.commit.author.email,
    created_at: commit.commit.author.date,
    web_url: commit.html_url
  };
}

/**
 * Get issue details with comments
 */
export async function getIssue(id) {
  // id here is the issue number for GitHub
  const [issueResponse, commentsResponse] = await Promise.all([
    githubApi.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${id}`),
    githubApi.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${id}/comments`).catch(() => ({ data: [] }))
  ]);

  const issue = issueResponse.data;
  return {
    id: issue.id,
    iid: issue.number,
    title: issue.title,
    description: issue.body || '',
    state: issue.state === 'open' ? 'opened' : 'closed',
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    author: {
        id: issue.user.id,
        name: issue.user.login,
        username: issue.user.login
    },
    labels: issue.labels.map(l => l.name),
    web_url: issue.html_url,
    notes: commentsResponse.data.map(comment => ({
      id: comment.id,
      body: comment.body,
      author: {
        name: comment.user.login,
        username: comment.user.login
      },
      created_at: comment.created_at
    }))
  };
}

/**
 * Create a new issue on GitHub
 */
export async function createIssue(data) {
  const response = await githubApi.post(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
    title: data.title,
    body: data.description,
    assignees: data.assignees || [],
    labels: data.labels || []
  });
  
  return response.data;
}

/**
 * Add a comment to a GitHub issue
 */
export async function addComment(issueNumber, content) {
  const response = await githubApi.post(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
    body: content
  });
  
  return response.data;
}

/**
 * Update a GitHub issue (labels, assignees, state)
 */
export async function updateIssue(issueNumber, updates) {
  const response = await githubApi.patch(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`, updates);
  return response.data;
}

/**
 * Sync GitHub users with local users
 */
export async function syncUsers() {
  // In GitHub, we might get contributors or collaborators
  const response = await githubApi.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contributors`);
  const githubUsers = response.data;
  let syncedCount = 0;

  for (const gitUser of githubUsers) {
    try {
      // GitHub contributors don't give email by default, we use username as unique key
      const existingUser = await pool.query(
        'SELECT id FROM erp.users WHERE github_username = $1',
        [gitUser.login]
      );

      if (existingUser.rows.length === 0) {
        // Create a placeholder user
        const insertResult = await pool.query(
          `INSERT INTO erp.users (email, full_name, github_username, created_at) 
           VALUES ($1, $2, $3, NOW()) RETURNING id`,
          [`${gitUser.login}@github.com`, gitUser.login, gitUser.login]
        );
        
        if (insertResult.rows.length > 0) {
          await pool.query(
            `INSERT INTO erp.user_roles (user_id, role, created_at) 
             VALUES ($1, 'user', NOW())`,
            [insertResult.rows[0].id]
          );
        }
        syncedCount++;
      }
    } catch (userError) {
      console.error('Error syncing GitHub user:', gitUser.login, userError.message);
    }
  }

  return { synced: syncedCount, total: githubUsers.length };
}

/**
 * Sync GitHub issues with local issues
 */
export async function syncIssues() {
  const issues = await getIssues();
  let syncedCount = 0;

  for (const gitIssue of issues) {
    try {
      const existingIssue = await pool.query(
        'SELECT id FROM erp.issues WHERE github_id = $1',
        [gitIssue.id]
      );

      if (existingIssue.rows.length === 0) {
        // We'd need to map author.username to local user id if available
        const userRes = await pool.query('SELECT id FROM erp.users WHERE github_username = $1', [gitIssue.author.username]);
        const authorId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

        await pool.query(
          `INSERT INTO erp.issues (title, description, status, priority, github_id, github_iid, 
           created_by, created_at, updated_at) 
           VALUES ($1, $2, $3, 'medium', $4, $5, $6, $7, $8)`,
          [
            gitIssue.title,
            gitIssue.description || '',
            gitIssue.state === 'closed' ? 'closed' : 'open',
            gitIssue.id,
            gitIssue.iid,
            authorId,
            gitIssue.created_at,
            gitIssue.updated_at
          ]
        );
        syncedCount++;
      } else {
        await pool.query(
          `UPDATE erp.issues SET 
           title = $1, 
           description = $2, 
           status = $3,
           updated_at = $4
           WHERE github_id = $5`,
          [
            gitIssue.title,
            gitIssue.description || '',
            gitIssue.state === 'closed' ? 'closed' : 'open',
            gitIssue.updated_at,
            gitIssue.id
          ]
        );
      }
    } catch (issueError) {
      console.error('Error syncing issue:', gitIssue.id, issueError.message);
    }
  }

  return { synced: syncedCount, total: issues.length };
}

/**
 * Get mapped users (GitHub + local)
 */
export async function getMappedUsers() {
  const result = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.github_username, ur.role, u.created_at
     FROM erp.users u
     LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
     WHERE u.github_username IS NOT NULL
     ORDER BY u.full_name`
  );
  return result.rows;
}
/**
 * Get all repositories for the configured owner
 */
export async function getRepos() {
  try {
    console.log(`🔍 Fetching GitHub repos for ${GITHUB_OWNER}`);
    const response = await githubApi.get(`/users/${GITHUB_OWNER}/repos?sort=updated&per_page=20`);
    
    return response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '',
      html_url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updated_at: repo.updated_at,
      private: repo.private
    }));
  } catch (error) {
    console.error('Error fetching GitHub repos:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get repository labels
 */
export async function getRepoLabels() {
  try {
    const response = await githubApi.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/labels`);
    return response.data;
  } catch (error) {
    console.error('Error fetching repo labels:', error.response?.data || error.message);
    return [];
  }
}


/**
 * Get repository assignees
 */
export async function getRepoAssignees() {
  try {
    const response = await githubApi.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/assignees`);
    return response.data;
  } catch (error) {
    console.error('Error fetching repo assignees:', error.response?.data || error.message);
    return [];
  }
}

