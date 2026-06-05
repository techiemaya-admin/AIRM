import pool from '../shared/database/connection.js';

async function runMigration() {
    console.log('Running migration...');
    try {
        await pool.query(`
      ALTER TABLE recruitment_candidates 
      ADD COLUMN IF NOT EXISTS location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS comments TEXT;
    `);
        console.log('Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
