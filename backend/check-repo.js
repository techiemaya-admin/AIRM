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

async function checkSpecificRepo() {
  try {
    console.log(`🔍 Checking subzeroid/instagrapi repository...`);
    const resp = await githubApi.get('/repos/subzeroid/instagrapi');
    console.log(`✅ Found repo: ${resp.data.full_name}`);
    console.log(`Permissions:`, resp.data.permissions);
  } catch (e) {
    console.log(`❌ Failed to find repo: ${e.message}`);
    if (e.response) console.log('Data:', e.response.data);
  }
}

checkSpecificRepo();
