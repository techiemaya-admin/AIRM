/**
 * Migration: Add password_hash column to users table
 * Run once: node backend/migrations/add_password_hash.js
 */

import pool from '../shared/database/connection.js';

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migration: add password_hash to users...');

    // Set schema dynamically
    const schema = process.env.DB_SCHEMA || 'erp';
    await client.query(`SET search_path TO ${schema}, public`);

    // Check if column already exists
    const check = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = 'users'
        AND column_name = 'password_hash'
    `, [schema]);

    if (check.rows.length > 0) {
      console.log('✅ Column password_hash already exists, nothing to do.');
    } else {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN password_hash TEXT
      `);
      console.log('✅ Added password_hash column to users table.');
    }

    // Also show current columns for confirmation
    const cols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = 'users'
      ORDER BY ordinal_position
    `, [schema]);
    console.log('📋 users table columns:', cols.rows.map(r => r.column_name).join(', '));

    console.log('✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
