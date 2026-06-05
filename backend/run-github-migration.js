import pool from './shared/database/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const migrationPath = path.resolve(__dirname, 'migrations/add-github-mapping.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: add-github-mapping.sql');
    await pool.query(sql);
    console.log('✅ Migration successful');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
