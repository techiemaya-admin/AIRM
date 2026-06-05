/**
 * Quick script to make a user an admin
 * Run: node make-admin.js
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

// Get email from command line or use default
const email = process.argv[2] || 'admin@test.com';

async function makeAdmin() {
  try {
    console.log(`Making user ${email} an admin...`);

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length === 0) {
      console.error(`❌ User with email ${email} not found!`);
      console.log('\nAvailable users:');
      const allUsers = await pool.query('SELECT email FROM users');
      allUsers.rows.forEach(user => {
        console.log(`  - ${user.email}`);
      });
      process.exit(1);
    }

    const userId = userCheck.rows[0].id;

    // Delete any existing roles for this user
    await pool.query(
      'DELETE FROM user_roles WHERE user_id = $1',
      [userId]
    );

    // Insert admin role (using ON CONFLICT to handle duplicates)
    await pool.query(
      `INSERT INTO user_roles (id, user_id, role)
       VALUES (uuid_generate_v4(), $1, 'admin')
       ON CONFLICT (user_id, role) DO NOTHING`,
      [userId]
    );

    console.log(`✅ User ${email} is now an admin!`);
    
    // Verify
    const roleCheck = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );
    
    if (roleCheck.rows.length > 0) {
      console.log(`✅ Verified role: ${roleCheck.rows[0].role}`);
    } else {
      console.log(`⚠️ Warning: Role not found after update`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

makeAdmin();

