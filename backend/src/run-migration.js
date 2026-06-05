/**
 * Database Migration Script
 * Creates the necessary tables for project management
 */

import pool from './db/connection.js';
import fs from 'fs';
import path from 'path';

const runMigration = async () => {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), '../database/project-management-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Created tables:');
    console.log('   - gitlab_projects');
    console.log('   - project_members');
    console.log('   - Updated gitlab_issues');
    console.log('   - Updated foreign key constraints');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
};

// Run the migration
runMigration();