import axios from 'axios';

const token = process.env.GITHUB_TOKEN;

// Step 1: Get projects
const r = await axios({
  url: 'https://api.github.com/graphql',
  method: 'post',
  headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
  data: { query: `{ viewer { projectsV2(first: 5) { nodes { id title number } } } }` }
});

const projects = r.data.data?.viewer?.projectsV2?.nodes || [];
console.log('Projects:', projects.map(p => ({ id: p.id, title: p.title, number: p.number })));

if (projects.length === 0) {
  console.log('No projects found. Trying user query...');
  process.exit(0);
}

const pid = projects[0].id;
console.log('\nTesting addItem to project:', pid);

const mutation = `
  mutation($projectId: ID!, $title: String!) {
    addProjectV2DraftIssue(input: { projectId: $projectId, title: $title }) {
      projectItem {
        id
        content {
          ... on DraftIssue { id title }
        }
      }
    }
  }
`;

const r2 = await axios({
  url: 'https://api.github.com/graphql',
  method: 'post',
  headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
  data: { query: mutation, variables: { projectId: pid, title: 'Test item from Pulse UI' } }
});

console.log('Add result:', JSON.stringify(r2.data, null, 2));
