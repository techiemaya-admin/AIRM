import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://dbadmin:TechieMaya$0326@165.22.221.77:5432/salesmaya_agent',
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM erp.github_projects');
  console.table(res.rows);
  await client.end();
}
run().catch(console.error);
