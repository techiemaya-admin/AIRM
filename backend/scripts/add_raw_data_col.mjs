import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://developer:O8yH7SuPfCCu1PsrZYGAAB2@165.22.221.77:5432/salesmaya_agent?sslmode=no-verify',
  ssl: { rejectUnauthorized: false },
  max: 1
});

async function run() {
  try {
    console.log('Adding raw_data column to erp.fjt_issues if not exists...');
    await pool.query(`
      ALTER TABLE erp.fjt_issues 
      ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}';
    `);

    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'erp' AND table_name = 'fjt_issues'
      ORDER BY ordinal_position;
    `);

    console.log('Current columns in erp.fjt_issues:');
    console.log(cols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  } catch (err) {
    console.error('Error adding raw_data column:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
