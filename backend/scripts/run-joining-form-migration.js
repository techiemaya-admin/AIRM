/**
 * Run the Employee Joining Form migration
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../configs/.env') });

const pool = new pg.Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || '143.110.249.144',
  port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'salesmaya_agent',
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'techiemaya',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running Employee Joining Form migration...');
    
    // Path is relative to AIRM folder, not backend
    const sqlPath = path.join(__dirname, '..', '..', 'database', '004_employee_joining_form_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
