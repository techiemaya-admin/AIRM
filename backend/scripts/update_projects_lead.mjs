import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://developer:O8yH7SuPfCCu1PsrZYGAAB2@165.22.221.77:5432/salesmaya_agent?sslmode=no-verify',
  ssl: { rejectUnauthorized: false },
  max: 1
});

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
