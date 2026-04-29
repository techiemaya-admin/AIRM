import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://dbadmin:TechieMaya$0326@165.22.221.77:5432/salesmaya_agent',
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT id, title, github_id, github_iid, github_project_id FROM erp.issues WHERE id = 61');
  console.log('Issue:', res.rows[0]);
  
  await client.end();
}
run().catch(console.error);
