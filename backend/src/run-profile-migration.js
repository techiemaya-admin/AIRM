/**
 * Run Profile Fields Migration
 * Adds extended profile fields to the database
 */

import pool from './db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  try {
    console.log('🚀 Starting profile fields migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/add-extended-profile-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: add-extended-profile-fields.sql');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added columns to profiles:');
    console.log('   - job_title');
    console.log('   - department');
    console.log('   - employment_type');
    console.log('   - employee_id');
    console.log('   - reporting_manager');
    console.log('   - personal_email');
    console.log('   - emergency_contact');
    console.log('   - education (JSONB)');
    console.log('   - certifications (JSONB)');
    console.log('   - project_history (JSONB)');
    console.log('   - performance_reviews (JSONB)');
    console.log('   - documents (JSONB)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Some columns may already exist. This is normal if migration was run before.');
    } else {
      console.error('Full error:', error);
    }
  } finally {
    // Close the database connection
    await pool.end();
  }
};

// Run the migration
runMigration();

