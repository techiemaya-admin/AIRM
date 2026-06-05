/**
 * List all admin users
 * Run: node list-admins.js
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function listAdmins() {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        ur.role,
        u.created_at
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role = 'admin'
      ORDER BY u.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No admin users found.');
      console.log('\n💡 To create an admin:');
      console.log('   1. Register a user (via browser console or frontend)');
      console.log('   2. Run: node make-admin.js <email>');
    } else {
      console.log(`\n✅ Found ${result.rows.length} admin user(s):\n`);
      result.rows.forEach((admin, index) => {
        console.log(`${index + 1}. Email: ${admin.email}`);
        console.log(`   Name: ${admin.full_name || 'N/A'}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Created: ${new Date(admin.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

listAdmins();

