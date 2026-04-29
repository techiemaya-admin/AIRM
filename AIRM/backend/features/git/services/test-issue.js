import dotenv from 'dotenv';
dotenv.config({ path: '../../../.env' });
import axios from 'axios';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'prasad758';
const GITHUB_REPO = 'prasad-s-portfolio-hub';

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }
});

async function testCreateIssue() {
  try {
    console.log(`Testing issue creation on ${GITHUB_OWNER}/${GITHUB_REPO}...`);
    const response = await githubApi.post(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
      title: 'Test Issue from Script',
      body: 'This is a test issue created to verify token permissions.'
    });
    console.log('✅ Issue created successfully:', response.data.html_url);
  } catch (error) {
    console.error('❌ Failed to create issue:', error.response?.data || error.message);
  }
}

testCreateIssue();
