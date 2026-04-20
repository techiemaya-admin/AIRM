/**
 * Git Controller
 * Handles HTTP requests for Git/GitLab integration
 */

import * as gitService from '../services/git.service.js';

/**
 * Get all commits
 * GET /api/git/commits
 */
export async function getCommits(req, res) {
  try {
    const repo = req.query.repo;
    const commits = await gitService.getCommits(repo);
    res.json(commits);
  } catch (error) {
    console.error('Error fetching commits:', error.message);
    res.json([]);
  }
}

/**
 * Get all issues
 * GET /api/git/issues
 */
export async function getIssues(req, res) {
  try {
    const repo = req.query.repo;
    const issues = await gitService.getIssues(repo);
    res.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    res.json([]);
  }
}

/**
 * Get commit details
 * GET /api/git/commits/:sha
 */
export async function getCommit(req, res) {
  try {
    const { sha } = req.params;
    const commit = await gitService.getCommit(sha);
    res.json(commit);
  } catch (error) {
    console.error('Error fetching commit details:', error.message);
    res.status(404).json({ error: 'Commit not found' });
  }
}

/**
 * Get issue details
 * GET /api/git/issues/:id
 */
export async function getIssue(req, res) {
  try {
    const { id } = req.params;
    const issue = await gitService.getIssue(id);
    res.json(issue);
  } catch (error) {
    console.error('Error fetching issue details:', error.message);
    res.status(404).json({ error: 'Issue not found' });
  }
}

/**
 * Create a new issue
 * POST /api/git/issues
 */
export async function createIssue(req, res) {
  try {
    const issue = await gitService.createIssue(req.body);
    res.status(201).json(issue);
  } catch (error) {
    console.error('Error creating issue:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create issue on GitHub' });
  }
}

/**
 * Add a comment to an issue
 * POST /api/git/issues/:id/comments
 */
export async function addComment(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const comment = await gitService.addComment(id, content);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to add comment on GitHub' });
  }
}

/**
 * Update an issue
 * PATCH /api/git/issues/:id
 */
export async function updateIssue(req, res) {
  try {
    const { id } = req.params;
    const issue = await gitService.updateIssue(id, req.body);
    res.json(issue);
  } catch (error) {
    console.error('Error updating issue:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to update issue on GitHub' });
  }
}

/**
 * Sync GitLab users
 * POST /api/git/sync-users
 */
export async function syncUsers(req, res) {
  try {
    const result = await gitService.syncUsers();
    res.json({ 
      message: `Synced ${result.synced} new users from GitLab`,
      total: result.total,
      synced: result.synced
    });
  } catch (error) {
    console.error('Error syncing GitLab users:', error.message);
    res.status(500).json({ error: 'Failed to sync GitLab users' });
  }
}

/**
 * Sync GitLab issues
 * POST /api/git/sync-issues
 */
export async function syncIssues(req, res) {
  try {
    const result = await gitService.syncIssues();
    res.json({ 
      message: `Synced ${result.synced} new issues from GitLab`,
      total: result.total,
      synced: result.synced
    });
  } catch (error) {
    console.error('Error syncing GitLab issues:', error.message);
    res.status(500).json({ error: 'Failed to sync GitLab issues' });
  }
}

/**
 * Get mapped users
 * GET /api/git/users
 */
export async function getMappedUsers(req, res) {
  try {
    const users = await gitService.getMappedUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching mapped users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * Get all repositories
 * GET /api/git/repos
 */
export async function getRepos(req, res) {
  try {
    const repos = await gitService.getRepos();
    res.json(repos);
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    res.json([]);
  }
}

/**
 * Get repo labels
 */
export async function getRepoLabels(req, res) {
  try {
    const labels = await gitService.getRepoLabels();
    res.json(labels);
  } catch (error) {
    res.json([]);
  }
}


/**
 * Get repo assignees
 */
export async function getRepoAssignees(req, res) {
  try {
    const assignees = await gitService.getRepoAssignees();
    res.json(assignees);
  } catch (error) {
    res.json([]);
  }
}

