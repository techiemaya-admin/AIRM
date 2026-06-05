import pool from '../shared/database/connection.js';

async function runMigration() {
    console.log('🔧 Running fix-issue-priority-constraint migration...');
    try {
        // Remove the CHECK constraint on priority to allows custom priorities
        await pool.query(`
            ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_priority_check;
        `);

        console.log('✅ Migration successful! Issue priority constraint removed.');
        console.log('   Custom priority values are now allowed.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        console.error('   Error details:', err.message);
        process.exit(1);
    }
}

runMigration();
