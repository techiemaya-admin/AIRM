
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findTables() {
  try {
    const res = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('users', 'profiles', 'recruitment_candidates')
      ORDER BY table_name, table_schema
    `);
    res.rows.forEach(row => {
        console.log(`${row.table_schema}.${row.table_name}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findTables();
