import { db } from "../db";

export class TaskBugRepository {
  static async create(taskId: string, description: string, reporterId?: string | null) {
    const { rows } = await db.query(
      `INSERT INTO task_bugs (task_id, description, reporter_id) VALUES ($1,$2,$3) RETURNING *;`,
      [taskId, description, reporterId ?? null]
    );
    return rows[0];
  }

  static async getByTask(taskId: string) {
    const { rows } = await db.query(
      `SELECT * FROM task_bugs WHERE task_id = $1 ORDER BY created_at DESC`,
      [taskId]
    );
    return rows;
  }
}
