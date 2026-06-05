
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
      output += `\n--- ${table.toUpperCase()} TABLE (public schema) ---\n`;
      const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      cols.rows.forEach(row => {
        output += `${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable}, Default: ${row.column_default})\n`;
      });
    }
    fs.writeFileSync('schema_public_details.txt', output);
    console.log('Schema written to schema_public_details.txt');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
