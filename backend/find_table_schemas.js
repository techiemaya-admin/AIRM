
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
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
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findTables();
