/**
 * Git Routes
 * API endpoints for Git/GitLab integration
 */

import express from 'express';
import { authenticate } from '../../../core/auth/authMiddleware.js';
import * as gitController from '../controllers/git.controller.js';

const router = express.Router();

router.use((req, res, next) => {
  console.log(`🔍 Git Router: ${req.method} ${req.url}`);
  next();
});

// Specific repo routes FIRST
router.get('/repos/:owner/:repo/projects', authenticate, gitController.getRepoProjects);
router.get('/repos/:owner/:repo/pulls', authenticate, gitController.getRepoPullRequests);
router.get('/repos/:owner/:repo/branches', authenticate, gitController.getBranches);
router.get('/repos/:owner/:repo/tree', authenticate, gitController.getRepoTree);
router.get('/repos/:owner/:repo/file', authenticate, gitController.getFileContent);
router.get('/repos/:owner/:repo/search', authenticate, gitController.searchRepoFiles);

/**
 * Get all commits from GitLab
 * GET /api/git/commits
 */
router.get('/commits', authenticate, gitController.getCommits);

/**
 * Get all issues from GitHub
 * GET /api/git/issues
 */
router.get('/issues', authenticate, gitController.getIssues);

/**
 * Create a new issue on GitHub
 * POST /api/git/issues
 */
router.post('/issues', authenticate, gitController.createIssue);

/**
 * Get commit details with diff
 * GET /api/git/commits/:sha
 */
router.get('/commits/:sha', authenticate, gitController.getCommit);

/**
 * Get issue details with comments
 * GET /api/git/issues/:id
 */
router.get('/issues/:id', authenticate, gitController.getIssue);

/**
 * Add a comment to a GitHub issue
 * POST /api/git/issues/:id/comments
 */
router.post('/issues/:id/comments', authenticate, gitController.addComment);

/**
 * Update a GitHub issue (labels, assignees, state)
 * PATCH /api/git/issues/:id
 */
router.patch('/issues/:id', authenticate, gitController.updateIssue);

/**
 * Sync GitLab users with local users
 * POST /api/git/sync-users
 */
router.post('/sync-users', authenticate, gitController.syncUsers);

/**
 * Sync GitLab issues with local issues
 * POST /api/git/sync-issues
 */
router.post('/sync-issues', authenticate, gitController.syncIssues);

/**
 * Get all repositories
 * GET /api/git/repos
 */
router.get('/repos', authenticate, gitController.getRepos);

/**
 * Get mapped users (GitLab + local)
 * GET /api/git/users
 */
router.get('/users', authenticate, gitController.getMappedUsers);

/**
 * Get repo labels
 */
router.get('/repo/labels', authenticate, gitController.getRepoLabels);


/**
 * Get repo assignees
 */
router.get('/repo/assignees', authenticate, gitController.getRepoAssignees);
router.get('/projects', authenticate, gitController.getProjects);
router.post('/projects/items', authenticate, gitController.addProjectItem);
router.get('/projects/:projectId/items', authenticate, gitController.getProjectItems);
router.get('/projects/:projectId/fields', authenticate, gitController.getProjectFields);
router.patch('/projects/items/:itemId/status', authenticate, gitController.updateProjectItemStatus);

export default router;
