/**
 * Issues Service
 * Business logic for issue management
 */

import * as issueModel from '../models/issues.pg.js';
import * as gitlabService from './gitlab.service.js';
import * as gitService from '../../git/services/git.service.js';
import * as projectModel from '../../projects/models/projects.pg.js';

/**
 * Get all issues
 */
export async function getAllIssues(userId, isAdmin, filters) {
  const issues = await issueModel.getAllIssues({
    ...filters,
    userId,
    isAdmin
  });

  return issues.map(issue => ({
    ...issue,
    assignees: issue.assignees || [],
    labels: issue.labels || [],
  }));
}

/**
 * Get issue by ID
 */
export async function getIssueById(issueId) {
  const issue = await issueModel.getIssueById(issueId);

  if (!issue) {
    throw new Error('Issue not found');
  }

  const [assignees, labels, comments, activity] = await Promise.all([
    issueModel.getIssueAssignees(issueId),
    issueModel.getIssueLabels(issueId),
    issueModel.getIssueComments(issueId),
    issueModel.getIssueActivity(issueId)
  ]);

  return {
    ...issue,
    assignees,
    labels,
    comments,
    activity,
  };
}

/**
 * Create issue
 */
export async function createIssue(issueData, userId) {
  const {
    title,
    description,
    status,
    priority,
    project_id,
    project_name,
    assignee_ids,
    label_ids,
    estimate_hours,
    start_date,
    due_date
  } = issueData;

  // 1. Create issue in local database issues (primary source of truth for UI)
  const issue = await issueModel.createIssue({
    title,
    description,
    status: status || 'open',
    priority: priority || 'medium',
    project_name: project_name,
    created_by: userId
  });

  // 2. Handle GitHub integration if project_id or project_name is provided
  if (project_id || project_name) {
    try {
      // Get project info by ID or Name
      let githubProject = null;
      if (project_id) {
        console.log(`🔍 Finding GitHub project by ID: ${project_id}`);
        githubProject = await projectModel.getGitHubProject(project_id);
      } else if (project_name) {
        console.log(`🔍 Finding GitHub project by Name: ${project_name}`);
        const projects = await projectModel.getAllProjects();
        const sanitize = (s) => (s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const searchName = sanitize(project_name);
        console.log(`🔍 Sanitized search name: ${searchName}`);
        
        githubProject = projects.find(p => {
          const match = p.source === 'github' && 
            (sanitize(p.name) === searchName || (p.repo_name && sanitize(p.repo_name) === searchName));
          if (match) console.log(`✅ Found match: ${p.name} (repo: ${p.repo_name})`);
          return match;
        });
      }

      if (githubProject) {
        const targetRepoName = githubProject.repo_name || githubProject.name;
        console.log(`🚀 Creating issue in GitHub for project: ${githubProject.name} (Repo: ${targetRepoName})`);
        
        const githubIssue = await gitService.createIssue({
          title,
          description,
          labels: label_ids ? await issueModel.getLabelsByIds(label_ids) : []
        }, targetRepoName);
        
        console.log(`✅ GitHub issue created: ${githubIssue.id} (#${githubIssue.number || githubIssue.iid})`);

        // Link GitHub info back to local issue
        await issueModel.updateIssue(issue.id, {
          github_id: githubIssue.id,
          github_iid: githubIssue.number,
          github_project_id: githubProject.github_id, // Store the github_id (Project's GitHub ID)
          repo_name: targetRepoName
        });

        issue.github_id = githubIssue.id;
        issue.github_iid = githubIssue.number;
        issue.github_url = githubIssue.html_url;
      }
    } catch (gitError) {
      console.error('GitHub issue creation failed, continuing with local issue:', gitError.message);
    }
  }

  // 3. Add activity
  await issueModel.addIssueActivity(issue.id, userId, 'created', {
    title,
    project_name: project_name
  });

  // 4. Assign users
  if (assignee_ids && Array.isArray(assignee_ids)) {
    await issueModel.assignUsers(issue.id, assignee_ids, userId);
  }

  // 5. Add labels
  if (label_ids && Array.isArray(label_ids)) {
    for (const labelId of label_ids) {
      await issueModel.addLabel(issue.id, labelId, userId);
    }
  }

  return {
    ...issue,
    project_name: project_name || issue.project_name
  };
}

/**
 * Update issue
 */
export async function updateIssue(issueId, updates, userId) {
  // Verify issue exists in main issues table first
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  // Try to get GitHub issue info (optional)
  const issueInfo = await issueModel.getIssueById(issueId);

  // Update in GitHub if GitHub integration exists
  if (issueInfo && (issueInfo.github_id || issueInfo.github_iid)) {
    try {
      // We need project name for GitHub
      const githubProject = issueInfo.github_project_id 
        ? await projectModel.getGitHubProjectByGitHubId(issueInfo.github_project_id)
        : null;
        
      await gitService.updateIssue(
        issueInfo.github_iid,
        updates,
        githubProject ? (githubProject.repo_name || githubProject.name) : null
      );
    } catch (gitError) {
      console.error('GitHub update failed:', gitError.message);
    }
  }

  // Update in main issues table (always)
  const updatedIssue = await issueModel.updateIssue(issueId, updates);

  // Track status change
  if (updates.status && updates.status !== issue.status) {
    await issueModel.addIssueActivity(issueId, userId, 'status_changed', {
      old_status: issue.status,
      new_status: updates.status,
    });
  }

  return updatedIssue;
}

/**
 * Add comment
 */
export async function addComment(issueId, userId, comment) {
  // Verify issue exists first
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  // Try to get GitHub issue info
  const issueWithGit = await issueModel.getIssueById(issueId);

  // Post comment to GitHub if issue has GitHub association
  if (issueWithGit && (issueWithGit.github_id || issueWithGit.github_iid)) {
    try {
      const githubProject = issueWithGit.github_project_id 
        ? await projectModel.getGitHubProjectByGitHubId(issueWithGit.github_project_id)
        : null;

      const targetRepo = githubProject ? (githubProject.repo_name || githubProject.name) : issueWithGit.repo_name;

      await gitService.addComment(
        issueWithGit.github_iid,
        comment,
        targetRepo
      );
    } catch (gitError) {
      console.error('GitHub comment post failed:', gitError.message);
    }
  } else {
    console.log(`ℹ️ Issue ${issueId} has no GitHub association (github_id: ${issueWithGit?.github_id})`);
  }

  // Add comment locally
  const commentRecord = await issueModel.addComment(issueId, userId, comment);

  if (!commentRecord || !commentRecord.id) {
    console.error('Failed to create comment record:', { issueId, userId, commentLength: comment?.length });
    throw new Error('Failed to create comment');
  }

  const commentWithUser = await issueModel.getCommentWithUser(commentRecord.id);

  if (!commentWithUser) {
    console.error('Failed to retrieve comment with user info:', { commentId: commentRecord.id });
    throw new Error('Failed to retrieve comment');
  }

  // Add activity
  await issueModel.addIssueActivity(issueId, userId, 'commented', {
    comment: comment.substring(0, 100)
  });

  return commentWithUser;
}

/**
 * Assign users to issue
 */
export async function assignUsers(issueId, assigneeIds, assignedBy) {
  // Verify issue exists
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  // Verify users exist
  for (const assigneeId of assigneeIds) {
    const assigneeIdStr = String(assigneeId).trim();
    const userExists = await issueModel.checkUserExists(assigneeIdStr);
    if (!userExists) {
      throw new Error(`User ${assigneeIdStr} not found`);
    }
  }

  // Assign users
  const assigned = await issueModel.assignUsersToIssue(issueId, assigneeIds, assignedBy);

  // Add activity for each assigned user
  for (const assigneeId of assigned) {
    await issueModel.addIssueActivity(issueId, assignedBy, 'assigned_user', {
      assigned_user_id: assigneeId
    });
  }

  return assigned;
}

/**
 * Unassign user from issue
 */
export async function unassignUser(issueId, userId, unassignedBy) {
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  const removed = await issueModel.unassignUserFromIssue(issueId, userId);
  if (!removed) {
    throw new Error('User assignment not found');
  }

  await issueModel.addIssueActivity(issueId, unassignedBy, 'unassigned_user', {
    unassigned_user_id: userId
  });

  return true;
}

/**
 * Add label to issue
 */
export async function addLabel(issueId, labelId, userId) {
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  const label = await issueModel.getLabelById(labelId);
  if (!label) {
    throw new Error('Label not found');
  }

  // Check if already assigned
  const existing = await issueModel.getIssueLabels(issueId);
  if (existing.some(l => l.id === labelId)) {
    return { message: 'Label already assigned' };
  }

  await issueModel.addLabelToIssue(issueId, labelId);
  await issueModel.addIssueActivity(issueId, userId, 'added_label', {
    label_id: labelId,
    label_name: label.name
  });

  return { message: 'Label added successfully' };
}

/**
 * Remove label from issue
 */
export async function removeLabel(issueId, labelId, userId) {
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  const label = await issueModel.getLabelById(labelId);
  const removed = await issueModel.removeLabelFromIssue(issueId, labelId);

  if (!removed) {
    throw new Error('Label assignment not found');
  }

  await issueModel.addIssueActivity(issueId, userId, 'removed_label', {
    label_id: labelId,
    label_name: label?.name || 'Unknown'
  });

  return { message: 'Label removed successfully' };
}

/**
 * Delete issue
 */
export async function deleteIssue(issueId, userId) {
  // Verify issue exists
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  // Try to get GitLab issue info (optional)
  const gitlabIssue = await issueModel.getGitLabIssue(issueId);

  // Delete from GitLab if integrated
  if (gitlabIssue) {
    try {
      await gitlabService.deleteGitLabIssue(
        gitlabIssue.gitlab_project_id,
        gitlabIssue.gitlab_iid
      );
    } catch (gitlabError) {
      console.error('GitLab issue deletion failed:', gitlabError.message);
    }
  }

  // Add activity before deleting (optional - might not persist if parent is deleted)
  // Actually, delete from local DB
  const deletedIssue = await issueModel.deleteIssue(issueId);

  return deletedIssue;
}

