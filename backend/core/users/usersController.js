/**
 * Users Controller
 * Handles HTTP requests for user management
 */

import * as usersService from './usersService.js';

/**
 * Get all users (Admin only)
 * GET /api/users
 */
export async function getAllUsers(req, res) {
  try {
    const users = await usersService.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'Internal server error'
    });
  }
}

/**
 * Get all users with roles
 * GET /api/users/with-roles
 */
export async function getAllUsersWithRoles(req, res) {
  try {
    const users = await usersService.getAllUsersWithRoles();
    res.json({ users });
  } catch (error) {
    console.error('Get users with roles error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'Internal server error'
    });
  }
}

/**
 * Get single user
 * GET /api/users/:id
 */
export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Users can only see their own profile unless admin
    if (id !== userId && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own profile'
      });
    }

    const user = await usersService.getUserById(id);
    res.json({ user });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'Internal server error'
    });
  }
}

/**
 * Toggle user role (Admin only)
 * PUT /api/users/:id/role
 */
export async function updateUserRole(req, res) {
  console.log('🚀 [CORE_UPDATE_ROLE] Request received for ID:', req.params.id, 'Role:', req.body.role);
  try {
    const { id } = req.params;
    const { role } = req.body;

    try {
      const result = await usersService.updateUserRole(id, role);
      res.json({
        message: 'User role updated successfully',
        ...result
      });
    } catch (error) {
      if (error.message === 'Invalid role') {
        return res.status(400).json({
          error: 'Invalid role',
          message: 'Role must be "admin" or "employee"'
        });
      }

      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }

      throw error;
    }
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      error: 'Failed to update role',
      message: 'Internal server error'
    });
  }
}

