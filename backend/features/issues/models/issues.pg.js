/**
 * Issues Model
 * PostgreSQL queries for issue operations
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get all issues with filters
 */
export async function getAllIssues(filters) {
  const { status, assignee, project, userId, isAdmin } = filters;

  let query = `
    SELECT 
      i.*,
      COUNT(DISTINCT ic.id) as comments_count,
      (
        SELECT comment
        FROM issue_comments
        WHERE issue_id = i.id
        ORDER BY created_at DESC
        LIMIT 1
      ) as recent_comment,
      json_agg(DISTINCT jsonb_build_object(
        'user_id', ia.user_id
      )) FILTER (WHERE ia.user_id IS NOT NULL) as assignees,
      json_agg(DISTINCT jsonb_build_object(
        'label_id', il.label_id,
        'name', l.name,
        'color', l.color
      )) FILTER (WHERE l.id IS NOT NULL) as labels
    FROM issues i
    LEFT JOIN issue_assignees ia ON i.id = ia.issue_id
    LEFT JOIN issue_labels il ON i.id = il.issue_id
    LEFT JOIN labels l ON il.label_id = l.id
    LEFT JOIN issue_comments ic ON i.id = ic.issue_id
  `;

  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (status && status !== 'all') {
    conditions.push(`i.status = $${paramCount++}`);
    params.push(status);
  }

  if (assignee && assignee !== 'all') {
    conditions.push(`EXISTS (
      SELECT 1 FROM issue_assignees 
      WHERE issue_id = i.id AND user_id = $${paramCount++}
    )`);
    params.push(assignee);
  }

  if (project) {
    conditions.push(`i.project_name = $${paramCount++}`);
    params.push(project);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += `
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get issue by ID
 */
export async function getIssueById(issueId) {
  const result = await pool.query(
    'SELECT * FROM issues WHERE id = $1',
    [issueId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new issue directly in issues
 */
export async function createIssue(issueData) {
  const { title, description, status, priority, project_name, created_by, estimated_hours } = issueData;
  const result = await pool.query(
    `INSERT INTO issues (title, description, status, priority, project_name, created_by, estimated_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      title,
      description || null,
      status || 'open',
      priority || 'medium',
      project_name || null,
      created_by,
      estimated_hours || 0
    ]
  );
  return result.rows[0];
}

/**
 * Get issue assignees
 */
export async function getIssueAssignees(issueId) {
  const result = await pool.query(
    `SELECT 
      ia.user_id,
      u.email,
      COALESCE(u.full_name, '') as full_name
     FROM issue_assignees ia
     JOIN users u ON ia.user_id = u.id
     WHERE ia.issue_id = $1`,
    [issueId]
  );
  return result.rows;
}

/**
 * Get issue labels
 */
export async function getIssueLabels(issueId) {
  const result = await pool.query(
    `SELECT l.*
     FROM issue_labels il
     JOIN labels l ON il.label_id = l.id
     WHERE il.issue_id = $1`,
    [issueId]
  );
  return result.rows;
}

/**
 * Get issue comments
 */
export async function getIssueComments(issueId) {
  const result = await pool.query(
    `SELECT 
      ic.id,
      ic.issue_id,
      ic.user_id,
      ic.comment,
      ic.created_at,
      ic.updated_at,
      u.email,
      COALESCE(u.full_name, '') as full_name
     FROM issue_comments ic
     JOIN users u ON ic.user_id = u.id
     WHERE ic.issue_id = $1
     ORDER BY ic.created_at ASC`,
    [issueId]
  );
  return result.rows;
}

/**
 * Get issue activity
 */
export async function getIssueActivity(issueId) {
  const result = await pool.query(
    `SELECT 
      ia.id,
      ia.issue_id,
      ia.user_id,
      ia.action,
      ia.details,
      ia.created_at,
      u.email,
      COALESCE(u.full_name, '') as full_name
     FROM issue_activity ia
     LEFT JOIN users u ON ia.user_id = u.id
     WHERE ia.issue_id = $1
     ORDER BY ia.created_at DESC`,
    [issueId]
  );
  return result.rows;
}

/**
 * Create GitLab issue
 */
export async function createGitLabIssue(issueData) {
  const {
    gitlab_issue_id,
    gitlab_iid,
    project_id,
    title,
    description,
    status,
    priority,
    created_by,
    estimate_hours,
    start_date,
    due_date
  } = issueData;

  const result = await pool.query(
    `INSERT INTO gitlab_issues (
      gitlab_issue_id, gitlab_iid, project_id, title, description, 
      status, priority, created_by, estimate_hours, start_date, due_date
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      gitlab_issue_id,
      gitlab_iid,
      project_id,
      title,
      description || null,
      status || 'open',
      priority || 'medium',
      created_by,
      estimate_hours || null,
      start_date || null,
      due_date || null
    ]
  );
  return result.rows[0];
}

/**
 * Get GitLab project
 */
export async function getGitLabProject(projectId) {
  const result = await pool.query(
    'SELECT gitlab_project_id, name FROM gitlab_projects WHERE id = $1',
    [projectId]
  );
  return result.rows[0] || null;
}

/**
 * Get labels by IDs
 */
export async function getLabelsByIds(labelIds) {
  const result = await pool.query(
    'SELECT name FROM labels WHERE id = ANY($1)',
    [labelIds]
  );
  return result.rows.map(row => row.name);
}

/**
 * Add issue activity
 */
export async function addIssueActivity(issueId, userId, action, details) {
  // Explicitly generate UUID to ensure id is set
  // Try gen_random_uuid() first (built-in PostgreSQL 13+), fallback to uuid_generate_v4()
  try {
    await pool.query(
      `INSERT INTO issue_activity (id, issue_id, user_id, action, details)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [issueId, userId, action, JSON.stringify(details)]
    );
  } catch (error) {
    // If gen_random_uuid() fails, try uuid_generate_v4() (requires uuid-ossp extension)
    if (error.message.includes('gen_random_uuid') || error.message.includes('function')) {
      await pool.query(
        `INSERT INTO issue_activity (id, issue_id, user_id, action, details)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
        [issueId, userId, action, JSON.stringify(details)]
      );
    } else {
      throw error;
    }
  }
}

/**
 * Assign users to issue
 */
export async function assignUsersToIssue(issueId, assigneeIds, assignedBy) {
  const assigned = [];
  for (const assigneeId of assigneeIds) {
    const assigneeIdStr = String(assigneeId).trim();

    // Check if already assigned
    const existing = await pool.query(
      'SELECT id FROM issue_assignees WHERE issue_id = $1 AND user_id = $2',
      [issueId, assigneeIdStr]
    );

    if (existing.rows.length === 0) {
      // Explicitly generate UUID to ensure id is set
      try {
        await pool.query(
          `INSERT INTO issue_assignees (id, issue_id, user_id, assigned_by)
           VALUES (gen_random_uuid(), $1, $2, $3)
           ON CONFLICT (issue_id, user_id) DO NOTHING`,
          [issueId, assigneeIdStr, assignedBy]
        );
      } catch (error) {
        // If gen_random_uuid() fails, try uuid_generate_v4()
        if (error.message.includes('gen_random_uuid') || error.message.includes('function')) {
          await pool.query(
            `INSERT INTO issue_assignees (id, issue_id, user_id, assigned_by)
             VALUES (uuid_generate_v4(), $1, $2, $3)
             ON CONFLICT (issue_id, user_id) DO NOTHING`,
            [issueId, assigneeIdStr, assignedBy]
          );
        } else {
          throw error;
        }
      }
      assigned.push(assigneeIdStr);
    }
  }
  return assigned;
}

/**
 * Unassign user from issue
 */
export async function unassignUserFromIssue(issueId, userId) {
  const result = await pool.query(
    `DELETE FROM issue_assignees
     WHERE issue_id = $1 AND user_id = $2`,
    [issueId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Add label to issue
 */
export async function addLabelToIssue(issueId, labelId) {
  // Explicitly generate UUID to ensure id is set (some DBs don't have uuid default configured)
  try {
    await pool.query(
      `INSERT INTO issue_labels (id, issue_id, label_id)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (issue_id, label_id) DO NOTHING`,
      [issueId, labelId]
    );
  } catch (error) {
    if (error.message?.includes('gen_random_uuid') || error.message?.includes('function')) {
      await pool.query(
        `INSERT INTO issue_labels (id, issue_id, label_id)
         VALUES (uuid_generate_v4(), $1, $2)
         ON CONFLICT (issue_id, label_id) DO NOTHING`,
        [issueId, labelId]
      );
      return;
    }
    throw error;
  }
}

/**
 * Remove label from issue
 */
export async function removeLabelFromIssue(issueId, labelId) {
  const result = await pool.query(
    `DELETE FROM issue_labels
     WHERE issue_id = $1 AND label_id = $2`,
    [issueId, labelId]
  );
  return result.rowCount > 0;
}

/**
 * Get label by ID
 */
export async function getLabelById(labelId) {
  const result = await pool.query(
    'SELECT id, name FROM labels WHERE id = $1',
    [labelId]
  );
  return result.rows[0] || null;
}

/**
 * Add comment to issue
 */
export async function addComment(issueId, userId, comment) {
  if (!issueId || !userId || !comment) {
    throw new Error('Missing required parameters: issueId, userId, or comment');
  }

  // Explicitly generate UUID to ensure id is set
  // Try gen_random_uuid() first (built-in PostgreSQL 13+), fallback to uuid_generate_v4()
  let result;
  try {
    result = await pool.query(
      `INSERT INTO issue_comments (id, issue_id, user_id, comment)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING *`,
      [issueId, userId, comment]
    );
  } catch (error) {
    // If gen_random_uuid() fails, try uuid_generate_v4() (requires uuid-ossp extension)
    if (error.message.includes('gen_random_uuid') || error.message.includes('function')) {
      result = await pool.query(
        `INSERT INTO issue_comments (id, issue_id, user_id, comment)
         VALUES (uuid_generate_v4(), $1, $2, $3)
         RETURNING *`,
        [issueId, userId, comment]
      );
    } else {
      throw error;
    }
  }

  if (!result.rows || result.rows.length === 0) {
    throw new Error('Failed to insert comment');
  }

  return result.rows[0];
}

/**
 * Get comment with user info
 */
export async function getCommentWithUser(commentId) {
  if (!commentId) {
    throw new Error('Comment ID is required');
  }

  const result = await pool.query(
    `SELECT 
      ic.*,
      u.email,
      COALESCE(u.full_name, '') as full_name
     FROM issue_comments ic
     JOIN users u ON ic.user_id = u.id
     WHERE ic.id = $1`,
    [commentId]
  );

  if (!result.rows || result.rows.length === 0) {
    console.error('Comment not found with ID:', commentId);
    return null;
  }

  return result.rows[0];
}

/**
 * Get GitLab issue info (optional - table may not exist)
 * Returns null if GitLab integration is not set up
 */
export async function getGitLabIssueInfo(issueId) {
  try {
    // Check if gitlab_issues table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'erp' 
        AND table_name = 'gitlab_issues'
      );
    `);

    if (!tableCheck.rows[0]?.exists) {
      console.log('GitLab issues table does not exist, skipping GitLab integration');
      return null;
    }

    const result = await pool.query(
      'SELECT gi.gitlab_iid, gi.gitlab_issue_id, gp.gitlab_project_id FROM gitlab_issues gi JOIN gitlab_projects gp ON gi.project_id = gp.gitlab_project_id WHERE gi.id = $1',
      [issueId]
    );
    return result.rows[0] || null;
  } catch (error) {
    // If table doesn't exist or query fails, return null (GitLab integration is optional)
    console.log('GitLab issue info not available:', error.message);
    return null;
  }
}

/**
 * Get existing GitLab issue (optional - table may not exist)
 * Returns null if GitLab integration is not set up
 */
export async function getGitLabIssue(issueId) {
  try {
    // Check if gitlab_issues table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'erp' 
        AND table_name = 'gitlab_issues'
      );
    `);

    if (!tableCheck.rows[0]?.exists) {
      return null;
    }

    const result = await pool.query(
      'SELECT gi.*, gp.gitlab_project_id FROM gitlab_issues gi JOIN gitlab_projects gp ON gi.project_id = gp.gitlab_project_id WHERE gi.id = $1',
      [issueId]
    );
    return result.rows[0] || null;
  } catch (error) {
    // If table doesn't exist or query fails, return null (GitLab integration is optional)
    console.log('GitLab issue not available:', error.message);
    return null;
  }
}

/**
 * Update main issue in issues table
 */
export async function updateIssue(issueId, updates) {
  const updateFields = [];
  const values = [];
  let paramCount = 1;

  if (updates.title !== undefined) {
    updateFields.push(`title = $${paramCount++}`);
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramCount++}`);
    values.push(updates.description);
  }
  if (updates.status !== undefined) {
    updateFields.push(`status = $${paramCount++}`);
    values.push(updates.status);
  }
  if (updates.priority !== undefined) {
    updateFields.push(`priority = $${paramCount++}`);
    values.push(updates.priority);
  }
  if (updates.project_name !== undefined) {
    updateFields.push(`project_name = $${paramCount++}`);
    values.push(updates.project_name);
  }
  if (updates.estimated_hours !== undefined) {
    updateFields.push(`estimated_hours = $${paramCount++}`);
    values.push(updates.estimated_hours);
  }
  if (updates.github_id !== undefined) {
    updateFields.push(`github_id = $${paramCount++}`);
    values.push(updates.github_id);
  }
  if (updates.github_iid !== undefined) {
    updateFields.push(`github_iid = $${paramCount++}`);
    values.push(updates.github_iid);
  }
  if (updates.github_project_id !== undefined) {
    updateFields.push(`github_project_id = $${paramCount++}`);
    values.push(updates.github_project_id);
  }
  if (updates.repo_name !== undefined) {
    updateFields.push(`repo_name = $${paramCount++}`);
    values.push(updates.repo_name);
  }

  if (updateFields.length === 0) {
    // No updates, just return the existing issue
    return await getIssueById(issueId);
  }

  updateFields.push(`updated_at = NOW()`);
  values.push(issueId);

  const query = `
    UPDATE issues 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update GitLab issue (optional - table may not exist)
 */
export async function updateGitLabIssue(issueId, updates) {
  try {
    // Check if gitlab_issues table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'erp' 
        AND table_name = 'gitlab_issues'
      );
    `);

    if (!tableCheck.rows[0]?.exists) {
      return null;
    }

    const result = await pool.query(
      `UPDATE gitlab_issues 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           estimate_hours = COALESCE($5, estimate_hours),
           start_date = COALESCE($6, start_date),
           due_date = COALESCE($7, due_date),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        updates.title,
        updates.description,
        updates.status,
        updates.priority,
        updates.estimate_hours,
        updates.start_date,
        updates.due_date,
        issueId
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.log('GitLab issue update not available:', error.message);
    return null;
  }
}

/**
 * Check if user exists
 */
export async function checkUserExists(userId) {
  const result = await pool.query(
    'SELECT id, email FROM users WHERE id = $1',
    [userId]
  );
  return result.rows.length > 0;
}

/**
 * Delete issue
 */
export async function deleteIssue(issueId) {
  const result = await pool.query(
    'DELETE FROM issues WHERE id = $1 RETURNING *',
    [issueId]
  );
  return result.rows[0] || null;
}

