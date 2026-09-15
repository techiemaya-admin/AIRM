import pool from '../shared/database/connection.js';

async function run() {
  try {
    await pool.query(`
      UPDATE erp.fjt_projects 
      SET lead = '-'
      WHERE lead = 'Free Tech' OR lead IS NULL;
    `);

    const res = await pool.query(`SELECT id, key, name, lead, lead_user_id FROM erp.fjt_projects;`);
    console.log('Projects:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
