/**
 * FJT Board Repository
 * SQL queries only - tenant scoped and schema parameterized
 */

import { pool } from '../../../src/config/db.js';

export const fjtBoardRepository = {
  // Get all epics
  async getEpics(schema, tenantId) {
    const query = `
      SELECT id, tenant_id, key, epic_name, summary, color, status, start_date, due_date, metadata, created_at, updated_at
      FROM ${schema}.fjt_epics
      WHERE tenant_id = $1 AND is_deleted = false
      ORDER BY created_at ASC
    `;
    const res = await pool.query(query, [tenantId]);
    return res.rows;
  },

  // Get all sprints
  async getSprints(schema, tenantId) {
    const query = `
      SELECT id, tenant_id, name, goal, status, start_date, end_date, metadata, created_at, updated_at
      FROM ${schema}.fjt_sprints
      WHERE tenant_id = $1 AND is_deleted = false
      ORDER BY created_at ASC
    `;
    const res = await pool.query(query, [tenantId]);
    return res.rows;
  },

  // Get all issues
  async getIssues(schema, tenantId) {
    const query = `
      SELECT 
        i.id, i.tenant_id, i.key, i.project_key, i.project_name, i.type, i.summary, 
        i.description, i.status, i.priority, i.story_points, i.epic_id, i.story_id, i.linked_task_id, i.sprint_id, 
        i.assignee_id, i.start_date, i.end_date, i.metadata, i.created_at, i.updated_at,
        e.key AS epic_key, e.epic_name, e.color AS epic_color,
        s.key AS story_key, s.summary AS story_summary,
        t.key AS linked_task_key, t.summary AS linked_task_summary
      FROM ${schema}.fjt_issues i
      LEFT JOIN ${schema}.fjt_epics e ON i.epic_id = e.id AND e.tenant_id = i.tenant_id
      LEFT JOIN ${schema}.fjt_issues s ON i.story_id = s.id AND s.tenant_id = i.tenant_id
      LEFT JOIN ${schema}.fjt_issues t ON i.linked_task_id = t.id AND t.tenant_id = i.tenant_id
      WHERE i.tenant_id = $1 AND i.is_deleted = false
      ORDER BY i.created_at DESC
    `;
    const res = await pool.query(query, [tenantId]);
    return res.rows;
  },

  // Create an issue
  async createIssue(schema, tenantId, issueData) {
    const query = `
      INSERT INTO ${schema}.fjt_issues (
        tenant_id, key, project_key, project_name, type, summary, description,
        status, priority, story_points, epic_id, story_id, linked_task_id, sprint_id, assignee_id, start_date, end_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    const values = [
      tenantId,
      issueData.key,
      issueData.project_key || 'FJT',
      issueData.project_name || 'Free Jira Training (FJT)',
      issueData.type,
      issueData.summary,
      issueData.description || null,
      issueData.status || 'to_do',
      issueData.priority || 'medium',
      issueData.story_points || null,
      issueData.epic_id || null,
      issueData.story_id || null,
      issueData.linked_task_id || null,
      issueData.sprint_id || null,
      issueData.assignee_id || null,
      issueData.start_date || null,
      issueData.end_date || null,
      issueData.metadata || {},
    ];
    const res = await pool.query(query, values);
    return res.rows[0];
  },

  // Update an issue status
  async updateIssueStatus(schema, tenantId, issueId, status) {
    const query = `
      UPDATE ${schema}.fjt_issues
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND is_deleted = false
      RETURNING *
    `;
    const res = await pool.query(query, [status, issueId, tenantId]);
    return res.rows[0];
  },

  // Update an issue sprint
  async updateIssueSprint(schema, tenantId, issueId, sprintId) {
    const query = `
      UPDATE ${schema}.fjt_issues
      SET sprint_id = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND is_deleted = false
      RETURNING *
    `;
    const res = await pool.query(query, [sprintId, issueId, tenantId]);
    return res.rows[0];
  },

  // Update full issue
  async updateIssue(schema, tenantId, issueId, data) {
    const query = `
      UPDATE ${schema}.fjt_issues
      SET 
        summary = COALESCE($1, summary),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        story_points = COALESCE($5, story_points),
        epic_id = COALESCE($6, epic_id),
        story_id = COALESCE($7, story_id),
        linked_task_id = COALESCE($8, linked_task_id),
        start_date = COALESCE($9, start_date),
        end_date = COALESCE($10, end_date),
        assignee_id = COALESCE($11, assignee_id),
        metadata = COALESCE($12, metadata),
        updated_at = NOW()
      WHERE id = $13 AND tenant_id = $14 AND is_deleted = false
      RETURNING *
    `;
    const values = [
      data.summary,
      data.description,
      data.status,
      data.priority,
      data.story_points,
      data.epic_id,
      data.story_id,
      data.linked_task_id,
      data.start_date,
      data.end_date,
      data.assignee_id,
      data.metadata,
      issueId,
      tenantId,
    ];
    const res = await pool.query(query, values);
    return res.rows[0];
  },

  // Soft delete issue
  async deleteIssue(schema, tenantId, issueId) {
    const query = `
      UPDATE ${schema}.fjt_issues
      SET is_deleted = true, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `;
    await pool.query(query, [issueId, tenantId]);
    return true;
  },
};
