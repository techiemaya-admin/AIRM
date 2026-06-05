
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findTriggers() {
  try {
    const res = await pool.query(`
      SELECT 
        event_object_schema as table_schema,
        event_object_table as table_name,
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('users', 'profiles', 'recruitment_candidates')
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findTriggers();
