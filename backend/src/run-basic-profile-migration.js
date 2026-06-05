/**
 * Run Basic Profile Fields Migration
 * Adds basic profile fields (phone, skills, join_date, etc.) to the database
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
    console.log('🚀 Starting basic profile fields migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/add-profile-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: add-profile-fields.sql');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added columns to profiles:');
    console.log('   - phone');
    console.log('   - skills (TEXT[])');
    console.log('   - join_date');
    console.log('   - experience_years');
    console.log('   - previous_projects (JSONB)');
    console.log('   - bio');
    console.log('   - linkedin_url');
    console.log('   - github_url');
    
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

