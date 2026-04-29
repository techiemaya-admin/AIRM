/**
 * Issues Controller
 * Handles HTTP requests for issue management
 */

import { body, validationResult } from 'express-validator';
import pool from '../../../shared/database/connection.js';
import * as issueService from '../services/issues.service.js';

/**
 * Get all issues
 * GET /api/issues
 */
export async function getAllIssues(req, res) {
  try {
    const userId = req.userId;

    // Check if user is admin
    const roleResult = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );
    const isAdmin = roleResult.rows[0]?.role === 'admin';

    const filters = {
      status: req.query.status,
      assignee: req.query.assignee,
      project: req.query.project,
    };

    const issues = await issueService.getAllIssues(userId, isAdmin, filters);
    res.json({ issues });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({
      error: 'Failed to get issues',
      message: 'Internal server error'
    });
  }
}

/**
 * Get single issue
 * GET /api/issues/:id
 */
export async function getIssueById(req, res) {
  try {
    const issueId = parseInt(req.params.id, 10);

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    const issue = await issueService.getIssueById(issueId);
    res.json({ issue });
  } catch (error) {
    if (error.message === 'Issue not found') {
      return res.status(404).json({ error: 'Issue not found' });
    }

    console.error('Get issue error:', error);
    res.status(500).json({
      error: 'Failed to get issue',
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Create issue
 * POST /api/issues
 */
export async function createIssue(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId;
    const issueData = req.body;

    try {
      const issue = await issueService.createIssue(issueData, userId);
      res.status(201).json({
        message: 'Issue created successfully',
        issue
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (error.message.includes('GitLab')) {
        return res.status(500).json({
          error: 'Failed to create issue in GitLab',
          details: error.message
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      error: 'Failed to create issue',
      message: 'Internal server error'
    });
  }
}

/**
 * Update issue
 * PUT /api/issues/:id
 */
export async function updateIssue(req, res) {
  try {
    const issueId = parseInt(req.params.id, 10);

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    const userId = req.userId;
    const updates = req.body;

    try {
      const issue = await issueService.updateIssue(issueId, updates, userId);
      res.json({
        message: 'Issue updated successfully',
        issue
      });
    } catch (error) {
      if (error.message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }

      if (error.message.includes('GitLab')) {
        return res.status(500).json({
          error: 'Failed to update issue in GitLab',
          details: error.message
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({
      error: 'Failed to update issue',
      message: 'Internal server error'
    });
  }
}

/**
 * Add comment
 * POST /api/issues/:id/comments
 */
export async function addComment(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issueId = parseInt(req.params.id, 10);

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    const userId = req.userId;
    const { comment } = req.body;

    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log('!!! ADD COMMENT CONTROLLER TRIGGERED FOR ISSUE:', issueId);
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log('Add comment request:', { issueId, userId, commentLength: comment?.length });

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    try {
      const commentRecord = await issueService.addComment(issueId, userId, comment);
      res.status(201).json({
        message: 'Comment added successfully',
        comment: commentRecord
      });
    } catch (error) {
      console.error('Add comment service error:', error);
      console.error('Error stack:', error.stack);
      if (error.message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }

      throw error;
    }
  } catch (error) {
    console.error('Add comment error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      error: 'Failed to add comment',
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Assign users to issue
 * POST /api/issues/:id/assign
 */
export async function assignUsers(req, res) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { user_id, user_ids } = req.body;
    const userId = req.userId;

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    // Support both single user_id and array of user_ids
    let assigneeIds = [];
    if (user_ids && Array.isArray(user_ids)) {
      assigneeIds = user_ids;
    } else if (user_id) {
      assigneeIds = [user_id];
    }

    if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) {
      return res.status(400).json({
        error: 'user_id or user_ids must be provided',
        message: 'Please provide a user_id in the request body'
      });
    }

    try {
      const assigned = await issueService.assignUsers(issueId, assigneeIds, userId);
      res.json({
        message: `Successfully assigned ${assigned.length} user(s)`,
        assignedCount: assigned.length
      });
    } catch (error) {
      if (error.message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      throw error;
    }
  } catch (error) {
    console.error('Assign users error:', error);
    res.status(500).json({
      error: 'Failed to assign users',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Unassign user from issue
 * DELETE /api/issues/:id/assign/:user_id
 */
export async function unassignUser(req, res) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { user_id } = req.params;
    const userId = req.userId;

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    try {
      await issueService.unassignUser(issueId, user_id, userId);
      res.json({
        message: 'User unassigned successfully'
      });
    } catch (error) {
      if (error.message === 'Issue not found' || error.message === 'User assignment not found') {
        return res.status(404).json({ error: error.message });
      }

      throw error;
    }
  } catch (error) {
    console.error('Unassign user error:', error);
    res.status(500).json({
      error: 'Failed to unassign user',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Add label to issue
 * POST /api/issues/:id/labels
 */
export async function addLabel(req, res) {
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

    try {
      const result = await issueService.addLabel(issueId, label_id, userId);
      res.json(result);
    } catch (error) {
      if (error.message === 'Issue not found' || error.message === 'Label not found') {
        return res.status(404).json({ error: error.message });
      }

      throw error;
    }
  } catch (error) {
    console.error('Add label error:', error);
    res.status(500).json({
      error: 'Failed to add label',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Remove label from issue
 * DELETE /api/issues/:id/labels/:label_id
 */
export async function removeLabel(req, res) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { label_id } = req.params;
    const userId = req.userId;

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    try {
      const result = await issueService.removeLabel(issueId, label_id, userId);
      res.json(result);
    } catch (error) {
      if (error.message === 'Issue not found' || error.message === 'Label assignment not found') {
        return res.status(404).json({ error: error.message });
      }

      throw error;
    }
  } catch (error) {
    console.error('Remove label error:', error);
    res.status(500).json({
      error: 'Failed to remove label',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Delete issue
 * DELETE /api/issues/:id
 */
export async function deleteIssue(req, res) {
  try {
    const issueId = parseInt(req.params.id, 10);

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    const userId = req.userId;

    try {
      await issueService.deleteIssue(issueId, userId);
      res.json({
        message: 'Issue deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Issue not found') {
        return res.status(404).json({ error: 'Issue not found' });
      }

      throw error;
    }
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({
      error: 'Failed to delete issue',
      message: 'Internal server error'
    });
  }
}

/**
 * Log manual time
 */
export async function logTime(req, res) {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { duration, comment } = req.body;
    const userId = req.userId;

    if (isNaN(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID' });
    }

    // Add activity record
    await pool.query(
      `INSERT INTO issue_activity (issue_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        issueId,
        userId,
        'work_completed',
        JSON.stringify({
          duration: parseFloat(duration),
          comment: comment || 'Manual entry'
        })
      ]
    );

    res.json({ message: 'Time logged successfully' });
  } catch (error) {
    console.error('Log time error:', error);
    res.status(500).json({
      error: 'Failed to log time',
      message: 'Internal server error'
    });
  }
}

/**
 * Update activity (edit time)
 */
export async function updateActivity(req, res) {
  try {
    const { activityId } = req.params;
    const { duration, comment } = req.body;

    const currentRes = await pool.query(
      'SELECT details FROM issue_activity WHERE id::text = $1',
      [activityId]
    );

    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Activity entry not found' });
    }

    const currentDetails = typeof currentRes.rows[0].details === 'string'
      ? JSON.parse(currentRes.rows[0].details)
      : currentRes.rows[0].details;

    const newDetails = {
      ...currentDetails,
      duration: duration !== undefined ? parseFloat(duration) : (currentDetails.duration || currentDetails.hours_worked),
      comment: comment !== undefined ? comment : currentDetails.comment
    };

    await pool.query(
      'UPDATE issue_activity SET details = $1, updated_at = NOW() WHERE id::text = $2',
      [JSON.stringify(newDetails), activityId]
    );

    res.json({ message: 'Activity updated successfully' });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      error: 'Failed to update activity',
      message: 'Internal server error'
    });
  }
}

