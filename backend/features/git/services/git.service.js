/**
 * Git Service
 * Business logic for Git (GitHub/GitLab) integration
 */

import axios from 'axios';
import pool from '../../../shared/database/connection.js';

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'prasad758';
const GITHUB_REPO = process.env.GITHUB_REPO || 'my-test-repo';
const GITHUB_API = 'https://api.github.com';

console.log('GitHub Config:', { GITHUB_OWNER, GITHUB_REPO, hasToken: !!GITHUB_TOKEN });

/**
 * GitHub API helper
 */
const githubApi = axios.create({
  baseURL: GITHUB_API,
  headers: {
    'Authorization': GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : undefined,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }
});

/**
 * Get all commits from GitHub
 */
export async function getCommits(repoName) {
  try {
    if (repoName) {
      let owner = GITHUB_OWNER;
      let repo = repoName;
      if (repoName.includes('/')) {
        [owner, repo] = repoName.split('/');
      }
      const response = await githubApi.get(`/repos/${owner}/${repo}/commits?per_page=20`);
      return response.data.map(commit => ({
        id: commit.sha,
        short_id: commit.sha.substring(0, 8),
        title: commit.commit.message.split('\n')[0],
        message: commit.commit.message,
        author_name: commit.commit.author?.name || 'Unknown',
        author_email: commit.commit.author?.email || '',
        created_at: commit.commit.author?.date,
        web_url: commit.html_url,
        repository: repo
      }));
    } else {
      // Fetch commits across all repos (top 5 by recent update)
      const reposResponse = await githubApi.get(`/users/${GITHUB_OWNER}/repos?sort=updated&per_page=5`);
      const repos = reposResponse.data;
      
      const commitPromises = repos.map(repo => 
        githubApi.get(`/repos/${GITHUB_OWNER}/${repo.name}/commits?per_page=10`)
          .then(res => res.data.map(commit => ({
            id: commit.sha,
            short_id: commit.sha.substring(0, 8),
            title: commit.commit.message.split('\n')[0],
            message: commit.commit.message,
            author_name: commit.commit.author?.name || commit.author?.login || 'Unknown',
            author_email: commit.commit.author?.email || '',
            created_at: commit.commit.author?.date,
            web_url: commit.html_url,
            repository: repo.name
          })))
          .catch(() => [])
      );
      
      const results = await Promise.all(commitPromises);
      const allCommits = results.flat().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return allCommits.slice(0, 50);
    }
  } catch (error) {
    console.error('Error fetching GitHub commits:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get all issues from GitHub
 */
export async function getIssues(repoName) {
  try {
    console.log('--- Git Service Debug ---');
    console.log('Received repoName param:', repoName);
    
    let issues = [];
    if (repoName) {
      let owner = GITHUB_OWNER;
      let repo = repoName;
      if (repoName.includes('/')) {
        [owner, repo] = repoName.split('/');
      }
      console.log(`🔍 Fetching GitHub issues for ${owner}/${repo}`);
      const url = `/repos/${owner}/${repo}/issues?per_page=100&state=all`;
      console.log(`🚀 GET ${url}`);
      const response = await githubApi.get(url);
      issues = response.data;
      console.log(`✅ GitHub returned ${issues.length} items for ${repo}`);
    } else {
      console.log(`🔍 Fetching ALL GitHub issues for ${GITHUB_OWNER} (search)`);
      // Search for issues in any repo owned by the GITHUB_OWNER
      // q=user:username+is:issue
      const response = await githubApi.get(`/search/issues?q=user:${GITHUB_OWNER}+is:issue&per_page=100&sort=updated`);
      issues = response.data.items || [];
    }
    
    console.log(`✅ GitHub returned ${issues.length} items`);
    
    // Map GitHub issues to internal format
    return issues.map(issue => {
      // Extract repo name from url if not provided
      const repoFromUrl = issue.repository_url?.split('/').pop() || 'unknown';
      
      return {
        id: issue.id,
        iid: issue.number,
        title: issue.title,
        description: issue.body || '',
        state: issue.state === 'open' ? 'opened' : 'closed',
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        repository: repoFromUrl,
        author: {
          id: issue.user.id,
          login: issue.user.login,
          avatar_url: issue.user.avatar_url
        },
        assignees: (issue.assignees || []).map(a => ({
          id: a.id,
          login: a.login,
          avatar_url: a.avatar_url
        })),
        labels: (issue.labels || []).map(l => ({
          id: l.id,
          name: l.name,
          color: l.color,
          description: l.description
        })),
        web_url: issue.html_url
      };
    });
  } catch (error) {
    console.error('Error fetching GitHub issues:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get commit details
 */
export async function getCommit(sha) {
  const response = await githubApi.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${sha}`);
  const commit = response.data;
  return {
    id: commit.sha,
    short_id: commit.sha.substring(0, 8),
    title: commit.commit.message.split('\n')[0],
    message: commit.commit.message,
    author_name: commit.commit.author.name,
    author_email: commit.commit.author.email,
    created_at: commit.commit.author.date,
    web_url: commit.html_url
  };
}

/**
 * Helper to resolve repository name for an issue
 */
async function resolveRepoForIssue(id, repoName) {
  if (repoName) {
    console.log(`✅ Using provided repoName: ${repoName}`);
    return repoName;
  }
  
  console.log(`🔍 Resolving repo for issue #${id} via search...`);
  try {
    const searchRes = await githubApi.get(`/search/issues?q=user:${GITHUB_OWNER}+${id}+is:issue`);
    const issueData = (searchRes.data.items || []).find(item => item.number === parseInt(id));
    
    if (issueData) {
      const resolvedRepo = issueData.repository_url.split('/').pop();
      console.log(`✅ Resolved repo for issue #${id}: ${resolvedRepo}`);
      return resolvedRepo;
    }
  } catch (error) {
    console.error(`❌ Failed to resolve repo for issue #${id}:`, error.response?.data || error.message);
  }
  
  console.log(`⚠️ Falling back to default repo: ${GITHUB_REPO}`);
  return GITHUB_REPO;
}

/**
 * Get issue details
 */
export async function getIssue(id, repoName) {
  // id here is the issue number for GitHub
  
  let targetRepo = repoName;
  
  try {
    if (!targetRepo) {
      targetRepo = await resolveRepoForIssue(id, repoName);
    }
    
    console.log(`🔍 GitService.getIssue: iid=${id}, repoName=${repoName}, targetRepo=${targetRepo}`);
    let owner = GITHUB_OWNER;
    let repo = targetRepo || GITHUB_REPO;
    if (targetRepo && targetRepo.includes('/')) {
      [owner, repo] = targetRepo.split('/');
    }

    const issueResponse = await githubApi.get(`/repos/${owner}/${repo}/issues/${id}`);
    const issueData = issueResponse.data;

    // 3. Fetch comments for the resolved targetRepo and issue number
    const commentsResponse = await githubApi.get(`/repos/${owner}/${repo}/issues/${id}/comments`)
      .catch((err) => {
        console.error(`Error fetching comments for ${targetRepo}#${id}:`, err.message);
        return { data: [] };
      });

    return {
      id: issueData.id,
      iid: issueData.number,
      title: issueData.title,
      description: issueData.body,
      state: issueData.state,
      created_at: issueData.created_at,
      updated_at: issueData.updated_at,
      repository: targetRepo,
      author: {
        id: issueData.user.id,
        login: issueData.user.login,
        avatar_url: issueData.user.avatar_url
      },
      assignees: (issueData.assignees || []).map(a => ({
        id: a.id,
        login: a.login,
        avatar_url: a.avatar_url
      })),
      labels: (issueData.labels || []).map(l => ({
        id: l.id,
        name: l.name,
        color: l.color
      })),
      notes: (commentsResponse.data || []).map(comment => ({
        id: comment.id,
        body: comment.body,
        created_at: comment.created_at,
        user: {
          id: comment.user.id,
          login: comment.user.login,
          avatar_url: comment.user.avatar_url
        }
      }))
    };
  } catch (error) {
    console.error('Get issue details error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get GitHub Owner ID (Node ID) for GraphQL operations
 */
export async function getOwnerId() {
  try {
    // Try as user first
    const userRes = await githubApi.get(`/users/${GITHUB_OWNER}`);
    if (userRes.data.node_id) return userRes.data.node_id;

    // Try as organization
    const orgRes = await githubApi.get(`/orgs/${GITHUB_OWNER}`);
    return orgRes.data.node_id;
  } catch (error) {
    console.error('Error fetching GitHub owner ID:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a new GitHub Project (V2)
 */
/**
 * Template column definitions for each project type
 */
const TEMPLATE_COLUMNS = {
  'kanban':              ['Todo', 'In Progress', 'Done'],
  'team-planning':      ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
  'bug-tracker':        ['New', 'Confirmed', 'In Progress', 'Fixed', 'Verified'],
  'feature-release':    ['Planning', 'In Progress', 'Review', 'Released'],
  'iterative-development': ['Backlog', 'Current Sprint', 'In Progress', 'Done'],
  'product-launch':     ['Planning', 'Building', 'Testing', 'Launched'],
  'roadmap':            ['Planned', 'In Progress', 'Done'],
  'team-retrospective': ['Went Well', 'Improve', 'Action Items', 'Done'],
  'table':              ['Todo', 'In Progress', 'Done'],
  'board':              ['Todo', 'In Progress', 'Done'],
};

/**
 * Apply template columns to a newly created GitHub Project V2 by updating
 * the built-in Status single-select field's options.
 */
async function applyTemplateToProject(projectId, template) {
  const templateKey = (template || '').toLowerCase().replace(/\s+/g, '-');
      const columns = TEMPLATE_COLUMNS[templateKey];

  console.log(`🛠️ applyTemplateToProject: ID=${projectId}, Key="${templateKey}", Found columns=${columns ? columns.length : 0}`);

  if (!columns) {
    console.log(`ℹ️ No template columns defined for "${template}", using GitHub defaults.`);
    return;
  }

  console.log(`🛠️ Applying template "${template}" → columns: ${columns.join(', ')}`);
  const fieldsQuery = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const fieldsRes = await githubApi.post('/graphql', {
      query: fieldsQuery,
      variables: { projectId }
    });

    const fields = fieldsRes.data?.data?.node?.fields?.nodes || [];
    const statusField = fields.find(f => f?.name === 'Status');

    if (!statusField) {
      console.warn('⚠️ Could not find Status field on new project — skipping template columns.');
      return;
    }

    console.log(`✅ Found Status field: ${statusField.id}, existing options: ${statusField.options.map(o => o.name).join(', ')}`);

    // 2. Update the Status field options to match the template columns
    // GitHub GraphQL API: updateProjectV2Field can update single-select options
    const updateFieldMutation = `
      mutation($fieldId: ID!, $singleSelectOptions: [ProjectV2SingleSelectFieldOptionInput!]!) {
        updateProjectV2Field(input: {
          fieldId: $fieldId
          singleSelectOptions: $singleSelectOptions
        }) {
          projectV2Field {
            ... on ProjectV2SingleSelectField {
              id
              name
              options { id name }
            }
          }
        }
      }
    `;

    // Build the color-coded options for each column
    const COLOR_MAP = {
      'Todo': 'GRAY', 'Backlog': 'GRAY', 'New': 'GRAY', 'Planning': 'GRAY',
      'Planned': 'GRAY', 'Went Well': 'GREEN',
      'In Progress': 'YELLOW', 'Current Sprint': 'YELLOW', 'Building': 'YELLOW',
      'Review': 'ORANGE', 'Ready': 'BLUE', 'Confirmed': 'ORANGE',
      'Done': 'GREEN', 'Released': 'GREEN', 'Fixed': 'GREEN',
      'Launched': 'GREEN', 'Verified': 'GREEN', 'Action Items': 'RED',
      'Improve': 'RED', 'Testing': 'ORANGE',
    };

    const singleSelectOptions = columns.map(col => ({
      name: col,
      description: col,
      color: COLOR_MAP[col] || 'GRAY'
    }));

    const updateRes = await githubApi.post('/graphql', {
      query: updateFieldMutation,
      variables: { fieldId: statusField.id, singleSelectOptions }
    });

    if (updateRes.data?.errors) {
      console.error('⚠️ Could not update Status field options:', updateRes.data.errors[0]?.message);
    } else {
      console.log(`✅ Template columns applied successfully!`);
    }
  } catch (err) {
    console.error('❌ applyTemplateToProject error:', err.message);
    // Non-fatal: project still exists, just with default columns
  }
}

export async function createProject(name, template = 'default', repoName = null) {
  try {
    console.log(`🚀 Creating GitHub Project (V2): ${name} using template: ${template}`);
    
    const ownerId = await getOwnerId();
    
    // GraphQL mutation to create ProjectV2
    const createQuery = `
      mutation($ownerId: ID!, $title: String!) {
        createProjectV2(input: {ownerId: $ownerId, title: $title}) {
          projectV2 {
            id
            number
            title
            url
          }
        }
      }
    `;

    const response = await githubApi.post('/graphql', {
      query: createQuery,
      variables: { ownerId, title: name }
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const project = response.data.data.createProjectV2.projectV2;
    console.log(`✅ GitHub Project created: ${project.url}`);
    
    // Apply template columns to the new project
    try {
      await applyTemplateToProject(project.id, template);
    } catch (templateError) {
      console.warn('⚠️ Template application failed, but project was created:', templateError.message);
    }
    
    // If a repo name was provided, link the project to that repository
    if (repoName) {
      await linkProjectToRepo(project.id, repoName);
    }
    
    return {
      id: project.id,
      number: project.number,
      name: project.title,
      html_url: project.url,
      owner: { login: GITHUB_OWNER }
    };
  } catch (error) {
    console.error('Error creating GitHub Project:', error.message);
    throw error;
  }
}

/**
 * Link a GitHub Project V2 to a repository so it appears in the repo's Projects tab
 */
async function linkProjectToRepo(projectId, repoName) {
  try {
    let owner = GITHUB_OWNER;
    let repo = repoName;
    if (repoName.includes('/')) {
      [owner, repo] = repoName.split('/');
    }

    const repoRes = await githubApi.get(`/repos/${owner}/${repo}`);
    const repoNodeId = repoRes.data.node_id;
    if (!repoNodeId) {
      console.warn(`⚠️ Could not get node_id for repo ${repoName}`);
      return;
    }

    const linkMutation = `
      mutation($projectId: ID!, $repositoryId: ID!) {
        linkProjectV2ToRepository(input: { projectId: $projectId, repositoryId: $repositoryId }) {
          repository {
            name
          }
        }
      }
    `;

    const linkRes = await githubApi.post('/graphql', {
      query: linkMutation,
      variables: { projectId, repositoryId: repoNodeId }
    });

    if (linkRes.data?.errors) {
      console.warn('⚠️ linkProjectV2ToRepository errors:', linkRes.data.errors[0]?.message);
    } else {
      console.log(`✅ Project linked to repository: ${repoName}`);
    }
  } catch (err) {
    console.warn(`⚠️ Could not link project to repo ${repoName}:`, err.message);
    // Non-fatal: project exists, just not shown in repo's Projects tab
  }
}


/**
 * Create a new repository on GitHub
 */
export async function createRepo(name, description) {
  try {
    console.log(`🚀 Creating GitHub repository: ${name}`);
    const response = await githubApi.post('/user/repos', {
      name: name,
      description: description || `Project: ${name}`,
      private: true,
      auto_init: true // Initialize with a README
    });
    
    console.log(`✅ GitHub repository created: ${response.data.full_name}`);
    return response.data;
  } catch (error) {
    console.error('Error creating GitHub repository:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a new issue on GitHub
 */
export async function createIssue(data, repoName) {
  let owner = GITHUB_OWNER;
  let repo = repoName || GITHUB_REPO;

  if (repoName && repoName.includes('/')) {
    [owner, repo] = repoName.split('/');
  }

  console.log(`🚀 Creating GitHub issue on ${owner}/${repo}`, data);
  try {
    const response = await githubApi.post(`/repos/${owner}/${repo}/issues`, {
      title: data.title,
      body: data.body || data.description,
      assignees: data.assignees || [],
      labels: data.labels || []
    });
    
    return response.data;
  } catch (error) {
    console.error('Git Service: Error creating issue:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Add a comment to a GitHub issue
 */
export async function addComment(issueNumber, content, repoName) {
  const targetRepo = await resolveRepoForIssue(issueNumber, repoName);
  let owner = GITHUB_OWNER;
  let repo = targetRepo || GITHUB_REPO;
  if (targetRepo && targetRepo.includes('/')) {
    [owner, repo] = targetRepo.split('/');
  }

  const url = `/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  console.log(`🚀 GitService.addComment: POST ${url}`);
  
  try {
    const response = await githubApi.post(url, {
      body: content
    });
    console.log(`✅ Comment added successfully to ${targetRepo}#${issueNumber}`);
    return response.data;
  } catch (error) {
    console.error(`❌ GitHub API Error (addComment) [${url}]:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update a GitHub issue (labels, assignees, state)
 */
export async function updateIssue(issueNumber, data, repoName) {
  const targetRepo = await resolveRepoForIssue(issueNumber, repoName);
  console.log(`🚀 GitService.updateIssue: issue=${issueNumber}, repo=${targetRepo}, data=`, data);
  let owner = GITHUB_OWNER;
  let repo = targetRepo || GITHUB_REPO;
  if (targetRepo && targetRepo.includes('/')) {
    [owner, repo] = targetRepo.split('/');
  }

  const response = await githubApi.patch(`/repos/${owner}/${repo}/issues/${issueNumber}`, data);
  return response.data;
}

/**
 * Sync GitHub users with local users
 */
export async function syncUsers() {
  // In GitHub, we might get contributors or collaborators
  const response = await githubApi.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contributors`);
  const githubUsers = response.data;
  let syncedCount = 0;

  for (const gitUser of githubUsers) {
    try {
      // GitHub contributors don't give email by default, we use username as unique key
      const existingUser = await pool.query(
        'SELECT id FROM erp.users WHERE github_username = $1',
        [gitUser.login]
      );

      if (existingUser.rows.length === 0) {
        // Create a placeholder user
        const insertResult = await pool.query(
          `INSERT INTO erp.users (email, full_name, github_username, created_at) 
           VALUES ($1, $2, $3, NOW()) RETURNING id`,
          [`${gitUser.login}@github.com`, gitUser.login, gitUser.login]
        );
        
        if (insertResult.rows.length > 0) {
          await pool.query(
            `INSERT INTO erp.user_roles (user_id, role, created_at) 
             VALUES ($1, 'user', NOW())`,
            [insertResult.rows[0].id]
          );
        }
        syncedCount++;
      }
    } catch (userError) {
      console.error('Error syncing GitHub user:', gitUser.login, userError.message);
    }
  }

  return { synced: syncedCount, total: githubUsers.length };
}

/**
 * Sync GitHub issues with local issues
 */
export async function syncIssues() {
  const issues = await getIssues();
  let syncedCount = 0;

  for (const gitIssue of issues) {
    try {
      const existingIssue = await pool.query(
        'SELECT id FROM erp.issues WHERE github_id = $1',
        [gitIssue.id]
      );

      const userRes = await pool.query('SELECT id FROM erp.users WHERE github_username = $1', [gitIssue.author.login]);
      const userId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

      if (existingIssue.rows.length === 0) {
        await pool.query(
          `INSERT INTO erp.issues (title, description, status, priority, github_id, github_iid, 
           repo_name, created_by, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (github_id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           github_iid = EXCLUDED.github_iid,
           repo_name = EXCLUDED.repo_name,
           updated_at = NOW()`,
          [
            gitIssue.title,
            gitIssue.description || '',
            gitIssue.state === 'closed' ? 'closed' : 'open',
            'medium',
            gitIssue.id,
            gitIssue.iid,
            gitIssue.repository,
            userId,
            gitIssue.created_at,
            gitIssue.updated_at
          ]
        );
        syncedCount++;
      } else {
        await pool.query(
          `UPDATE erp.issues SET 
           title = $1, 
           description = $2, 
           status = $3,
           updated_at = $4
           WHERE github_id = $5`,
          [
            gitIssue.title,
            gitIssue.description || '',
            gitIssue.state === 'closed' ? 'closed' : 'open',
            gitIssue.updated_at,
            gitIssue.id
          ]
        );
      }
    } catch (issueError) {
      console.error('Error syncing issue:', gitIssue.id, issueError.message);
    }
  }

  return { synced: syncedCount, total: issues.length };
}

/**
 * Get mapped users (GitHub + local)
 */
export async function getMappedUsers() {
  const result = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.github_username, ur.role, u.created_at
     FROM erp.users u
     LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
     WHERE u.github_username IS NOT NULL
     ORDER BY u.full_name`
  );
  return result.rows;
}
/**
 * Get all repositories for the authenticated user
 */
export async function getRepos() {
  try {
    console.log(`🔍 Fetching ALL GitHub repos for authenticated user`);
    // Use /user/repos to get both public and private repositories for the token owner
    // Also include repos where the user is a collaborator
    const response = await githubApi.get('/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator');
    
    console.log(`✅ Found ${response.data.length} repositories (before dedup)`);
    
    // Deduplicate by repo ID — GitHub can return the same repo twice when the
    // authenticated user is both the owner AND listed as a collaborator.
    const seenIds = new Set();
    const uniqueRepos = response.data.filter(repo => {
      if (seenIds.has(repo.id)) return false;
      seenIds.add(repo.id);
      return true;
    });

    console.log(`✅ ${uniqueRepos.length} unique repositories after dedup`);

    return uniqueRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '',
      html_url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      open_issues: repo.open_issues_count,
      updated_at: repo.updated_at,
      private: repo.private
    }));
  } catch (error) {
    console.error('Error fetching GitHub repos:', error.response?.data || error.message);
    // Fallback to user public repos if /user/repos fails
    try {
      const fallbackResponse = await githubApi.get(`/users/${GITHUB_OWNER}/repos?sort=updated&per_page=50`);
      return fallbackResponse.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || '',
        html_url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        open_issues: repo.open_issues_count,
        updated_at: repo.updated_at,
        private: repo.private
      }));
    } catch (fallbackError) {
      return [];
    }
  }
}

/**
 * Get repository labels
 */
export async function getRepoLabels(repoName) {
  let owner = GITHUB_OWNER;
  let repo = repoName || GITHUB_REPO;
  if (repoName && repoName.includes('/')) {
    [owner, repo] = repoName.split('/');
  }

  try {
    const response = await githubApi.get(`/repos/${owner}/${repo}/labels`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching repo labels for ${owner}/${repo}:`, error.response?.data || error.message);
    return [];
  }
}


/**
 * Get repository assignees
 */
export async function getRepoAssignees(repoName) {
  let owner = GITHUB_OWNER;
  let repo = repoName || GITHUB_REPO;
  if (repoName && repoName.includes('/')) {
    [owner, repo] = repoName.split('/');
  }

  try {
    const response = await githubApi.get(`/repos/${owner}/${repo}/assignees`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching repo assignees for ${owner}/${repo}:`, error.response?.data || error.message);
    return [];
  }
}
/**
 * Get GitHub Projects (V2) linked to a specific repository
 */
export async function getProjectsForRepo(owner, repo) {
  if (!GITHUB_TOKEN) return [];

  try {
    const query = `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          projectsV2(first: 50) {
            nodes {
              id
              title
              number
              url
              shortDescription
              closed
              createdAt
              updatedAt
              items(first: 0) {
                totalCount
              }
            }
          }
        }
      }
    `;

    const response = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: { query, variables: { owner, repo } }
    });

    const nodes = response.data.data?.repository?.projectsV2?.nodes || [];
    return nodes.map(p => ({
      id: p.id,
      name: p.title,
      description: p.shortDescription || '',
      web_url: p.url,
      number: p.number,
      closed: p.closed,
      issue_count: p.items?.totalCount || 0,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      source: 'github_project',
    }));
  } catch (error) {
    console.error('getProjectsForRepo error:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get Pull Requests for a specific repository from GitHub
 */
export async function getPullRequestsForRepo(owner, repo) {
  if (!GITHUB_TOKEN) return [];
  try {
    const [openRes, closedRes] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' }
      }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=50`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' }
      }),
    ]);
    const mapPR = (pr, state) => ({
      id: pr.id,
      iid: pr.number,
      title: pr.title,
      state,
      web_url: pr.html_url,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      author: { login: pr.user?.login, avatar: pr.user?.avatar_url },
      draft: pr.draft,
    });
    return [
      ...(openRes.data || []).map(pr => mapPR(pr, 'open')),
      ...(closedRes.data || []).map(pr => mapPR(pr, 'closed')),
    ];
  } catch (error) {
    console.error('getPullRequestsForRepo error:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get GitHub Projects (V2)
 */
export async function getProjects() {
  if (!GITHUB_TOKEN) {
    console.warn('GITHUB_TOKEN is not set, cannot fetch projects');
    return [];
  }

  try {
    const query = `
      query {
        viewer {
          projectsV2(first: 50) {
            nodes {
              id
              title
              number
              url
              shortDescription
              closed
              createdAt
              updatedAt
              items(first: 0) {
                totalCount
              }
            }
          }
        }
      }
    `;

    console.log(`🔍 Fetching GitHub Projects (V2) for authenticated viewer...`);

    const response = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: { query }
    });

    let projects = response.data.data?.viewer?.projectsV2?.nodes || [];
    
    // If viewer has no projects OR there was an error, try fetching specifically for the user login
    if (projects.length === 0 || response.data.errors) {
      if (response.data.errors) console.error('GraphQL Viewer Errors:', response.data.errors);
      console.log(`⚠️ Viewer query found 0 projects, trying user query for ${GITHUB_OWNER}...`);
      
      const userQuery = `
        query($login: String!) {
          user(login: $login) {
            projectsV2(first: 50) {
              nodes {
                id title number url shortDescription closed createdAt updatedAt
                items(first: 0) { totalCount }
              }
            }
          }
        }
      `;
      const userResponse = await axios({
        url: 'https://api.github.com/graphql',
        method: 'post',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: { query: userQuery, variables: { login: GITHUB_OWNER } }
      });
      
      if (userResponse.data.data?.user?.projectsV2?.nodes) {
        projects = userResponse.data.data.user.projectsV2.nodes;
        console.log(`✅ Found ${projects.length} projects for user ${GITHUB_OWNER}`);
      } else {
        // One last try: Organization
        console.log(`⚠️ User query found 0 projects, trying organization query for ${GITHUB_OWNER}...`);
        const orgQuery = `
          query($login: String!) {
            organization(login: $login) {
              projectsV2(first: 50) {
                nodes {
                  id title number url shortDescription closed createdAt updatedAt
                  items(first: 0) { totalCount }
                }
              }
            }
          }
        `;
        const orgResponse = await axios({
          url: 'https://api.github.com/graphql',
          method: 'post',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
          },
          data: { query: orgQuery, variables: { login: GITHUB_OWNER } }
        });
        if (orgResponse.data.data?.organization?.projectsV2?.nodes) {
          projects = orgResponse.data.data.organization.projectsV2.nodes;
          console.log(`✅ Found ${projects.length} projects for organization ${GITHUB_OWNER}`);
        }
      }
    }

    return projects.map(p => ({
      id: p.id,
      name: p.title,
      description: p.shortDescription || '',
      web_url: p.url,
      number: p.number,
      closed: p.closed,
      issue_count: p.items?.totalCount || 0,
      open_issues: p.items?.totalCount || 0,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      source: 'github_project'
    }));


  } catch (error) {
    console.error('Error fetching GitHub projects:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Add a draft item to a GitHub Project V2
 * Uses the addProjectV2DraftIssue GraphQL mutation
 */
export async function addProjectItem(projectId, title) {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set');
  }

  const mutation = `
    mutation($projectId: ID!, $title: String!) {
      addProjectV2DraftIssue(input: { projectId: $projectId, title: $title }) {
        projectItem {
          id
          content {
            ... on DraftIssue {
              id
              title
              createdAt
            }
          }
        }
      }
    }
  `;

  try {
    console.log(`🚀 Adding item "${title}" to project ${projectId}`);
    const response = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: { query: mutation, variables: { projectId, title } }
    });

    if (response.data.errors) {
      console.error('GraphQL errors adding item:', response.data.errors);
      throw new Error(response.data.errors[0].message);
    }

    const item = response.data.data?.addProjectV2DraftIssue?.projectItem;
    console.log(`✅ Added project item:`, item?.id);
    return {
      id: item?.id,
      title: item?.content?.title || title,
      createdAt: item?.content?.createdAt
    };
  } catch (error) {
    console.error('Error adding project item:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get items from a GitHub Project V2 by Node ID
 */
export async function getProjectItems(projectId) {
  if (!GITHUB_TOKEN) return [];

  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              fieldValues(first: 8) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2FieldCommon { name } }
                  }
                }
              }
              content {
                ... on DraftIssue { id title createdAt }
                ... on Issue { id title number state createdAt }
              }
            }
          }
        }
      }
    }
  `;

  try {
    console.log(`🔍 Fetching items for GitHub Project ${projectId}`);
    const response = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      data: { query, variables: { projectId } }
    });

    if (response.data.errors) {
      console.error('GraphQL errors fetching project items:', response.data.errors);
      return [];
    }

    const nodes = response.data.data?.node?.items?.nodes || [];
    console.log(`✅ Found ${nodes.length} items in project ${projectId}`);
    return nodes.map(item => {
      const statusField = item.fieldValues?.nodes?.find(fv => fv?.field?.name === 'Status');
      const status = statusField?.name || 'Todo';
      const content = item.content || {};
      return {
        id: item.id,
        title: content.title || '(Untitled)',
        status,
        assignees: ['P'],
        prs: 0,
        number: content.number,
        state: content.state,
        created_at: content.createdAt
      };
    });
  } catch (error) {
    console.error('Error fetching project items:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get project fields (Status field ID + option IDs) for drag-and-drop status updates
 */
export async function getProjectFields(projectId) {
  if (!GITHUB_TOKEN) return null;

  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      data: { query, variables: { projectId } }
    });

    const fields = response.data.data?.node?.fields?.nodes || [];
    const statusField = fields.find(f => f.name === 'Status');
    if (!statusField) return null;

    return {
      fieldId: statusField.id,
      options: statusField.options  // [{ id, name }]
    };
  } catch (error) {
    console.error('Error fetching project fields:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Update a project item's Status field (used when dragging between Kanban columns)
 */
export async function updateProjectItemStatus(projectId, itemId, fieldId, optionId) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set');

  const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        clientMutationId
      }
    }
  `;

  try {
    console.log(`🚀 Updating item ${itemId} status to option ${optionId}`);
    const response = await axios({
      url: 'https://api.github.com/graphql',
      method: 'post',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      data: { query: mutation, variables: { projectId, itemId, fieldId, optionId } }
    });

    if (response.data.errors) {
      console.error('GraphQL errors updating item status:', response.data.errors);
      throw new Error(response.data.errors[0].message);
    }

    console.log(`✅ Item ${itemId} status updated to option ${optionId} successfully`);
    return { success: true };
  } catch (error) {
    console.error('Error updating item status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all branches for a repo
 */
export async function getBranches(owner, repo) {
  let ownerCtx = owner || GITHUB_OWNER;
  let repoCtx = repo || GITHUB_REPO;
  if (repo && repo.includes('/')) {
    [ownerCtx, repoCtx] = repo.split('/');
  }
  try {
    const response = await githubApi.get(`/repos/${ownerCtx}/${repoCtx}/branches?per_page=100`);
    return response.data.map(b => ({
      name: b.name,
      sha: b.commit.sha,
      protected: b.protected
    }));
  } catch (error) {
    console.error('Error fetching branches:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get the full file tree for a branch
 */
export async function getRepoTree(owner, repo, branch = 'main') {
  const o = owner || GITHUB_OWNER;
  const r = repo || GITHUB_REPO;
  try {
    // First get the commit sha for the branch
    const refRes = await githubApi.get(`/repos/${o}/${r}/git/ref/heads/${branch}`);
    const sha = refRes.data.object.sha;
    // Then get the full recursive tree
    const treeRes = await githubApi.get(`/repos/${o}/${r}/git/trees/${sha}?recursive=1`);
    return treeRes.data.tree; // [{ path, type('blob'|'tree'), sha, size }]
  } catch (error) {
    // Fall back to listing the root
    console.error('Error fetching tree:', error.response?.data || error.message);
    try {
      const contentsRes = await githubApi.get(`/repos/${o}/${r}/contents/?ref=${branch}`);
      return contentsRes.data.map(f => ({ path: f.name, type: f.type === 'dir' ? 'tree' : 'blob', sha: f.sha }));
    } catch (e2) {
      return [];
    }
  }
}

/**
 * Get file content from GitHub (decoded from base64)
 */
export async function getFileContent(owner, repo, filePath, branch = 'main') {
  const o = owner || GITHUB_OWNER;
  const r = repo || GITHUB_REPO;
  try {
    const response = await githubApi.get(`/repos/${o}/${r}/contents/${filePath}?ref=${branch}`);
    const { content, encoding, size, sha, name, html_url } = response.data;
    let decoded = '';
    if (encoding === 'base64') {
      decoded = Buffer.from(content, 'base64').toString('utf-8');
    } else {
      decoded = content;
    }
    return { content: decoded, size, sha, name, path: filePath, html_url };
  } catch (error) {
    console.error('Error fetching file content:', error.response?.data || error.message);
    throw new Error(`File not found: ${filePath}`);
  }
}

/**
 * Search files in a repo by name (fuzzy)
 */
export async function searchRepoFiles(owner, repo, query, branch = 'main') {
  const o = owner || GITHUB_OWNER;
  const r = repo || GITHUB_REPO;
  try {
    const tree = await getRepoTree(o, r, branch);
    const q = query.toLowerCase();
    return tree
      .filter(f => f.type === 'blob' && f.path.toLowerCase().includes(q))
      .slice(0, 20)
      .map(f => ({ path: f.path, sha: f.sha }));
  } catch (error) {
    console.error('Error searching files:', error.response?.data || error.message);
    return [];
  }
}
