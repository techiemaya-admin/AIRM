import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT count(*) FROM erp.github_projects');
  console.log('GitHub Projects count:', res.rows[0].count);
  const res2 = await client.query('SELECT count(*) FROM erp.issues WHERE github_id IS NOT NULL');
  console.log('Issues with GitHub ID count:', res2.rows[0].count);
  await client.end();
}
run().catch(console.error);
