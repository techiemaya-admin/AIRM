import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://dbadmin:TechieMaya$0326@165.22.221.77:5432/salesmaya_agent',
});

async function run() {
  await client.connect();
  console.log('🚀 Altering erp.issues table...');
  try {
    await client.query('ALTER TABLE erp.issues ADD COLUMN IF NOT EXISTS repo_name text');
    console.log('✅ Added repo_name column to erp.issues');
  } catch (e) {
    console.log('ℹ️ repo_name column might already exist or error:', e.message);
  }

  try {
    await client.query('ALTER TABLE erp.issues ALTER COLUMN github_id TYPE bigint');
    console.log('✅ Changed github_id to bigint in erp.issues');
  } catch (e) {
    console.log('ℹ️ github_id alteration error:', e.message);
  }

  try {
    await client.query('ALTER TABLE erp.github_projects ALTER COLUMN github_id TYPE text');
    console.log('✅ Changed github_id to text in erp.github_projects');
  } catch (e) {
    console.log('ℹ️ github_projects github_id alteration error:', e.message);
  }

  await client.end();
}
run().catch(console.error);
