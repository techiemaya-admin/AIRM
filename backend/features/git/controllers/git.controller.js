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
    const { repo } = req.query;
    const issue = await gitService.getIssue(id, repo);
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
    console.log('--- Git Controller: createIssue ---');
    console.log('Body:', req.body);
    const { repository, ...data } = req.body;
    const issue = await gitService.createIssue(data, repository);
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
    const { content, repository } = req.body;
    const comment = await gitService.addComment(id, content, repository);
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
    const { repository, ...updates } = req.body;
    const issue = await gitService.updateIssue(id, updates, repository);
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
    const { repo } = req.query;
    const labels = await gitService.getRepoLabels(repo);
    res.json(labels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
}


/**
 * Get repo assignees
 */
export async function getRepoAssignees(req, res) {
  try {
    const { repo } = req.query;
    const assignees = await gitService.getRepoAssignees(repo);
    res.json(assignees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignees' });
  }
}

/**
 * Get GitHub Projects (V2)
 */
export async function getProjects(req, res) {
  try {
    const projects = await gitService.getProjects();
    res.json(projects);
  } catch (error) {
    console.error('Controller: Error fetching projects:', error.message);
    res.status(500).json({ error: 'Failed to fetch GitHub projects' });
  }
}

/**
 * Get GitHub Projects (V2) linked to a specific repository.
 * Merges: GitHub API (officially linked) + local DB records (created via wizard).
 * GET /api/git/repos/:owner/:repo/projects
 */
export async function getRepoProjects(req, res) {
  try {
    const { owner, repo } = req.params;

    // 1. Fetch officially linked projects from GitHub's GraphQL API
    const githubProjects = await gitService.getProjectsForRepo(owner, repo);

    // 2. Fetch local DB github_projects where repo_name matches
    let localProjects = [];
    try {
      const pool = (await import('../../../shared/database/connection.js')).default;
      const result = await pool.query(
        `SELECT * FROM erp.github_projects WHERE LOWER(repo_name) = LOWER($1) ORDER BY created_at DESC`,
        [repo]
      );
      localProjects = result.rows.map(gp => ({
        id: gp.github_id || String(gp.id),
        name: gp.name,
        description: gp.description || '',
        web_url: gp.web_url,
        number: null,
        closed: false,
        issue_count: 0,
        created_at: gp.created_at,
        updated_at: gp.created_at,
        source: 'github_project'
      }));

      // 2.1 Fetch local issues where project_name is set and repo_name matches
      const localIssuesResult = await pool.query(
        `SELECT DISTINCT project_name as name, MIN(created_at) as created_at FROM issues WHERE LOWER(repo_name) = LOWER($1) GROUP BY project_name`,
        [repo]
      );
      
      const localIssueProjects = localIssuesResult.rows
        .filter(ip => !localProjects.some(lp => lp.name === ip.name))
        .map(ip => ({
          id: `local-${ip.name}`,
          name: ip.name,
          description: 'Local Project',
          web_url: null,
          number: null,
          closed: false,
          issue_count: 0,
          created_at: ip.created_at,
          updated_at: ip.created_at,
          source: 'local'
        }));
      
      localProjects = [...localProjects, ...localIssueProjects];
    } catch (dbErr) {
      console.warn('Could not fetch local repo projects:', dbErr.message);
    }

    // 3. Merge, dedup by id (GitHub API entries take priority)
    const seenIds = new Set();
    const merged = [];
    for (const p of [...githubProjects, ...localProjects]) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        merged.push(p);
      }
    }

    console.log(`📋 Repo ${owner}/${repo} projects: ${merged.length} (${githubProjects.length} GitHub + ${localProjects.length} local DB)`);
    res.json(merged);
  } catch (error) {
    console.error('Error fetching repo projects:', error.message);
    res.json([]);
  }
}

/**
 * Get Pull Requests for a specific repository from GitHub
 * GET /api/git/repos/:owner/:repo/pulls
 */
export async function getRepoPullRequests(req, res) {
  try {
    const { owner, repo } = req.params;
    const prs = await gitService.getPullRequestsForRepo(owner, repo);
    console.log(`🔀 Repo ${owner}/${repo} pull requests: ${prs.length}`);
    res.json(prs);
  } catch (error) {
    console.error('Error fetching repo pull requests:', error.message);
    res.json([]);
  }
}

/**
 * POST /api/git/projects/items
 */
export async function addProjectItem(req, res) {
  try {
    const { projectId, title } = req.body;
    if (!projectId || !title) {
      return res.status(400).json({ error: 'projectId and title are required' });
    }
    const item = await gitService.addProjectItem(projectId, title);
    res.status(201).json(item);
  } catch (error) {
    console.error('Controller: Error adding project item:', error.message);
    res.status(500).json({ error: 'Failed to add item to GitHub project' });
  }
}

/**
 * Get items from a GitHub Project V2
 * GET /api/git/projects/:projectId/items
 */
export async function getProjectItems(req, res) {
  try {
    const { projectId } = req.params;
    const items = await gitService.getProjectItems(projectId);
    res.json(items);
  } catch (error) {
    console.error('Controller: Error fetching project items:', error.message);
    res.status(500).json({ error: 'Failed to fetch project items' });
  }
}

/**
 * GET /api/git/projects/:projectId/fields
 * Returns the Status field ID and option IDs (needed for status drag-and-drop)
 */
export async function getProjectFields(req, res) {
  try {
    const { projectId } = req.params;
    const fields = await gitService.getProjectFields(projectId);
    if (!fields) return res.status(404).json({ error: 'Status field not found in project' });
    res.json(fields);
  } catch (error) {
    console.error('Controller: Error fetching project fields:', error.message);
    res.status(500).json({ error: 'Failed to fetch project fields' });
  }
}

/**
 * PATCH /api/git/projects/items/:itemId/status
 * Moves a project item to a new status (drag-and-drop between columns)
 */
export async function updateProjectItemStatus(req, res) {
  try {
    const { itemId } = req.params;
    const { projectId, fieldId, optionId } = req.body;
    if (!projectId || !fieldId || !optionId) {
      return res.status(400).json({ error: 'projectId, fieldId and optionId are required' });
    }
    const result = await gitService.updateProjectItemStatus(projectId, itemId, fieldId, optionId);
    res.json(result);
  } catch (error) {
    console.error('Controller: Error updating item status:', error.message);
    res.status(500).json({ error: 'Failed to update item status' });
  }
}

/** GET /api/git/repos/:owner/:repo/branches */
export async function getBranches(req, res) {
  try {
    const { owner, repo } = req.params;
    const branches = await gitService.getBranches(owner, repo);
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
}

/** GET /api/git/repos/:owner/:repo/tree?branch=main */
export async function getRepoTree(req, res) {
  try {
    const { owner, repo } = req.params;
    const branch = req.query.branch || 'main';
    const tree = await gitService.getRepoTree(owner, repo, branch);
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tree' });
  }
}

/** GET /api/git/repos/:owner/:repo/file?path=src/index.ts&branch=main */
export async function getFileContent(req, res) {
  try {
    const { owner, repo } = req.params;
    const { path: filePath, branch = 'main' } = req.query;
    if (!filePath) return res.status(400).json({ error: 'path is required' });
    const file = await gitService.getFileContent(owner, repo, filePath, branch);
    res.json(file);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

/** GET /api/git/repos/:owner/:repo/search?q=index&branch=main */
export async function searchRepoFiles(req, res) {
  try {
    const { owner, repo } = req.params;
    const { q, branch = 'main' } = req.query;
    if (!q) return res.json([]);
    const results = await gitService.searchRepoFiles(owner, repo, q, branch);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
}
