import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixRoles() {
  try {
    await pool.query('SET search_path TO erp, public');
    console.log('Altering user_roles constraints...');
    
    // Drop the constraint if it exists (the name is usually user_roles_role_check)
    await pool.query(`ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;`);
    
    // Add the new constraint
    await pool.query(`ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'user', 'employee', 'ex-employee'));`);
    
    console.log('Successfully updated constraints!');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

fixRoles();
