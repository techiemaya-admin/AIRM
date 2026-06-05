/**
 * Users Controller
 * Handles HTTP requests for user management
 */

import * as usersService from '../services/users.service.js';

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
  console.log('🚀 [UPDATE_ROLE] Request received for ID:', req.params.id, 'Role:', req.body.role);
  try {
    const { id } = req.params;
    const { role } = req.body;

    try {
      const result = await usersService.updateUserRole(id, role);
      console.log('✅ [UPDATE_ROLE] Service success:', result);
      res.json({
        message: 'User role updated successfully',
        ...result
      });
    } catch (error) {
      if (error.message === 'Invalid role') {
        return res.status(400).json({
          error: 'Invalid role',
          message: 'Role must be "admin", "employee", or "ex-employee"'
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

/**
 * Create a new user (Admin only)
 * POST /api/users
 */
export async function createUser(req, res) {
  console.log('📝 Create user request received:', req.body);
  try {
    const { email, full_name, role } = req.body;

    if (!email) {
      console.log('❌ Email missing');
      return res.status(400).json({
        error: 'Email required',
        message: 'Email is required to create a user'
      });
    }

    try {
      console.log('🔄 Calling createUser service...');
      const user = await usersService.createUser(email, full_name, role);
      console.log('✅ User created successfully:', user.email);
      res.status(201).json({
        message: 'User created successfully',
        user
      });
    } catch (error) {
      console.log('❌ Service error:', error.message);
      if (error.message === 'Invalid email') {
        return res.status(400).json({
          error: 'Invalid email',
          message: 'Please provide a valid email address'
        });
      }

      if (error.message === 'User already exists') {
        return res.status(409).json({
          error: 'User exists',
          message: 'A user with this email already exists'
        });
      }

      if (error.message === 'Invalid role') {
        return res.status(400).json({
          error: 'Invalid role',
          message: 'Role must be "admin" or "employee"'
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: 'Internal server error'
    });
  }
}

/**
 * Delete a user (Admin only)
 * DELETE /api/users/:id
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    if (id === currentUserId) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      });
    }

    try {
      await usersService.deleteUser(id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: 'Internal server error'
    });
  }
}

