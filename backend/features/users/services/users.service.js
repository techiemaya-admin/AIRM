/**
 * Users Service
 * Business logic for user management
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get all users
 */
export async function getAllUsers() {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.email,
      u.full_name,
      u.created_at,
      ur.role,
      p.full_name as profile_name
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN profiles p ON u.id = p.id
    ORDER BY u.created_at DESC`
  );

  return result.rows.map(user => ({
    id: user.id,
    email: user.email,
    full_name: user.profile_name || user.full_name,
    role: user.role || 'employee',
    created_at: user.created_at,
  }));
}

/**
 * Get all users with roles (using function)
 */
export async function getAllUsersWithRoles() {
  const result = await pool.query('SELECT * FROM get_all_users_with_roles()');
  return result.rows;
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.email,
      u.full_name,
      u.created_at,
      ur.role
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

/**
 * Update user role
 */
export async function updateUserRole(userId, role) {
  if (!role || !['admin', 'employee', 'ex-employee'].includes(role)) {
    throw new Error('Invalid role');
  }

  // Check if user exists
  const userCheck = await pool.query(
    'SELECT id FROM users WHERE id = $1',
    [userId]
  );

  if (userCheck.rows.length === 0) {
    throw new Error('User not found');
  }

  // Delete existing roles to ensure user has only one role
  await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

  // Insert new role
  await pool.query(
    `INSERT INTO user_roles (id, user_id, role)
     VALUES (gen_random_uuid(), $1, $2)`,
    [userId, role]
  );

  return { user_id: userId, role };
}

/**
 * Create a new user (Admin only)
 */
export async function createUser(email, fullName, role = 'employee') {
  // Validate email
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email');
  }

  // Validate role
  if (role && !['admin', 'employee', 'ex-employee'].includes(role)) {
    throw new Error('Invalid role');
  }

  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('User already exists');
  }

  // Create user
  const userResult = await pool.query(
    `INSERT INTO users (id, email, full_name, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
     RETURNING id, email, full_name, created_at`,
    [email.toLowerCase(), fullName || '']
  );

  const newUser = userResult.rows[0];

  // Create user role
  await pool.query(
    `INSERT INTO user_roles (id, user_id, role, created_at)
     VALUES (gen_random_uuid(), $1, $2, NOW())`,
    [newUser.id, role]
  );

  return {
    id: newUser.id,
    email: newUser.email,
    full_name: newUser.full_name,
    role: role,
    created_at: newUser.created_at
  };
}

/**
 * Delete a user (Admin only)
 * Handles all FK constraints by deleting/nullifying related records first.
 */
export async function deleteUser(userId) {
  // Check if user exists
  const userCheck = await pool.query(
    'SELECT id FROM users WHERE id = $1',
    [userId]
  );

  if (userCheck.rows.length === 0) {
    throw new Error('User not found');
  }

  // Helper to safely run a query (ignores table-not-found errors)
  const safe = async (sql, params = []) => {
    try {
      await pool.query(sql, params);
    } catch (e) {
      // 42P01 = undefined_table, ignore it; re-throw real errors
      if (e.code !== '42P01') {
        console.warn('deleteUser safe query warning:', e.message);
      }
    }
  };

  // ── 1. pf_contributions (depends on pf_details & payslips & users) ──
  await safe('DELETE FROM pf_contributions WHERE user_id = $1', [userId]);

  // ── 2. pf_documents (depends on pf_details & users) ─────────────────
  await safe('DELETE FROM pf_documents WHERE user_id = $1', [userId]);

  // ── 3. pf_details (depends on users) ─────────────────────────────────
  await safe('DELETE FROM pf_details WHERE user_id = $1', [userId]);

  // ── 4. payslips (depends on users, has ON DELETE RESTRICT) ───────────
  await safe('DELETE FROM payslips WHERE user_id = $1', [userId]);

  // ── 5. Exit formality tables ─────────────────────────────────────────
  await safe('DELETE FROM exit_formality_tasks WHERE user_id = $1', [userId]);
  await safe('DELETE FROM exit_formalities WHERE user_id = $1', [userId]);

  // ── 6. Nullify SET NULL foreign keys (no deletions needed for these) ──
  const nullifyQueries = [
    'UPDATE payroll_audit_log SET user_id = NULL WHERE user_id = $1',
    'UPDATE payroll_audit_log SET performed_by = NULL WHERE performed_by = $1',
    'UPDATE issues SET assignee_id = NULL WHERE assignee_id = $1',
    'UPDATE issues SET created_by = NULL WHERE created_by = $1',
    'UPDATE projects SET created_by = NULL WHERE created_by = $1',
    'UPDATE project_members SET assigned_by = NULL WHERE assigned_by = $1',
  ];
  for (const sql of nullifyQueries) {
    await safe(sql, [userId]);
  }

  // ── 7. Delete all user-owned rows (CASCADE or explicit deletes) ───────
  const ownedTables = [
    'time_entries',
    'timesheets',
    'leave_requests',
    'leave_balances',
    'leave_policies',
    'shift_assignments',
    'attendance_records',
    'user_capabilities',
    'magic_links',
    'recruitment_applications',
    'joining_forms',
    'audit_logs',
    'voice_call_logs',
    'lad_monitor_logs',
    'notifications',
    'issue_assignees',
    'project_members',
    'employee_onboarding',
  ];
  for (const table of ownedTables) {
    await safe(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }

  // ── 8. Delete profile (uses id = users.id) ────────────────────────────
  await safe('DELETE FROM profiles WHERE id = $1', [userId]);

  // ── 9. Delete user roles ──────────────────────────────────────────────
  await safe('DELETE FROM user_roles WHERE user_id = $1', [userId]);

  // ── 10. Finally delete the user ───────────────────────────────────────
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);

  return { deleted: true };
}


