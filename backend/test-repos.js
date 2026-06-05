import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'prasad758';
const GITHUB_API = 'https://api.github.com';

const githubApi = axios.create({
  baseURL: GITHUB_API,
  headers: {
    'Authorization': GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : undefined,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }
});

async function testRepos() {
  try {
    console.log(`🔍 Testing GitHub repos fetch for ${GITHUB_OWNER}`);
    console.log(`🔑 Token present: ${!!GITHUB_TOKEN}`);
    
    // Try user repos first (publicly owned)
    try {
        const response = await githubApi.get(`/users/${GITHUB_OWNER}/repos?sort=updated&per_page=20`);
        console.log(`✅ [1] User repos found via public API: ${response.data.length}`);
        console.log('Names:', response.data.map(r => r.name).join(', '));
    } catch (e) {
        console.log(`❌ Public API fetch failed: ${e.message}`);
    }

    // Try authenticated user repos (includes collaborator repos)
    try {
        const response = await githubApi.get('/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator,organization_member');
        console.log(`✅ [2] Authenticated user repos found: ${response.data.length}`);
        console.log('Names:', response.data.map(r => r.full_name).join(', '));
    } catch (e) {
        console.log(`❌ Authenticated API fetch failed: ${e.message}`);
        if (e.response) console.log('Data:', e.response.data);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testRepos();
