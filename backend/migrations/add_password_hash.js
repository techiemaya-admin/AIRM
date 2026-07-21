/**
 * Migration: Add password_hash column to users table
 * Run once: node backend/migrations/add_password_hash.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

// Use individual credentials (same fallback as shared/database/connection.js)
const pool = new Pool({
  host: process.env.DB_HOST || '165.22.221.77',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'salesmaya_agent',
  user: process.env.DB_USER || 'developer',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migration: add password_hash to users...');

    // Set schema — users table lives in lad_dev on this database
    const schema = process.env.DB_SCHEMA || 'lad_dev';
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
