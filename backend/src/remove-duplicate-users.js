/**
 * Remove duplicate users by email
 * Keeps only one user per email (prefers admin role, then most recent)
 * Run: node remove-duplicate-users.js satwik.k@techiemaya.com
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

// Get email from command line
const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node remove-duplicate-users.js <email>');
  console.log('Example: node remove-duplicate-users.js satwik.k@techiemaya.com');
  process.exit(1);
}

async function removeDuplicates() {
  try {
    console.log(`\n🔍 Looking for duplicate users with email: ${targetEmail}\n`);

    // First, check for duplicate users (same email, different IDs)
    const usersResult = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.created_at
      FROM users u
      WHERE LOWER(u.email) = LOWER($1)
      ORDER BY u.created_at DESC`,
      [targetEmail]
    );

    if (usersResult.rows.length === 0) {
      console.log(`✅ No users found with email: ${targetEmail}`);
      await pool.end();
      return;
    }

    // Check for duplicate user IDs (same user appearing multiple times)
    const uniqueUserIds = [...new Set(usersResult.rows.map(u => u.id))];
    
    if (usersResult.rows.length > uniqueUserIds.length) {
      console.log(`⚠️  Found duplicate user entries (same ID appearing multiple times)`);
      console.log(`   This is likely a display issue, not actual duplicates.\n`);
    }

    // Check for duplicate roles for each user
    for (const user of usersResult.rows) {
      const rolesResult = await pool.query(
        `SELECT role FROM user_roles WHERE user_id = $1 ORDER BY role`,
        [user.id]
      );

      const roles = rolesResult.rows.map(r => r.role);
      const uniqueRoles = [...new Set(roles)];

      // If user has multiple roles (even if unique), keep only admin if it exists, otherwise user
      if (roles.length > 1) {
        console.log(`⚠️  User ${user.id} (${user.email}) has multiple roles: ${roles.join(', ')}`);
        
        // Keep admin role if it exists, otherwise keep user role
        const roleToKeep = uniqueRoles.includes('admin') ? 'admin' : uniqueRoles[0];
        
        console.log(`   Will keep only role: ${roleToKeep}\n`);
        
        console.log(`🗑️  Removing duplicate roles for user ${user.id}...`);
        
        // Delete all roles first
        await pool.query('DELETE FROM user_roles WHERE user_id = $1', [user.id]);
        
        // Insert only the role to keep
        await pool.query(
          'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
          [user.id, roleToKeep]
        );
        
        console.log(`   ✅ Set role to: ${roleToKeep}\n`);
      } else if (roles.length === 0) {
        // If no role exists, set default to 'user'
        console.log(`⚠️  User ${user.id} (${user.email}) has no role, setting to 'user'`);
        await pool.query(
          'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
          [user.id, 'user']
        );
        console.log(`   ✅ Set role to: user\n`);
      }
    }

    // Now check for actual duplicate users (different IDs, same email)
    if (uniqueUserIds.length > 1) {
      console.log(`⚠️  Found ${uniqueUserIds.length} users with email ${targetEmail}:\n`);
      usersResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}, Created: ${user.created_at}`);
      });

      // Keep the first one (most recent)
      const keepUserId = uniqueUserIds[0];
      const duplicatesToRemove = uniqueUserIds.slice(1);

      console.log(`\n✅ Will keep user: ${keepUserId}`);
      console.log(`\n🗑️  Will remove ${duplicatesToRemove.length} duplicate user(s):`);
      duplicatesToRemove.forEach((userId) => {
        console.log(`   - ID: ${userId}`);
      });

      console.log('\n⚠️  WARNING: This will delete duplicate users and all their associated data!');
      console.log('   This action cannot be undone!\n');

      // Delete duplicate users
      for (const userId of duplicatesToRemove) {
        console.log(`\n🗑️  Removing user ${userId}...`);
        
        // First, delete related data that might have foreign key constraints
        // Delete in order: issue_comments, issue_assignments, etc.
        try {
          await pool.query('DELETE FROM issue_comments WHERE user_id = $1', [userId]);
          await pool.query('DELETE FROM issue_assignments WHERE user_id = $1', [userId]);
          await pool.query('DELETE FROM issue_activity WHERE user_id = $1', [userId]);
          await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
          await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
          await pool.query('DELETE FROM leave_requests WHERE user_id = $1', [userId]);
          await pool.query('DELETE FROM time_clock WHERE user_id = $1', [userId]);
          await pool.query('DELETE FROM timesheets WHERE user_id = $1', [userId]);
          
          // Finally delete the user
          const deleteResult = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, email',
            [userId]
          );

          if (deleteResult.rows.length > 0) {
            console.log(`   ✅ Removed user: ${deleteResult.rows[0].email} (ID: ${userId})`);
          }
        } catch (error) {
          console.log(`   ⚠️  Error removing user ${userId}: ${error.message}`);
        }
      }
    }

    // Verify final state
    const finalUsersResult = await pool.query(
      `SELECT 
        u.id,
        u.email,
        COALESCE(ur.role, 'user') as role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE LOWER(u.email) = LOWER($1)`,
      [targetEmail]
    );

    console.log(`\n✅ Final state - Users with email ${targetEmail} (${finalUsersResult.rows.length}):`);
    finalUsersResult.rows.forEach(user => {
      console.log(`   - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
    });

    if (finalUsersResult.rows.length === 1) {
      console.log('\n✅ Successfully cleaned up! Only one user remains.');
    } else if (finalUsersResult.rows.length === 0) {
      console.log('\n⚠️  Warning: No users found after cleanup. This might be an error.');
    } else {
      console.log(`\n⚠️  Warning: Still found ${finalUsersResult.rows.length} user(s).`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

removeDuplicates();

