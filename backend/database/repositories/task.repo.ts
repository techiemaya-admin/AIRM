import { db } from "../db";

export class TaskRepository {
  static async create(task: {
    project_id: string;
    title: string;
    status: string;
    priority?: string;
    assignee_id?: string | null;
    due_date?: string | null;
    description?: string;
    labels?: string[];
    estimate?: number;
  }) {
    const { rows } = await db.query(
      `
      INSERT INTO tasks (project_id, title, status, priority, assignee_id, due_date, description, labels, estimate)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
      `,
      [
        task.project_id,
        task.title,
        task.status,
        task.priority ?? "low",
        task.assignee_id ?? null,
        task.due_date ?? null,
        task.description ?? null,
        JSON.stringify(task.labels ?? []),
        task.estimate ?? 8,
      ]
    );

    return rows[0];
  }

  static async getByProject(projectId: string) {
    const { rows } = await db.query(
      `SELECT t.*, tm.name as assignee
       FROM tasks t
       LEFT JOIN team_members tm ON t.assignee_id = tm.id
       WHERE t.project_id = $1 
       ORDER BY t.created_at`,
      [projectId]
    );
    return rows;
  }

  static async update(id: string, updates: any) {
    const fields = [];
    const values = [];
    let i = 1;

    for (const key in updates) {
      fields.push(`${key} = $${i}`);
      values.push(updates[key]);
      i++;
    }

    const { rows } = await db.query(
      `
      UPDATE tasks
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING *;
      `,
      [...values, id]
    );

    return rows[0];
  }

  static async getById(id: string) {
    const { rows } = await db.query(
      `SELECT t.*, tm.name as assignee
       FROM tasks t
       LEFT JOIN team_members tm ON t.assignee_id = tm.id
       WHERE t.id = $1`,
      [id]
    );
    return rows[0];
  }
  static async delete(id: string) {
    await db.query(
      `DELETE FROM tasks WHERE id = $1`,
      [id]
    );
    return true;
  }
}
