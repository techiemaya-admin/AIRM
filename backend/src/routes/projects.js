/**
 * Projects Routes
 * Handles project creation and management with GitLab synchronization
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../../shared/database/connection.js';
import { authenticate } from '../../core/auth/authMiddleware.js';
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

/**
 * Get all projects
 * GET /api/projects
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // For now, return a list based on project_name from existing issues
    // This is a temporary solution until we can create the gitlab_projects table
    const projectsQuery = `
      SELECT 
        project_name as name,
        COUNT(*) as issue_count,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_issues,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_issues,
        MIN(created_at) as created_at
      FROM issues 
      WHERE project_name IS NOT NULL AND project_name != ''
      GROUP BY project_name
      ORDER BY MIN(created_at) DESC
    `;
    
    const result = await pool.query(projectsQuery);
    
    // Transform the data to match expected format
    const projects = result.rows.map((row, index) => ({
      id: index + 1, // Temporary ID
      name: row.name,
      description: `Project containing ${row.issue_count} issues`,
      visibility: 'private',
      issue_count: parseInt(row.issue_count),
      open_issues: parseInt(row.open_issues),
      closed_issues: parseInt(row.closed_issues),
      created_at: row.created_at
    }));
    
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get project by ID (simplified version)
 * GET /api/projects/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, find project by the issue ID we used for project creation
    const projectQuery = `
      SELECT 
        project_name as name,
        description,
        COUNT(*) as issue_count,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_issues,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_issues,
        MIN(created_at) as created_at
      FROM issues 
      WHERE id = $1 OR project_name = (SELECT project_name FROM issues WHERE id = $1)
      GROUP BY project_name, description
    `;
    
    const result = await pool.query(projectQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = {
      id: parseInt(id),
      name: result.rows[0].name,
      description: result.rows[0].description,
      visibility: 'private',
      issue_count: parseInt(result.rows[0].issue_count),
      open_issues: parseInt(result.rows[0].open_issues),
      closed_issues: parseInt(result.rows[0].closed_issues),
      created_at: result.rows[0].created_at
    };
    
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new project (simplified version using existing schema)
 * POST /api/projects
 */
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    const { userId } = req;

    console.log(`🚀 Creating new project: ${name}`);

    // For now, we'll create a project by adding a project entry to the issues table
    // This is a temporary solution until we implement full GitLab integration
    const result = await pool.query(
      `INSERT INTO issues (title, description, status, priority, project_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        `${name} - Project`,
        description || `Project: ${name}`,
        'open',
        'medium',
        name,
        userId
      ]
    );

    const project = {
      id: result.rows[0].id,
      name: name,
      description: description,
      visibility: 'private',
      issue_count: 1,
      open_issues: 1,
      closed_issues: 0,
      created_at: result.rows[0].created_at
    };

    res.status(201).json({
      message: 'Project created successfully',
      project: project,
      note: 'This is a simplified project creation. Full GitLab integration pending database migration.'
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update project (updates in both local DB and GitLab)
 * PUT /api/projects/:id
 */
router.put('/:id', authenticate, [
  body('name').optional().trim().notEmpty(),
  body('description').optional(),
  body('visibility').optional().isIn(['private', 'internal', 'public']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Get current project
    const currentProject = await pool.query(
      'SELECT * FROM gitlab_projects WHERE id = $1',
      [id]
    );

    if (currentProject.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = currentProject.rows[0];

    // Update in GitLab
    if (Object.keys(updates).length > 0) {
      try {
        await gitlabApi.put(`/projects/${project.gitlab_project_id}`, updates);
        console.log('✅ Project updated in GitLab');
      } catch (gitlabError) {
        console.error('❌ GitLab project update failed:', gitlabError.response?.data || gitlabError.message);
        return res.status(500).json({ 
          error: 'Failed to update project in GitLab',
          details: gitlabError.response?.data?.message || gitlabError.message
        });
      }
    }

    // Update in local database
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      updateFields.push(`${key} = $${paramCount}`);
      updateValues.push(value);
      paramCount++;
    });

    if (updateFields.length > 0) {
      updateValues.push(id);
      const updateQuery = `
        UPDATE gitlab_projects 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, updateValues);
      res.json({
        message: 'Project updated successfully',
        project: result.rows[0]
      });
    } else {
      res.json({
        message: 'No updates provided',
        project: project
      });
    }

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete project (removes from both local DB and GitLab)
 * DELETE /api/projects/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get project info
    const project = await pool.query(
      'SELECT * FROM gitlab_projects WHERE id = $1',
      [id]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = project.rows[0];

    // Delete from GitLab (optional - you might want to keep the GitLab project)
    try {
      await gitlabApi.delete(`/projects/${projectData.gitlab_project_id}`);
      console.log('✅ Project deleted from GitLab');
    } catch (gitlabError) {
      console.warn('⚠️ Could not delete from GitLab (project may not exist):', gitlabError.response?.data?.message);
      // Continue with local deletion even if GitLab deletion fails
    }

    // Delete from local database
    await pool.query('DELETE FROM gitlab_projects WHERE id = $1', [id]);

    res.json({
      message: 'Project deleted successfully',
      project_name: projectData.name
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get project members
 * GET /api/projects/:id/members
 */
router.get('/:id/members', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get project
    const project = await pool.query(
      'SELECT gitlab_project_id FROM gitlab_projects WHERE id = $1',
      [id]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get members from GitLab
    try {
      const membersResponse = await gitlabApi.get(`/projects/${project.rows[0].gitlab_project_id}/members/all`);
      res.json(membersResponse.data);
    } catch (gitlabError) {
      console.error('❌ Failed to get project members:', gitlabError.response?.data || gitlabError.message);
      res.status(500).json({ 
        error: 'Failed to get project members from GitLab',
        details: gitlabError.response?.data?.message || gitlabError.message
      });
    }

  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Add member to project
 * POST /api/projects/:id/members
 */
router.post('/:id/members', authenticate, [
  body('user_id').isInt().withMessage('User ID must be an integer'),
  body('access_level').isInt().withMessage('Access level must be an integer'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { user_id, access_level = 30 } = req.body; // 30 = Developer access

    // Get project
    const project = await pool.query(
      'SELECT gitlab_project_id FROM gitlab_projects WHERE id = $1',
      [id]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Add member in GitLab
    try {
      const memberData = {
        user_id: user_id,
        access_level: access_level
      };

      const response = await gitlabApi.post(`/projects/${project.rows[0].gitlab_project_id}/members`, memberData);
      
      res.json({
        message: 'Member added successfully',
        member: response.data
      });
    } catch (gitlabError) {
      console.error('❌ Failed to add project member:', gitlabError.response?.data || gitlabError.message);
      res.status(500).json({ 
        error: 'Failed to add member to GitLab project',
        details: gitlabError.response?.data?.message || gitlabError.message
      });
    }

  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;