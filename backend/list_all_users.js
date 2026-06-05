import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        // First find which schema the users table is in
        const schemas = await pool.query(`
      SELECT table_schema FROM information_schema.tables 
      WHERE table_name = 'users'
    `);
        console.log('Users table found in schemas:', schemas.rows.map(r => r.table_schema));

        // Try public schema first
        const res = await pool.query(`
      SELECT u.email, ur.role, u.created_at::date as joined
      FROM public.users u
      LEFT JOIN public.user_roles ur ON u.id = ur.user_id
      ORDER BY u.created_at DESC
      LIMIT 30
    `);
        console.log('\n=== All Users ===');
        res.rows.forEach(r => {
            console.log(`  ${(r.role || 'employee').padEnd(10)} | ${r.joined} | ${r.email}`);
        });
    } catch (err) {
        // Try erp schema
        try {
            const res = await pool.query(`
        SELECT u.email, ur.role, u.created_at::date as joined
        FROM erp.users u
        LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
        ORDER BY u.created_at DESC
        LIMIT 30
      `);
            console.log('\n=== All Users (erp schema) ===');
            res.rows.forEach(r => {
                console.log(`  ${(r.role || 'employee').padEnd(10)} | ${r.joined} | ${r.email}`);
            });
        } catch (e2) {
            console.error('Both schemas failed:', err.message, e2.message);
        }
    } finally {
        await pool.end();
    }
}

run();
