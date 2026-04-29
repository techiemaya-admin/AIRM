import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://dbadmin:TechieMaya$0326@165.22.221.77:5432/salesmaya_agent',
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
