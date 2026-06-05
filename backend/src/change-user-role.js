/**
 * Change user role
 * Run: node change-user-role.js satwik.k@techiemaya.com user
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

// Get email and role from command line
const targetEmail = process.argv[2];
const newRole = process.argv[3] || 'employee';

if (!targetEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node change-user-role.js <email> [role]');
  console.log('Example: node change-user-role.js satwik.k@techiemaya.com employee');
  process.exit(1);
}

if (!['admin', 'employee'].includes(newRole)) {
  console.error('❌ Role must be either "admin" or "employee"');
  process.exit(1);
}

async function changeRole() {
  try {
    console.log(`\n🔍 Looking for user: ${targetEmail}\n`);

    // Find user
    const userResult = await pool.query(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [targetEmail]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ No user found with email: ${targetEmail}`);
      await pool.end();
      return;
    }

    if (userResult.rows.length > 1) {
      console.log(`⚠️  Found ${userResult.rows.length} users with email: ${targetEmail}`);
      console.log('   This should not happen. Please check the database.\n');
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})\n`);

    // Get current role
    const currentRoleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [user.id]
    );

    const currentRole = currentRoleResult.rows.length > 0
      ? currentRoleResult.rows[0].role
      : 'user';

    console.log(`Current role: ${currentRole}`);
    console.log(`New role: ${newRole}\n`);

    if (currentRole === newRole) {
      console.log(`✅ User already has role: ${newRole}`);
      await pool.end();
      return;
    }

    // Update role
    console.log(`🔄 Updating role...`);

    // Delete existing roles
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [user.id]);

    // Insert new role
    await pool.query(
      'INSERT INTO user_roles (id, user_id, role) VALUES (gen_random_uuid(), $1, $2)',
      [user.id, newRole]
    );

    console.log(`✅ Successfully changed role from "${currentRole}" to "${newRole}"`);

    // Verify
    const verifyResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [user.id]
    );

    if (verifyResult.rows.length > 0) {
      console.log(`\n✅ Verified: User ${user.email} now has role: ${verifyResult.rows[0].role}`);
    } else {
      console.log(`\n⚠️  Warning: Could not verify role change`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

changeRole();

