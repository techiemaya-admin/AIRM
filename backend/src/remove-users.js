/**
 * Remove all users except the specified one
 * Run: node remove-users.js prasad.d@techiemaya.com
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

// Get email from command line or use default
const keepEmail = process.argv[2] || 'prasad.d@techiemaya.com';

async function removeUsers() {
  try {
    console.log(`Keeping user: ${keepEmail}`);
    console.log('Removing all other users...\n');

    // First, get the user to keep
    const keepUserResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [keepEmail]
    );

    if (keepUserResult.rows.length === 0) {
      console.error(`❌ User with email ${keepEmail} not found!`);
      console.log('\nAvailable users:');
      const allUsers = await pool.query('SELECT id, email FROM users');
      allUsers.rows.forEach(user => {
        console.log(`  - ${user.email}`);
      });
      process.exit(1);
    }

    const keepUserId = keepUserResult.rows[0].id;
    console.log(`✅ Found user to keep: ${keepEmail} (ID: ${keepUserId})\n`);

    // Get all users except the one to keep
    const allUsersResult = await pool.query(
      'SELECT id, email FROM users WHERE id != $1',
      [keepUserId]
    );

    if (allUsersResult.rows.length === 0) {
      console.log('✅ No other users to remove. Database already clean.');
      await pool.end();
      return;
    }

    console.log(`Found ${allUsersResult.rows.length} user(s) to remove:`);
    allUsersResult.rows.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });

    console.log('\n⚠️  WARNING: This will delete all users except:', keepEmail);
    console.log('   This action cannot be undone!\n');

    // Note: Due to CASCADE constraints, deleting users will also delete:
    // - user_roles
    // - profiles
    // - time_clock entries
    // - timesheets
    // - issues (created_by references)
    // - leave_requests
    // - notifications
    // - etc.

    // Delete all users except the one to keep
    const deleteResult = await pool.query(
      'DELETE FROM users WHERE id != $1 RETURNING id, email',
      [keepUserId]
    );

    console.log(`\n✅ Successfully removed ${deleteResult.rows.length} user(s):`);
    deleteResult.rows.forEach(user => {
      console.log(`   - ${user.email}`);
    });

    // Verify
    const remainingUsers = await pool.query('SELECT id, email FROM users');
    console.log(`\n✅ Remaining users (${remainingUsers.rows.length}):`);
    remainingUsers.rows.forEach(user => {
      console.log(`   - ${user.email}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

removeUsers();

