
import pool from './shared/database/connection.js';

async function checkDB() {
  try {
    const projects = await pool.query('SELECT id, title, project_name, repo_name FROM issues WHERE project_name IS NOT NULL');
    console.log('--- issues (local projects) ---');
    console.table(projects.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
