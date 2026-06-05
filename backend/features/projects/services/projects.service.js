/**
 * Projects Service
 * Business logic for project management
 */

import * as projectModel from '../models/projects.pg.js';
import * as gitlabService from './gitlab.service.js';
import * as gitService from '../../git/services/git.service.js';

/**
 * Get all projects
 */
export async function getAllProjects() {
  const localProjects = await projectModel.getAllProjects();
  
  // Final safety de-duplication for local projects
  const uniqueLocal = [];
  const localSeen = new Set();
  
  for (const p of localProjects) {
    const nameKey = (p.name || '').toLowerCase().trim();
    const repoKey = (p.repo_name || '').toLowerCase().trim();
    const finalKey = (repoKey || nameKey);
    
    if (finalKey && !localSeen.has(finalKey)) {
      uniqueLocal.push(p);
      localSeen.add(finalKey);
      // Also add the variants to seen
      if (nameKey) localSeen.add(nameKey);
      if (repoKey) localSeen.add(repoKey);
    } else {
      console.log(`🛡️ Service blocked duplicate local project: ${finalKey}`);
    }
  }

  try {
    // Also fetch ALL real GitHub repositories to show them in the list if they aren't projects yet
    const ghRepos = await gitService.getRepos();
    console.log(`📊 Fetched ${ghRepos.length} repos from GitHub API`);
    
    // Map ghRepos for easy lookup
    const ghRepoMap = new Map();
    ghRepos.forEach(r => {
      ghRepoMap.set(r.name.toLowerCase().trim(), r);
      ghRepoMap.set(r.full_name.toLowerCase().trim(), r);
    });

    // Augment uniqueLocal with GitHub counts if local count is 0
    uniqueLocal.forEach(p => {
      const repoKey = (p.repo_name || p.name || '').toLowerCase().trim();
      const ghRepo = ghRepoMap.get(repoKey);
      if (ghRepo && (p.issue_count === 0 || p.issue_count === '0')) {
        p.issue_count = ghRepo.open_issues || 0;
        p.open_issues = ghRepo.open_issues || 0;
      }
    });

    // Convert missing GitHub repos into "project-like" objects
    const unlinkedRepos = ghRepos
      .filter(repo => {
        const repoKey = repo.name.toLowerCase().trim();
        const fullRepoKey = repo.full_name.toLowerCase().trim();
        const isTracked = localSeen.has(repoKey) || localSeen.has(fullRepoKey);
        if (!isTracked) {
          // Add to localSeen so we don't add it twice from ghRepos
          localSeen.add(repoKey);
          localSeen.add(fullRepoKey);
          return true;
        }
        return false;
      })
      .map(repo => ({
        id: `gh-${repo.id}`,
        name: repo.name,
        description: repo.description,
        web_url: repo.html_url,
        repo_name: repo.name,
        visibility: repo.private ? 'private' : 'public',
        issue_count: repo.open_issues || 0,
        open_issues: repo.open_issues || 0,
        closed_issues: 0,
        created_at: repo.updated_at,
        source: 'github',
        is_unlinked: true
      }));

    const finalResult = [...uniqueLocal, ...unlinkedRepos];
    console.log(`✅ Final unified project list: ${finalResult.length} items`);
    return finalResult;
  } catch (error) {
    console.warn('Could not fetch GitHub repos for merge:', error.message);
    return uniqueLocal;
  }
}

/**
 * Get project by ID
 */
export async function getProjectById(id) {
  const project = await projectModel.getProjectById(id);

  if (!project) {
    throw new Error('Project not found');
  }

  return {
    id: !isNaN(parseInt(id)) && String(id).match(/^\d+$/) ? parseInt(id) : id,
    name: project.name,
    description: project.description,
    visibility: 'private',
    issue_count: parseInt(project.issue_count),
    open_issues: parseInt(project.open_issues),
    closed_issues: parseInt(project.closed_issues),
    created_at: project.created_at
  };
}

export async function createProject(projectData) {
  const { 
    name, description, userId, 
    createRepo = false, 
    createGithubProject: shouldCreateGhProject = false,  // explicit opt-in for GitHub Project V2
    repo_name, github_project_id, template 
  } = projectData;

  // 1. Check if we're linking to an existing repo that's already in our system.
  // SKIP this guard when the user explicitly wants to create a new GitHub Project V2 board —
  // a repo can have multiple projects, so we should never block here.
  if (repo_name && !createRepo && !shouldCreateGhProject && !github_project_id) {
    const existingProjects = await projectModel.getAllProjects();
    const duplicate = existingProjects.find(p =>
      (p.repo_name && p.repo_name.toLowerCase() === repo_name.toLowerCase()) ||
      (p.source === 'github' && p.name.toLowerCase() === repo_name.toLowerCase())
    );

    if (duplicate) {
      console.log(`♻️ Repository "${repo_name}" already tracked. Returning existing entry.`);
      return duplicate;
    }
  }

  // 2. Create in local database first
  const projectRecord = await projectModel.createProject(name, description, userId, repo_name);

  // 3. Optionally create/link a GitHub Project V2 and/or a GitHub Repo
  let githubProject = null;
  let githubRepo = null;
  
  try {
    if (github_project_id) {
      // Link an already-existing GitHub Project
      console.log(`🔗 Linking existing GitHub Project: ${github_project_id}`);
      githubProject = { 
        id: github_project_id, 
        name: name, 
        html_url: `https://github.com/projects/${github_project_id}`, 
        owner: { login: 'prasad758' } 
      };
    } else if (shouldCreateGhProject) {
      // Only create a new GitHub Project V2 board if explicitly requested
      // Pass repo_name so the project gets linked to the repo on GitHub
      githubProject = await gitService.createProject(name, template, repo_name || null);
    } else {
    }
    
    // Create a new GitHub repo if explicitly requested
    if (createRepo) {
      githubRepo = await gitService.createRepo(name, description);
      console.log(`✅ GitHub repo created: ${githubRepo.html_url}`);
    } else if (repo_name) {
      githubRepo = { name: repo_name, private: true };
    }

    // 4. Persist the GitHub link in our DB (only if we have a GitHub project)
    if (githubProject) {
      await projectModel.createGitHubProject({
        github_id: githubProject.id,
        name: name,
        repo_name: githubRepo ? githubRepo.name : (githubProject.name || name),
        description: description,
        web_url: githubProject.html_url,
        owner: githubProject.owner.login,
        visibility: githubRepo ? (githubRepo.private ? 'private' : 'public') : 'private',
        created_by: userId
      });
    }
  } catch (gitError) {
    console.error('Failed to create GitHub resources, but local project exists:', gitError.message);
    // Non-fatal: the local record still exists so the user sees the project in the dashboard
  }

  return {
    id: projectRecord.id,
    github_id: githubProject?.id || null,       // GitHub Project V2 Node ID (PVT_...)
    github_url: githubProject ? githubProject.html_url : (githubRepo ? githubRepo.html_url : null),
    name: name,
    description: description,
    visibility: githubRepo ? (githubRepo.private ? 'private' : 'public') : 'private',
    issue_count: 0,
    open_issues: 0,
    closed_issues: 0,
    created_at: projectRecord.created_at,
    source: githubProject ? 'github_project' : (githubRepo ? 'github' : 'local')
  };
}

/**
 * Update project
 */
export async function updateProject(id, updates) {
  const project = await projectModel.getGitLabProject(id);

  if (!project) {
    throw new Error('Project not found');
  }

  // Update in GitLab
  if (Object.keys(updates).length > 0) {
    try {
      await gitlabService.updateGitLabProject(project.gitlab_project_id, updates);
    } catch (gitlabError) {
      throw new Error(`Failed to update project in GitLab: ${gitlabError.response?.data?.message || gitlabError.message}`);
    }
  }

  // Update in local database
  const updatedProject = await projectModel.updateGitLabProject(id, updates);

  return updatedProject || project;
}

/**
 * Delete project
 */
export async function deleteProject(id) {
  // 1. Try numeric ID (GitLab project) first
  if (!isNaN(parseInt(id)) && String(id).match(/^\d+$/)) {
    const gitlabProject = await projectModel.getGitLabProject(id);

    if (gitlabProject) {
      const projectName = gitlabProject.name;

      // Delete from GitLab (optional but recommended)
      try {
        await gitlabService.deleteGitLabProject(gitlabProject.gitlab_project_id);
      } catch (gitlabError) {
        console.warn('Could not delete from GitLab:', gitlabError.response?.data?.message || gitlabError.message);
      }

      // Also delete local mirrored issues by name to be sure
      await projectModel.deleteProjectByName(projectName);

      // Delete local database gitlab_projects record (this handles gitlab_issues in pg model)
      await projectModel.deleteGitLabProject(id);

      return { name: projectName };
    }
  }

  // 2. If not a GitLab project, it could be a local project name or issue ID
  // Use getProjectById to resolve the project name regardless of ID type
  const project = await projectModel.getProjectById(id);

  if (!project) {
    throw new Error('Project not found');
  }

  // Delete all issues associated with this project name
  await projectModel.deleteProjectByName(project.name);

  return { name: project.name };
}

/**
 * Get project members
 */
export async function getProjectMembers(id) {
  const project = await projectModel.getGitLabProject(id);

  if (!project) {
    throw new Error('Project not found');
  }

  try {
    return await gitlabService.getProjectMembers(project.gitlab_project_id);
  } catch (gitlabError) {
    throw new Error(`Failed to get project members: ${gitlabError.response?.data?.message || gitlabError.message}`);
  }
}

/**
 * Add project member
 */
export async function addProjectMember(id, userId, accessLevel) {
  const project = await projectModel.getGitLabProject(id);

  if (!project) {
    throw new Error('Project not found');
  }

  try {
    return await gitlabService.addProjectMember(project.gitlab_project_id, userId, accessLevel);
  } catch (gitlabError) {
    throw new Error(`Failed to add member: ${gitlabError.response?.data?.message || gitlabError.message}`);
  }
}

