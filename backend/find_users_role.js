
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findUsersWithRole() {
  try {
    const res = await pool.query(`
      SELECT table_schema, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findUsersWithRole();
