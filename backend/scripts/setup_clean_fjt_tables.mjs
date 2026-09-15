import pool from '../shared/database/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    console.log('Dropping existing fjt tables to start clean without any dummy data...');
    await pool.query(`
      DROP TABLE IF EXISTS erp.fjt_issues CASCADE;
      DROP TABLE IF EXISTS erp.fjt_sprints CASCADE;
      DROP TABLE IF EXISTS erp.fjt_epics CASCADE;
      DROP TABLE IF EXISTS erp.fjt_projects CASCADE;
    `);
    console.log('✅ Dropped any previous fjt tables');

    // Read and run DDL
    const ddlPath = path.resolve(__dirname, '../features/fjt-board/schema/fjt_board.sql');
    const ddl = fs.readFileSync(ddlPath, 'utf8');
    await pool.query(ddl);
    console.log('✅ Created fresh empty tables: erp.fjt_projects, erp.fjt_epics, erp.fjt_sprints, erp.fjt_issues');

    // Verify row counts are all 0
    const [projCount, epicCount, sprintCount, issueCount] = await Promise.all([
      pool.query('SELECT count(*) FROM erp.fjt_projects'),
      pool.query('SELECT count(*) FROM erp.fjt_epics'),
      pool.query('SELECT count(*) FROM erp.fjt_sprints'),
      pool.query('SELECT count(*) FROM erp.fjt_issues'),
    ]);

    console.log(`Current Row Counts in Database:
  - erp.fjt_projects: ${projCount.rows[0].count}
  - erp.fjt_epics:    ${epicCount.rows[0].count}
  - erp.fjt_sprints:  ${sprintCount.rows[0].count}
  - erp.fjt_issues:   ${issueCount.rows[0].count}
`);
    console.log('🎉 FJT Board tables are completely fresh and ready for user to add data from UI!');
  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
