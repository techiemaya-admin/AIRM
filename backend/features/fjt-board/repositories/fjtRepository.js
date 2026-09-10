import pool from '../../../shared/database/connection.js';
import { logger } from '../../../shared/logger.js';

export class FjtRepository {
  static resolveSchema(schema) {
    return schema || 'erp';
  }

  // --- PROJECTS ---
  static async getProjects(schema) {
    const s = this.resolveSchema(schema);
    const query = `
      SELECT 
        p.id, p.key, p.name, p.description, p.category, 
        p.lead_user_id, p.lead, p.created_by,
        p.metadata, p.is_deleted, p.created_at, p.updated_at,
        u.full_name as lead_name, u.email as lead_email
      FROM ${s}.fjt_projects p
      LEFT JOIN ${s}.users u ON p.lead_user_id = u.id
      WHERE p.is_deleted = false
      ORDER BY p.created_at ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async createProject(schema, data) {
    const s = this.resolveSchema(schema);
    const query = `
      INSERT INTO ${s}.fjt_projects (key, name, description, category, lead_user_id, lead, created_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const res = await pool.query(query, [
      data.key,
      data.name,
      data.description || null,
      data.category || 'Software',
      data.lead_user_id || null,
      data.lead || '-',
      data.created_by || null,
      data.metadata || {}
    ]);
    return res.rows[0];
  }

  // --- EPICS ---
  static async getEpics(schema) {
    const s = this.resolveSchema(schema);
    const query = `
      SELECT 
        e.id, e.key, e.epic_name, e.summary, e.color, e.status, 
        e.start_date, e.due_date, e.reporter_id,
        e.metadata, e.is_deleted, e.created_at, e.updated_at,
        u.full_name as reporter_name, u.email as reporter_email
      FROM ${s}.fjt_epics e
      LEFT JOIN ${s}.users u ON e.reporter_id = u.id
      WHERE e.is_deleted = false
      ORDER BY e.created_at ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async createEpic(schema, data) {
    const s = this.resolveSchema(schema);
    const query = `
      INSERT INTO ${s}.fjt_epics (key, epic_name, summary, color, status, start_date, due_date, reporter_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const res = await pool.query(query, [
      data.key,
      data.epic_name,
      data.summary,
      data.color || '#ea580c',
      data.status || 'to_do',
      data.start_date || null,
      data.due_date || null,
      data.reporter_id || null,
      data.metadata || {}
    ]);
    return res.rows[0];
  }

  static async updateEpic(schema, id, data) {
    const s = this.resolveSchema(schema);
    const query = `
      UPDATE ${s}.fjt_epics
      SET epic_name = COALESCE($2, epic_name),
          summary = COALESCE($3, summary),
          color = COALESCE($4, color),
          status = COALESCE($5, status),
          start_date = COALESCE($6, start_date),
          due_date = COALESCE($7, due_date),
          metadata = COALESCE($8, metadata),
          updated_at = NOW()
      WHERE id = $1 AND is_deleted = false
      RETURNING *;
    `;
    const res = await pool.query(query, [
      id,
      data.epic_name,
      data.summary,
      data.color,
      data.status,
      data.start_date,
      data.due_date,
      data.metadata
    ]);
    return res.rows[0];
  }

  // --- SPRINTS (Disabled / Removed per requirement) ---
  static async getSprints(_schema) {
    return [];
  }

  static async createSprint(_schema, _data) {
    return null;
  }

  static async updateSprint(_schema, _id, _data) {
    return null;
  }

  // --- ISSUES (Matched with erp.users, epics, stories, tasks) ---
  static async getIssues(schema) {
    const s = this.resolveSchema(schema);
    const query = `
      SELECT 
        i.id, i.numeric_id, i.key, i.project_key, i.project_name, i.type,
        i.summary, i.description, i.status, i.priority, i.story_points,
        i.epic_id,
        COALESCE(e.key, i.epic_key) as epic_key,
        COALESCE(e.epic_name, e.summary, i.epic_name) as epic_name,
        COALESCE(e.color, i.epic_color) as epic_color,
        i.story_id,
        COALESCE(st.key, i.story_key) as story_key,
        COALESCE(st.summary, i.story_summary) as story_summary,
        i.linked_task_id,
        COALESCE(lt.key, (i.raw_data->>'linked_task_key')) as linked_task_key,
        COALESCE(lt.summary, (i.raw_data->>'linked_task_summary')) as linked_task_summary,
        i.assignee_id, i.assignee_name, i.assignee_initials,
        i.reporter_id,
        i.start_date, i.end_date, i.labels, i.metadata, i.raw_data, i.is_deleted, i.created_at, i.updated_at,
        u.id as user_id, u.full_name as user_full_name, u.email as user_email,
        r.id as reporter_user_id, r.full_name as reporter_user_name, r.email as reporter_user_email
      FROM ${s}.fjt_issues i
      LEFT JOIN ${s}.fjt_epics e ON i.epic_id = e.id
      LEFT JOIN ${s}.fjt_issues st ON i.story_id = st.id
      LEFT JOIN ${s}.fjt_issues lt ON i.linked_task_id = lt.id
      LEFT JOIN ${s}.users u ON i.assignee_id = u.id
      LEFT JOIN ${s}.users r ON i.reporter_id = r.id
      WHERE i.is_deleted = false
      ORDER BY i.created_at ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async createIssue(schema, data) {
    const s = this.resolveSchema(schema);
    const query = `
      INSERT INTO ${s}.fjt_issues (
        key, project_key, project_name, type,
        summary, description, status, priority, story_points,
        epic_id, epic_key, epic_name, epic_color,
        story_id, story_key, story_summary, linked_task_id,
        assignee_id, assignee_name, assignee_initials, reporter_id,
        start_date, end_date, labels, metadata, raw_data
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26
      )
      RETURNING *;
    `;
    const res = await pool.query(query, [
      data.key,
      data.project_key || 'FJT',
      data.project_name || 'Free Jira Training (FJT)',
      data.type,
      data.summary,
      data.description || null,
      data.status || 'to_do',
      data.priority || 'medium',
      data.story_points || null,
      data.epic_id || null,
      data.epic_key || null,
      data.epic_name || null,
      data.epic_color || null,
      data.story_id || null,
      data.story_key || null,
      data.story_summary || null,
      data.linked_task_id || null,
      data.assignee_id || null,
      data.assignee_name || null,
      data.assignee_initials || null,
      data.reporter_id || null,
      data.start_date || null,
      data.end_date || null,
      JSON.stringify(data.labels || []),
      JSON.stringify(data.metadata || {}),
      JSON.stringify(data.raw_data || {})
    ]);
    return res.rows[0];
  }

  static async updateIssue(schema, id, data) {
    const s = this.resolveSchema(schema);
    const updates = [];
    const values = [id];
    let idx = 2;

    if (data.summary !== undefined) {
      updates.push(`summary = $${idx++}`);
      values.push(data.summary);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${idx++}`);
      values.push(data.priority);
    }
    if (data.story_points !== undefined) {
      updates.push(`story_points = $${idx++}`);
      values.push(data.story_points);
    }
    if (data.epic_id !== undefined) {
      updates.push(`epic_id = $${idx++}`);
      values.push(data.epic_id);
    }
    if (data.epic_key !== undefined) {
      updates.push(`epic_key = $${idx++}`);
      values.push(data.epic_key);
    }
    if (data.epic_name !== undefined) {
      updates.push(`epic_name = $${idx++}`);
      values.push(data.epic_name);
    }
    if (data.epic_color !== undefined) {
      updates.push(`epic_color = $${idx++}`);
      values.push(data.epic_color);
    }
    if (data.story_id !== undefined) {
      updates.push(`story_id = $${idx++}`);
      values.push(data.story_id);
    }
    if (data.story_key !== undefined) {
      updates.push(`story_key = $${idx++}`);
      values.push(data.story_key);
    }
    if (data.story_summary !== undefined) {
      updates.push(`story_summary = $${idx++}`);
      values.push(data.story_summary);
    }
    if (data.linked_task_id !== undefined) {
      updates.push(`linked_task_id = $${idx++}`);
      values.push(data.linked_task_id);
    }
    if (data.assignee_id !== undefined) {
      updates.push(`assignee_id = $${idx++}`);
      values.push(data.assignee_id);
    }
    if (data.assignee_name !== undefined) {
      updates.push(`assignee_name = $${idx++}`);
      values.push(data.assignee_name);
    }
    if (data.assignee_initials !== undefined) {
      updates.push(`assignee_initials = $${idx++}`);
      values.push(data.assignee_initials);
    }
    if (data.reporter_id !== undefined) {
      updates.push(`reporter_id = $${idx++}`);
      values.push(data.reporter_id);
    }
    if (data.start_date !== undefined) {
      updates.push(`start_date = $${idx++}`);
      values.push(data.start_date || null);
    }
    if (data.end_date !== undefined) {
      updates.push(`end_date = $${idx++}`);
      values.push(data.end_date || null);
    }
    if (data.labels !== undefined) {
      updates.push(`labels = $${idx++}::jsonb`);
      values.push(JSON.stringify(data.labels || []));
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${idx++}::jsonb`);
      values.push(JSON.stringify(data.metadata || {}));
    }
    if (data.raw_data !== undefined) {
      updates.push(`raw_data = COALESCE(raw_data, '{}'::jsonb) || $${idx++}::jsonb`);
      values.push(JSON.stringify(data.raw_data || {}));
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE ${s}.fjt_issues
      SET ${updates.join(', ')}
      WHERE id = $1 AND is_deleted = false
      RETURNING *;
    `;

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  static async deleteIssue(schema, id) {
    const s = this.resolveSchema(schema);
    const query = `
      UPDATE ${s}.fjt_issues
      SET is_deleted = true,
          updated_at = NOW()
      WHERE id = $1 AND is_deleted = false
      RETURNING id;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0];
  }

  static async getNextIssueKey(schema, projectKey, type) {
    const s = this.resolveSchema(schema);
    const prefix = type === 'epic' ? `${projectKey}-Epic-` : type === 'story' ? `${projectKey}-Story-` : type === 'bug' ? `${projectKey}-Bug-` : `${projectKey}-Task-`;
    const query = `
      SELECT key FROM ${s}.fjt_issues
      WHERE key LIKE $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const res = await pool.query(query, [`${prefix}%`]);
    if (res.rows.length === 0) {
      return `${prefix}1`;
    }
    const lastKey = res.rows[0].key;
    const numPart = parseInt(lastKey.replace(prefix, ''), 10);
    const nextNum = isNaN(numPart) ? 1 : numPart + 1;
    return `${prefix}${nextNum}`;
  }

  static async getNextEpicKey(schema, projectKey = 'FJT') {
    const s = this.resolveSchema(schema);
    const prefix = `${projectKey}-Epic-`;
    const query = `
      SELECT key FROM ${s}.fjt_epics
      WHERE key LIKE $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const res = await pool.query(query, [`${prefix}%`]);
    if (res.rows.length === 0) {
      return `${prefix}1`;
    }
    const lastKey = res.rows[0].key;
    const numPart = parseInt(lastKey.replace(prefix, ''), 10);
    const nextNum = isNaN(numPart) ? 1 : numPart + 1;
    return `${prefix}${nextNum}`;
  }
}
