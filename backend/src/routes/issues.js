/**
 * Issues Routes
 * Handles all issue-related operations
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../../shared/database/connection.js';
import { authenticate, requireAdmin } from '../../core/auth/authMiddleware.js';
import axios from 'axios';

const router = express.Router();

// GitLab configuration
const GITLAB_URL = process.env.GITLAB_URL || 'https://git.techiemaya.com';
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const GITLAB_API = `${GITLAB_URL}/api/v4`;

/**
 * GitLab API helper
 */
const gitlabApi = axios.create({
  baseURL: GITLAB_API,
  headers: {
    'Authorization': `Bearer ${GITLAB_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// All routes require authentication
router.use(authenticate);

/**
 * Get all issues
 * GET /api/issues
 */
router.get('/', async (req, res) => {
  try {
    const { status, assignee, project } = req.query;
    const userId = req.userId;

    // Check if user is admin
    const roleResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );
    const isAdmin = roleResult.rows[0]?.role === 'admin';

    let query = `
      SELECT 
        i.*,
        json_agg(DISTINCT jsonb_build_object(
          'user_id', ia.user_id
        )) FILTER (WHERE ia.user_id IS NOT NULL) as assignees,
        json_agg(DISTINCT jsonb_build_object(
          'label_id', il.label_id,
          'name', l.name,
          'color', l.color
        )) FILTER (WHERE l.id IS NOT NULL) as labels
      FROM issues i
      LEFT JOIN issue_assignees ia ON i.id = ia.issue_id
      LEFT JOIN issue_labels il ON i.id = il.issue_id
      LEFT JOIN labels l ON il.label_id = l.id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    // Filter by status
    if (status && status !== 'all') {
      conditions.push(`i.status = $${paramCount++}`);
      params.push(status);
    }

    // Filter by assignee
    if (assignee && assignee !== 'all') {
      if (isAdmin) {
        conditions.push(`EXISTS (
          SELECT 1 FROM issue_assignees 
          WHERE issue_id = i.id AND user_id = $${paramCount++}
        )`);
        params.push(assignee);
      } else {
        // Non-admin can only see assigned issues
        conditions.push(`EXISTS (
          SELECT 1 FROM issue_assignees 
          WHERE issue_id = i.id AND user_id = $${paramCount++}
        )`);
        params.push(userId);
      }
    } else if (!isAdmin) {
      // Non-admin without filter sees only assigned issues
      conditions.push(`EXISTS (
        SELECT 1 FROM issue_assignees 
        WHERE issue_id = i.id AND user_id = $${paramCount++}
      )`);
      params.push(userId);
    }

    // Filter by project
    if (project) {
      conditions.push(`i.project_name = $${paramCount++}`);
      params.push(project);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      issues: result.rows.map(issue => ({
        ...issue,
        assignees: issue.assignees || [],
        labels: issue.labels || [],
      })),
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ 
      error: 'Failed to get issues',
      message: 'Internal server error' 
    });
  }
});

/**
 * Get single issue
 * GET /api/issues/:id
 */
router.get('/:id', async (req, res) => {
  try {
    console.log('=== GET Issue Request ===');
    console.log('Request params:', req.params);
    console.log('Request URL:', req.url);
    
    const issueId = parseInt(req.params.id, 10);
    
    if (isNaN(issueId)) {
      console.error('Invalid issue ID:', req.params.id);
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    console.log('Parsed issue ID:', issueId);
    const userId = req.userId;
    console.log('User ID:', userId);

    // Get issue
    const issueResult = await pool.query(
      'SELECT * FROM issues WHERE id = $1',
      [issueId]
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = issueResult.rows[0];

    // Get assignees with user info - simplified without profiles
    console.log('Fetching assignees for issue:', issueId);
    const assigneesResult = await pool.query(
      `SELECT 
        ia.user_id,
        u.email,
        COALESCE(u.full_name, '') as full_name
       FROM issue_assignees ia
       JOIN users u ON ia.user_id = u.id
       WHERE ia.issue_id = $1`,
      [issueId]
    );
    console.log('Assignees fetched successfully:', assigneesResult.rows.length);

    // Get labels
    const labelsResult = await pool.query(
      `SELECT l.*
       FROM issue_labels il
       JOIN labels l ON il.label_id = l.id
       WHERE il.issue_id = $1`,
      [issueId]
    );

    // Get comments - simplified query without profiles join
    console.log('Fetching comments for issue:', issueId);
    let commentsResult;
    try {
      commentsResult = await pool.query(
        `SELECT 
          ic.id,
          ic.issue_id,
          ic.user_id,
          ic.comment,
          ic.created_at,
          ic.updated_at,
          u.email,
          COALESCE(u.full_name, '') as full_name
         FROM issue_comments ic
         JOIN users u ON ic.user_id = u.id
         WHERE ic.issue_id = $1
         ORDER BY ic.created_at ASC`,
        [issueId]
      );
      console.log('Comments fetched successfully:', commentsResult.rows.length);
    } catch (commentsError) {
      console.error('Error fetching comments:', commentsError);
      console.error('Error code:', commentsError.code);
      console.error('Error message:', commentsError.message);
      console.error('Error detail:', commentsError.detail);
      throw commentsError; // Re-throw to be caught by outer try-catch
    }

    // Get activity - simplified without profiles
    console.log('Fetching activity for issue:', issueId);
    const activityResult = await pool.query(
      `SELECT 
        ia.id,
        ia.issue_id,
        ia.user_id,
        ia.action,
        ia.details,
        ia.created_at,
        u.email,
        COALESCE(u.full_name, '') as full_name
       FROM issue_activity ia
       LEFT JOIN users u ON ia.user_id = u.id
       WHERE ia.issue_id = $1
       ORDER BY ia.created_at DESC`,
      [issueId]
    );
    console.log('Activity fetched successfully:', activityResult.rows.length);

    res.json({
      issue: {
        ...issue,
        assignees: assigneesResult.rows,
        labels: labelsResult.rows,
        comments: commentsResult.rows,
        activity: activityResult.rows,
      },
    });
  } catch (error) {
    console.error('Get issue error:', error);
    console.error('Error stack:', error.stack);
    console.error('Issue ID:', req.params.id);
    console.error('Parsed Issue ID:', parseInt(req.params.id, 10));
    res.status(500).json({ 
      error: 'Failed to get issue',
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Create issue (creates in both local DB and GitLab)
 * POST /api/issues
 */
router.post('/', requireAdmin, [
  body('title').trim().notEmpty(),
  body('description').optional(),
  body('status').optional().isIn(['open', 'in_progress', 'closed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('project_id').isInt().withMessage('Project ID is required'),
  body('estimate_hours').optional().isFloat({ min: 0 }),
  body('start_date').optional().isISO8601(),
  body('due_date').optional().isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, 
      description, 
      status, 
      priority, 
      project_id,
      assignee_ids, 
      label_ids,
      estimate_hours,
      start_date,
      due_date
    } = req.body;
    const userId = req.userId;

    console.log(`🚀 Creating new issue: ${title}`);

    // Get project info
    const projectQuery = await pool.query(
      'SELECT gitlab_project_id, name FROM gitlab_projects WHERE id = $1',
      [project_id]
    );

    if (projectQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectQuery.rows[0];
    const gitlabProjectId = project.gitlab_project_id;

    // Create issue in GitLab first
    let gitlabIssue;
    try {
      const gitlabIssueData = {
        title: title,
        description: description || '',
        labels: label_ids ? await getLabelsFromIds(label_ids) : [],
        assignee_ids: assignee_ids || [],
        weight: estimate_hours ? Math.ceil(estimate_hours) : null,
        due_date: due_date || null
      };

      const gitlabResponse = await gitlabApi.post(`/projects/${gitlabProjectId}/issues`, gitlabIssueData);
      gitlabIssue = gitlabResponse.data;
      console.log('✅ GitLab issue created:', gitlabIssue.iid);
    } catch (gitlabError) {
      console.error('❌ GitLab issue creation failed:', gitlabError.response?.data || gitlabError.message);
      return res.status(500).json({ 
        error: 'Failed to create issue in GitLab',
        details: gitlabError.response?.data?.message || gitlabError.message
      });
    }

    // Create issue in local database
    const result = await pool.query(
      `INSERT INTO gitlab_issues (
        gitlab_issue_id, gitlab_iid, project_id, title, description, 
        status, priority, created_by, estimate_hours, start_date, due_date
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        gitlabIssue.id,
        gitlabIssue.iid,
        gitlabProjectId,
        title,
        description || null,
        status || 'open',
        priority || 'medium',
        userId,
        estimate_hours || null,
        start_date || null,
        due_date || null
      ]
    );

    const issue = result.rows[0];

    // Add activity
    await pool.query(
      `INSERT INTO issue_activity (issue_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [issue.id, userId, 'created', JSON.stringify({ title, gitlab_iid: gitlabIssue.iid })]
    );

    // Assign users locally
    if (assignee_ids && Array.isArray(assignee_ids)) {
      for (const assigneeId of assignee_ids) {
        await pool.query(
          `INSERT INTO issue_assignees (issue_id, user_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (issue_id, user_id) DO NOTHING`,
          [issue.id, assigneeId, userId]
        );
      }
    }

    // Add labels locally
    if (label_ids && Array.isArray(label_ids)) {
      for (const labelId of label_ids) {
        await pool.query(
          `INSERT INTO issue_labels (issue_id, label_id)
           VALUES ($1, $2)
           ON CONFLICT (issue_id, label_id) DO NOTHING`,
          [issue.id, labelId]
        );
      }
    }

    res.status(201).json({
      message: 'Issue created successfully',
      issue: {
        ...issue,
        gitlab_url: gitlabIssue.web_url,
        project_name: project.name
      }
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ 
      error: 'Failed to create issue',
      message: 'Internal server error' 
    });
  }
});

/**
 * Helper function to get label names from IDs
 */
async function getLabelsFromIds(labelIds) {
  if (!Array.isArray(labelIds) || labelIds.length === 0) {
    return [];
  }
  
  const labels = await pool.query(
    'SELECT name FROM labels WHERE id = ANY($1)',
    [labelIds]
  );
  
  return labels.rows.map(row => row.name);
}

/**
 * Update issue (updates in both local DB and GitLab)
 * PUT /api/issues/:id
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const issueId = parseInt(req.params.id, 10);
    
    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    const { 
      title, 
      description, 
      status, 
      priority, 
      estimate_hours,
      start_date,
      due_date,
      assignee_ids 
    } = req.body;
    const userId = req.userId;

    // Get existing issue
    const existing = await pool.query(
      'SELECT gi.*, gp.gitlab_project_id FROM gitlab_issues gi JOIN gitlab_projects gp ON gi.project_id = gp.gitlab_project_id WHERE gi.id = $1',
      [issueId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = existing.rows[0];

    // Update in GitLab
    try {
      const gitlabUpdateData = {};
      if (title) gitlabUpdateData.title = title;
      if (description !== undefined) gitlabUpdateData.description = description;
      if (status) gitlabUpdateData.state_event = status === 'closed' ? 'close' : 'reopen';
      if (estimate_hours !== undefined) gitlabUpdateData.weight = Math.ceil(estimate_hours) || null;
      if (due_date !== undefined) gitlabUpdateData.due_date = due_date;
      if (assignee_ids) gitlabUpdateData.assignee_ids = assignee_ids;

      if (Object.keys(gitlabUpdateData).length > 0) {
        await gitlabApi.put(`/projects/${issue.gitlab_project_id}/issues/${issue.gitlab_iid}`, gitlabUpdateData);
        console.log('✅ Issue updated in GitLab');
      }
    } catch (gitlabError) {
      console.error('❌ GitLab issue update failed:', gitlabError.response?.data || gitlabError.message);
      return res.status(500).json({ 
        error: 'Failed to update issue in GitLab',
        details: gitlabError.response?.data?.message || gitlabError.message
      });
    }

    // Update issue in local database
    const result = await pool.query(
      `UPDATE gitlab_issues 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           estimate_hours = COALESCE($5, estimate_hours),
           start_date = COALESCE($6, start_date),
           due_date = COALESCE($7, due_date),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [title, description, status, priority, estimate_hours, start_date, due_date, issueId]
    );

    const updatedIssue = result.rows[0];

    // Track status change
    if (status && status !== existing.rows[0].status) {
      await pool.query(
        `INSERT INTO issue_activity (issue_id, user_id, action, details)
         VALUES ($1, $2, $3, $4)`,
        [issueId, userId, 'status_changed', JSON.stringify({
          old_status: existing.rows[0].status,
          new_status: status,
        })]
      );
    }

    res.json({
      message: 'Issue updated successfully',
      issue: updatedIssue,
    });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ 
      error: 'Failed to update issue',
      message: 'Internal server error' 
    });
  }
});

/**
 * Add comment to issue (posts to both local DB and GitLab)
 * POST /api/issues/:id/comments
 */
router.post('/:id/comments', [
  body('comment').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issueId = parseInt(req.params.id, 10);
    
    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    const { comment } = req.body;
    const userId = req.userId;

    // Get issue info for GitLab
    const issueCheck = await pool.query(
      'SELECT gi.gitlab_iid, gi.gitlab_issue_id, gp.gitlab_project_id FROM gitlab_issues gi JOIN gitlab_projects gp ON gi.project_id = gp.gitlab_project_id WHERE gi.id = $1',
      [issueId]
    );

    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = issueCheck.rows[0];

    // Post comment to GitLab
    try {
      await gitlabApi.post(`/projects/${issue.gitlab_project_id}/issues/${issue.gitlab_iid}/notes`, {
        body: comment
      });
      console.log('✅ Comment posted to GitLab');
    } catch (gitlabError) {
      console.error('❌ GitLab comment post failed:', gitlabError.response?.data || gitlabError.message);
      // Continue with local save even if GitLab fails
    }

    // Add comment locally
    const result = await pool.query(
      `INSERT INTO issue_comments (issue_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [issueId, userId, comment]
    );

    // Get comment with user info
    const commentWithUser = await pool.query(
      `SELECT 
        ic.*,
        u.email,
        COALESCE(u.full_name, '') as full_name
       FROM issue_comments ic
       JOIN users u ON ic.user_id = u.id
       WHERE ic.id = $1`,
      [result.rows[0].id]
    );

    // Add activity
    await pool.query(
      `INSERT INTO issue_activity (issue_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [issueId, userId, 'commented', JSON.stringify({ comment: comment.substring(0, 100) })]
    );

    res.status(201).json({
      message: 'Comment added successfully',
      comment: commentWithUser.rows[0],
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ 
      error: 'Failed to add comment',
      message: 'Internal server error' 
    });
  }
});

/**
 * Assign user to issue (Admin only)
 * POST /api/issues/:id/assign
 * Accepts either { user_id: string } or { user_ids: [string] }
 */
router.post('/:id/assign', requireAdmin, async (req, res) => {
  // Log that we've reached the route handler
  console.log('=== ASSIGN ROUTE HANDLER REACHED ===');
  try {
    console.log('=== Assign User Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Params:', JSON.stringify(req.params, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('UserId from auth:', req.userId);
    console.log('Content-Type:', req.headers['content-type']);
    
    const issueId = parseInt(req.params.id, 10);
    const { user_id, user_ids } = req.body;
    const userId = req.userId;

    console.log('Parsed issueId:', issueId);
    console.log('user_id from body:', user_id);
    console.log('user_ids from body:', user_ids);

    if (isNaN(issueId)) {
      console.error('Invalid issue ID:', req.params.id);
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    // Support both single user_id and array of user_ids
    let assigneeIds = [];
    
    if (user_ids && Array.isArray(user_ids)) {
      assigneeIds = user_ids;
    } else if (user_id) {
      assigneeIds = [user_id];
    }

    console.log('Final assigneeIds:', assigneeIds);
    console.log('assigneeIds type:', typeof assigneeIds);
    console.log('assigneeIds is array:', Array.isArray(assigneeIds));

    if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) {
      console.error('No user_id provided');
      console.error('user_id:', user_id);
      console.error('user_id type:', typeof user_id);
      console.error('user_ids:', user_ids);
      console.error('user_ids type:', typeof user_ids);
      console.error('Full request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ 
        error: 'user_id or user_ids must be provided',
        message: 'Please provide a user_id in the request body',
        received: { 
          user_id: user_id || null, 
          user_ids: user_ids || null,
          body_keys: Object.keys(req.body || {}),
          raw_body: req.body
        }
      });
    }

    // Verify issue exists
    const issueCheck = await pool.query(
      'SELECT id FROM issues WHERE id = $1',
      [issueId]
    );

    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Assign users
    let assignedCount = 0;
    const errors = [];
    
    for (const assigneeId of assigneeIds) {
      try {
        // Ensure assigneeId is a string (UUID)
        const assigneeIdStr = String(assigneeId).trim();
        
        console.log(`Processing assigneeId: ${assigneeIdStr} (type: ${typeof assigneeId})`);
        
        // Verify UUID format - allow both UUID format and just check it's not empty
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!assigneeIdStr || assigneeIdStr === 'undefined' || assigneeIdStr === 'null') {
          console.error(`Empty or invalid assigneeId: ${assigneeIdStr}`);
          errors.push(`Invalid user ID: ${assigneeIdStr}`);
          continue;
        }
        
        if (!uuidRegex.test(assigneeIdStr)) {
          console.error(`Invalid UUID format for assigneeId: ${assigneeIdStr}`);
          console.error(`AssigneeId length: ${assigneeIdStr.length}`);
          // Don't reject immediately - let PostgreSQL handle it, but log the warning
          console.warn(`UUID format validation failed, but attempting database query anyway`);
        }

        // Verify user exists - no casting needed
        const userCheck = await pool.query(
          'SELECT id, email FROM users WHERE id = $1',
          [assigneeIdStr]
        );

        if (userCheck.rows.length === 0) {
          console.error(`User not found: ${assigneeIdStr}`);
          errors.push(`User ${assigneeIdStr} not found`);
          continue; // Skip invalid users
        }

        // Check if already assigned - no casting needed
        const existingCheck = await pool.query(
          'SELECT id FROM issue_assignees WHERE issue_id = $1 AND user_id = $2',
          [issueId, assigneeIdStr]
        );

        if (existingCheck.rows.length > 0) {
          console.log(`User ${assigneeIdStr} already assigned to issue ${issueId}`);
          continue; // Skip if already assigned
        }

        // Insert assignment
        console.log(`Attempting to assign user ${assigneeIdStr} to issue ${issueId} by ${userId}`);
        
        // Ensure userId is a string (UUID)
        const userIdStr = String(userId);
        
        // Verify userId UUID format
        if (!uuidRegex.test(userIdStr)) {
          throw new Error(`Invalid UUID format for userId: ${userIdStr}`);
        }
        
        // Insert assignment - ensure all values are passed as correct types
        // Convert issueId to string first, then cast to integer
        // UUIDs should already be strings
        console.log(`Inserting assignment with values:`, {
          issueId: issueId,
          issueIdType: typeof issueId,
          assigneeIdStr: assigneeIdStr,
          assigneeIdType: typeof assigneeIdStr,
          userIdStr: userIdStr,
          userIdType: typeof userIdStr
        });
        
        // Insert assignment - no casting, let PostgreSQL handle it
        // Pass integer as number, UUIDs as strings
        const insertResult = await pool.query(
          `INSERT INTO issue_assignees (issue_id, user_id, assigned_by)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [issueId, assigneeIdStr, userIdStr]
        );
        console.log('Assignment inserted:', insertResult.rows[0]);

        // Add activity - no casting needed
        const activityResult = await pool.query(
          `INSERT INTO issue_activity (issue_id, user_id, action, details)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [issueId, userIdStr, 'assigned_user', JSON.stringify({ assigned_user_id: assigneeIdStr })]
        );
        console.log('Activity logged:', activityResult.rows[0]);
        assignedCount++;
      } catch (insertError) {
        console.error('Error inserting assignment:', insertError);
        console.error('Error code:', insertError.code);
        console.error('Error detail:', insertError.detail);
        errors.push(`Failed to assign user ${assigneeId}: ${insertError.message}`);
      }
    }

    if (assignedCount === 0 && errors.length > 0) {
      return res.status(400).json({
        error: 'Failed to assign users',
        message: errors.join('; ')
      });
    }

    res.json({
      message: assignedCount > 0 ? `Successfully assigned ${assignedCount} user(s)` : 'No users assigned',
      assignedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Assign users error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request params:', req.params);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      error: 'Failed to assign users',
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Unassign user from issue (Admin only)
 * DELETE /api/issues/:id/assign/:user_id
 */
router.delete('/:id/assign/:user_id', requireAdmin, async (req, res) => {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { user_id } = req.params;
    const userId = req.userId;

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    // Verify issue exists
    const issueCheck = await pool.query(
      'SELECT id FROM issues WHERE id = $1',
      [issueId]
    );

    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Remove assignment
    const result = await pool.query(
      `DELETE FROM issue_assignees
       WHERE issue_id = $1 AND user_id = $2`,
      [issueId, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User assignment not found' });
    }

    // Add activity
    await pool.query(
      `INSERT INTO issue_activity (issue_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [issueId, userId, 'unassigned_user', JSON.stringify({ unassigned_user_id: user_id })]
    );

    res.json({
      message: 'User unassigned successfully',
    });
  } catch (error) {
    console.error('Unassign user error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to unassign user',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * Add label to issue (Admin only)
 * POST /api/issues/:id/labels
 */
router.post('/:id/labels', requireAdmin, async (req, res) => {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { label_id } = req.body;
    const userId = req.userId;

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    if (!label_id) {
      return res.status(400).json({ error: 'label_id is required' });
    }

    // Verify issue exists
    const issueCheck = await pool.query(
      'SELECT id FROM issues WHERE id = $1',
      [issueId]
    );

    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Verify label exists
    const labelCheck = await pool.query(
      'SELECT id, name FROM labels WHERE id = $1',
      [label_id]
    );

    if (labelCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Check if label already assigned
    const existingCheck = await pool.query(
      'SELECT id FROM issue_labels WHERE issue_id = $1 AND label_id = $2',
      [issueId, label_id]
    );

    if (existingCheck.rows.length > 0) {
      return res.json({ message: 'Label already assigned' });
    }

    // Add label
    await pool.query(
      `INSERT INTO issue_labels (issue_id, label_id)
       VALUES ($1, $2)`,
      [issueId, label_id]
    );

    // Add activity
    await pool.query(
      `INSERT INTO issue_activity (issue_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [issueId, userId, 'added_label', JSON.stringify({ label_id, label_name: labelCheck.rows[0].name })]
    );

    res.json({
      message: 'Label added successfully',
    });
  } catch (error) {
    console.error('Add label error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to add label',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * Remove label from issue (Admin only)
 * DELETE /api/issues/:id/labels/:label_id
 */
router.delete('/:id/labels/:label_id', requireAdmin, async (req, res) => {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { label_id } = req.params;
    const userId = req.userId;

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    // Verify issue exists
    const issueCheck = await pool.query(
      'SELECT id FROM issues WHERE id = $1',
      [issueId]
    );

    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Get label name for activity
    const labelCheck = await pool.query(
      'SELECT name FROM labels WHERE id = $1',
      [label_id]
    );

    // Remove label
    const result = await pool.query(
      `DELETE FROM issue_labels
       WHERE issue_id = $1 AND label_id = $2`,
      [issueId, label_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Label assignment not found' });
    }

    // Add activity
    await pool.query(
      `INSERT INTO issue_activity (issue_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [issueId, userId, 'removed_label', JSON.stringify({ 
        label_id, 
        label_name: labelCheck.rows[0]?.name || 'Unknown' 
      })]
    );

    res.json({
      message: 'Label removed successfully',
    });
  } catch (error) {
    console.error('Remove label error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to remove label',
      message: error.message || 'Internal server error'
    });
  }
});

export default router;

