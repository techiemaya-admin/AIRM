
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    console.log('--- USERS TABLE ---');
    const usersCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.table(usersCols.rows);

    console.log('\n--- PROFILES TABLE ---');
    const profilesCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
    `);
    console.table(profilesCols.rows);

    console.log('\n--- RECRUITMENT_CANDIDATES TABLE ---');
    const candidatesCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recruitment_candidates'
    `);
    console.table(candidatesCols.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
