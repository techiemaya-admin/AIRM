
import pool from './shared/database/connection.js';

async function migrate() {
  try {
    // Update repo_name where it's null but project_name matches some logic
    // For now, let's just set repo_name = project_name for projects that look like repos
    // OR if title is "X - Project", set repo_name to X.
    
    const res = await pool.query(`
      UPDATE issues 
      SET repo_name = project_name 
      WHERE repo_name IS NULL 
      AND project_name IS NOT NULL 
      AND project_name != ''
      AND (
        project_name IN (SELECT name FROM erp.github_projects)
        OR title LIKE '% - Project'
      )
    `);
    console.log(`Updated ${res.rowCount} rows in issues table.`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
