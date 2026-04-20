import express from 'express';
import { authenticate } from '../../core/auth/authMiddleware.js';
import pool from '../../shared/database/connection.js';

const router = express.Router();

// Helper function for database queries
const query = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Get all commits from GitLab
router.get('/commits', authenticate, async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;

    const gitlabUrl = process.env.GITLAB_URL || 'https://git.techiemaya.com';
    const projectId = process.env.GITLAB_PROJECT_ID || '1';

    const response = await fetch(`${gitlabUrl}/api/v4/projects/${projectId}/repository/commits?per_page=20`, {
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || 'your-gitlab-token'
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.error('GitLab API error:', response.status, response.statusText);
      return res.json([]);
    }

    const commits = await response.json();

    // Ensure it's an array
    if (!Array.isArray(commits)) {
      console.error('GitLab commits response is not an array:', commits);
      return res.json([]);
    }

    res.json(commits);
  } catch (error) {
    console.error('Error fetching commits:', error.message);
    res.json([]);
  }
});

// Get all issues from GitLab
router.get('/issues', authenticate, async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;

    const gitlabUrl = process.env.GITLAB_URL || 'https://git.techiemaya.com';
    const projectId = process.env.GITLAB_PROJECT_ID || '1';

    const response = await fetch(`${gitlabUrl}/api/v4/projects/${projectId}/issues?per_page=20`, {
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || 'your-gitlab-token'
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.error('GitLab API error:', response.status, response.statusText);
      return res.json([]);
    }

    const issues = await response.json();

    // Ensure it's an array
    if (!Array.isArray(issues)) {
      console.error('GitLab issues response is not an array:', issues);
      return res.json([]);
    }

    res.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    res.json([]);
  }
});

// Get commit details with diff
router.get('/commits/:sha', authenticate, async (req, res) => {
  try {
    const { sha } = req.params;
    const fetch = (await import('node-fetch')).default;

    const response = await fetch(`https://git.techiemaya.com/api/v4/projects/1/repository/commits/${sha}`, {
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || 'your-gitlab-token'
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.error('GitLab API error:', response.status, response.statusText);
      return res.status(404).json({ error: 'Commit not found' });
    }

    const commit = await response.json();
    res.json(commit);
  } catch (error) {
    console.error('Error fetching commit details:', error.message);
    res.status(500).json({ error: 'Failed to fetch commit details' });
  }
});

// Get issue details with comments
router.get('/issues/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const fetch = (await import('node-fetch')).default;

    // Get issue details
    const issueResponse = await fetch(`https://git.techiemaya.com/api/v4/projects/1/issues/${id}`, {
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || 'your-gitlab-token'
      },
      timeout: 10000
    });

    if (!issueResponse.ok) {
      console.error('GitLab API error:', issueResponse.status, issueResponse.statusText);
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = await issueResponse.json();

    // Get issue comments/notes
    const notesResponse = await fetch(`https://git.techiemaya.com/api/v4/projects/1/issues/${id}/notes`, {
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || 'your-gitlab-token'
      },
      timeout: 10000
    });

    let notes = [];
    if (notesResponse.ok) {
      const notesData = await notesResponse.json();
      if (Array.isArray(notesData)) {
        notes = notesData;
      }
    }

    res.json({ ...issue, notes });
  } catch (error) {
    console.error('Error fetching issue details:', error.message);
    res.status(500).json({ error: 'Failed to fetch issue details' });
  }
});

// Sync GitLab users with Pulse users
router.post('/sync-users', authenticate, async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;

    // Get GitLab users
    const response = await fetch('https://git.techiemaya.com/api/v4/users?per_page=100', {
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || 'your-gitlab-token'
      },
      timeout: 10000
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch GitLab users' });
    }

    const gitlabUsers = await response.json();
    let syncedCount = 0;

    for (const gitUser of gitlabUsers) {
      try {
        // Check if user exists in Pulse
        const existingUser = await query(
          'SELECT id FROM users WHERE email = $1 OR gitlab_id = $2',
          [gitUser.email, gitUser.id]
        );

        if (existingUser.rows.length === 0) {
          // Insert new user
          const insertResult = await query(
            `INSERT INTO users (email, full_name, gitlab_id, gitlab_username, created_at) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
            [gitUser.email, gitUser.name, gitUser.id, gitUser.username]
          );

          // Add default role in user_roles table
          if (insertResult.rows.length > 0) {
            await query(
              `INSERT INTO user_roles (user_id, role, created_at) 
               VALUES ($1, 'user', NOW())`,
              [insertResult.rows[0].id]
            );
          }
          syncedCount++;
        } else {
          // Update existing user with GitLab info
          await query(
            `UPDATE users SET 
             gitlab_id = $1, 
             gitlab_username = $2, 
             full_name = COALESCE(NULLIF($3, ''), full_name)
             WHERE id = $4`,
            [gitUser.id, gitUser.username, gitUser.name, existingUser.rows[0].id]
          );
        }
      } catch (userError) {
        console.error('Error syncing user:', gitUser.email, userError.message);
      }
    }

    res.json({
      message: `Synced ${syncedCount} new users from GitLab`,
      total: gitlabUsers.length,
      synced: syncedCount
    });
  } catch (error) {
    console.error('Error syncing GitLab users:', error.message);
    res.status(500).json({ error: 'Failed to sync GitLab users' });
  }
});

// Sync GitLab issues with Pulse issues
router.post('/sync-issues', authenticate, async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;

    const gitlabUrl = process.env.GITLAB_URL || 'https://git.techiemaya.com';
    const projectId = process.env.GITLAB_PROJECT_ID || '1';

    // Get GitLab issues
    const response = await fetch(`${gitlabUrl}/api/v4/projects/${projectId}/issues?per_page=100&state=all`, {
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || 'your-gitlab-token'
      },
      timeout: 10000
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch GitLab issues' });
    }

    const gitlabIssues = await response.json();
    let syncedCount = 0;

    for (const gitIssue of gitlabIssues) {
      try {
        // Check if issue exists
        const existingIssue = await query(
          'SELECT id FROM issues WHERE gitlab_id = $1',
          [gitIssue.id]
        );

        // Find assigned user in Pulse
        let assignedUserId = null;
        if (gitIssue.assignee) {
          const assignedUser = await query(
            'SELECT id FROM users WHERE gitlab_id = $1',
            [gitIssue.assignee.id]
          );
          if (assignedUser.rows.length > 0) {
            assignedUserId = assignedUser.rows[0].id;
          }
        }

        // Find author in Pulse
        let authorId = null;
        const author = await query(
          'SELECT id FROM users WHERE gitlab_id = $1',
          [gitIssue.author.id]
        );
        if (author.rows.length > 0) {
          authorId = author.rows[0].id;
        }

        if (existingIssue.rows.length === 0) {
          // Insert new issue
          await query(
            `INSERT INTO issues (title, description, status, priority, gitlab_id, gitlab_iid, 
             created_by, assigned_to, created_at, updated_at) 
             VALUES ($1, $2, $3, 'medium', $4, $5, $6, $7, $8, $9)`,
            [
              gitIssue.title,
              gitIssue.description || '',
              gitIssue.state === 'closed' ? 'closed' : 'open',
              gitIssue.id,
              gitIssue.iid,
              authorId,
              assignedUserId,
              gitIssue.created_at,
              gitIssue.updated_at
            ]
          );
          syncedCount++;
        } else {
          // Update existing issue
          await query(
            `UPDATE issues SET 
             title = $1, 
             description = $2, 
             status = $3,
             assigned_to = $4,
             updated_at = $5
             WHERE gitlab_id = $6`,
            [
              gitIssue.title,
              gitIssue.description || '',
              gitIssue.state === 'closed' ? 'closed' : 'open',
              assignedUserId,
              gitIssue.updated_at,
              gitIssue.id
            ]
          );
        }
      } catch (issueError) {
        console.error('Error syncing issue:', gitIssue.id, issueError.message);
      }
    }

    res.json({
      message: `Synced ${syncedCount} new issues from GitLab`,
      total: gitlabIssues.length,
      synced: syncedCount
    });
  } catch (error) {
    console.error('Error syncing GitLab issues:', error.message);
    res.status(500).json({ error: 'Failed to sync GitLab issues' });
  }
});

// Get mapped users (GitLab + Pulse)
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await query(
      `SELECT u.id, u.email, u.full_name, u.gitlab_id, u.gitlab_username, ur.role, u.created_at
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.gitlab_id IS NOT NULL
       ORDER BY u.full_name`
    );

    res.json(users.rows);
  } catch (error) {
    console.error('Error fetching mapped users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;