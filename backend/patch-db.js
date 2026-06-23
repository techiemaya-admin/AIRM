import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://<USERNAME>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>',
});

async function run() {
  await client.connect();
  
  // Get github project ID for new-project
  const p = await client.query("SELECT github_id FROM erp.github_projects WHERE name ILIKE '%test%' OR repo_name ILIKE '%new-project%' LIMIT 1");
  const github_project_id = p.rows[0]?.github_id;
  
  if (github_project_id) {
     console.log("Found project ID:", github_project_id);
     await client.query(`UPDATE erp.issues SET github_iid = 5, github_project_id = $1 WHERE id = 61`, [github_project_id]);
     console.log("Updated issue 61!");
  } else {
     console.log("Could not find project id");
  }
  
  await client.end();
}
run().catch(console.error);
