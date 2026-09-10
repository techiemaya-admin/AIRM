import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://developer:O8yH7SuPfCCu1PsrZYGAAB2@165.22.221.77:5432/salesmaya_agent?sslmode=no-verify',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to DB');

    const users = await client.query('SELECT * FROM erp.users LIMIT 15');
    console.log(`Total users in erp.users: ${users.rows.length}`);
    console.log(users.rows.map(u => ({ id: u.id, name: u.full_name || u.name, email: u.email })));

    const issues = await client.query('SELECT id, key, summary, assignee_id, assignee_name, raw_data FROM erp.fjt_issues');
    console.log(`Current issues in erp.fjt_issues: ${issues.rows.length}`);
    for (const issue of issues.rows) {
      console.log(`Issue ${issue.key}: assignee_name="${issue.assignee_name}", raw_data.assignees count=${issue.raw_data?.assignees?.length || 0}`);
      if (issue.raw_data?.assignees) {
        console.log('Assignees list:', issue.raw_data.assignees.map(a => a.name));
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
