import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = 'https://api.github.com';

const githubApi = axios.create({
  baseURL: GITHUB_API,
  headers: {
    'Authorization': GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : undefined,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }
});

async function checkUserProfile() {
  try {
    const resp = await githubApi.get('/user');
    console.log(`User: ${resp.data.login}`);
    console.log(`Public Repos: ${resp.data.public_repos}`);
    console.log(`Total Private Repos: ${resp.data.total_private_repos}`);
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
  }
}

checkUserProfile();
