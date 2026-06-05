import { db } from "../db";

export class TaskCommentRepository {
  static async create(taskId: string, text: string, authorId?: string | null) {
    const { rows } = await db.query(
      `INSERT INTO task_comments (task_id, text, author_id) VALUES ($1,$2,$3) RETURNING *;`,
      [taskId, text, authorId ?? null]
    );
    return rows[0];
  }

  static async getByTask(taskId: string) {
    const { rows } = await db.query(
      `SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at DESC`,
      [taskId]
    );
    return rows;
  }
}
