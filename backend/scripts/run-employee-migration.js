import pool from '../shared/database/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../migrations/create-employee-table.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running employee table migration...');
        await pool.query(sql);
        console.log('Employee table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
