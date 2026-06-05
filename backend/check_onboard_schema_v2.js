
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  let output = '';
  try {
    const tables = ['users', 'profiles', 'recruitment_candidates'];
    for (const table of tables) {
      output += `\n--- ${table.toUpperCase()} TABLE ---\n`;
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
        ORDER BY ordinal_position
      `);
      cols.rows.forEach(row => {
        output += `${row.column_name}: ${row.data_type}\n`;
      });
    }
    fs.writeFileSync('schema_output.txt', output);
    console.log('Schema written to schema_output.txt');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
