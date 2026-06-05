/**
 * Projects Controller
 * Handles HTTP requests for project management
 */

import { body, validationResult } from 'express-validator';
import * as projectService from '../services/projects.service.js';

/**
 * Get all projects
 * GET /api/projects
 */
export async function getAllProjects(req, res) {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get project by ID
 * GET /api/projects/:id
 */
export async function getProjectById(req, res) {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    res.json(project);
  } catch (error) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create project
 * POST /api/projects
 */
export async function createProject(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, createRepo, createGithubProject, repo_name, github_project_id, template } = req.body;
    const userId = req.userId;

    const project = await projectService.createProject({
      name, 
      description, 
      userId, 
      createRepo, 
      createGithubProject,
      repo_name, 
      github_project_id, 
      template
    });
    
    res.status(201).json({
      message: 'Project created successfully',
      project: project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update project
 * PUT /api/projects/:id
 */
export async function updateProject(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    try {
      const project = await projectService.updateProject(id, updates);
      res.json({
        message: 'Project updated successfully',
        project: project
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      if (error.message.includes('GitLab')) {
        return res.status(500).json({ 
          error: 'Failed to update project in GitLab',
          details: error.message
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete project
 * DELETE /api/projects/:id
 */
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;

    try {
      const result = await projectService.deleteProject(id);
      res.json({
        message: 'Project deleted successfully',
        project_name: result.name
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get project members
 * GET /api/projects/:id/members
 */
export async function getProjectMembers(req, res) {
  try {
    const { id } = req.params;

    try {
      const members = await projectService.getProjectMembers(id);
      res.json(members);
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(500).json({ 
        error: 'Failed to get project members from GitLab',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add project member
 * POST /api/projects/:id/members
 */
export async function addProjectMember(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { user_id, access_level = 30 } = req.body; // 30 = Developer access

    try {
      const member = await projectService.addProjectMember(id, user_id, access_level);
      res.json({
        message: 'Member added successfully',
        member: member
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(500).json({ 
        error: 'Failed to add member to GitLab project',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

