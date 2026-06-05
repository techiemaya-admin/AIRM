import pool from '../shared/database/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log('🔧 Running fix-issue-status-constraint migration...');
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations/fix-issue-status-constraint.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');

        // Execute the migration
        await pool.query(migrationSQL);

        console.log('✅ Migration successful! Issue status constraint removed.');
        console.log('   Custom status values are now allowed for flexible kanban boards.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        console.error('   Error details:', err.message);
        process.exit(1);
    }
}

runMigration();
