
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;

async function listAllProjects() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        projectsV2(first: 100) {
          nodes { id title number url }
        }
      }
      organization(login: $login) {
        projectsV2(first: 100) {
          nodes { id title number url }
        }
      }
    }
  `;

  try {
    const res = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      data: { query, variables: { login: GITHUB_OWNER } }
    });
    
    console.log('--- GitHub Projects (User) ---');
    console.table(res.data.data?.user?.projectsV2?.nodes || []);
    
    console.log('--- GitHub Projects (Org) ---');
    console.table(res.data.data?.organization?.projectsV2?.nodes || []);
    
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

listAllProjects();
