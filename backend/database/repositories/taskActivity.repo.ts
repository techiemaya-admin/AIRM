import { db } from "../db";

export class TaskActivityRepository {
  static async create(taskId: string, text: string, actorId?: string | null) {
    const { rows } = await db.query(
      `INSERT INTO task_activities (task_id, text, actor_id) VALUES ($1,$2,$3) RETURNING *;`,
      [taskId, text, actorId ?? null]
    );
    return rows[0];
  }

  static async getByTask(taskId: string) {
    const { rows } = await db.query(
      `SELECT ta.*, tm.name AS actor_name
       FROM task_activities ta
       LEFT JOIN team_members tm ON ta.actor_id = tm.id
       WHERE ta.task_id = $1
       ORDER BY ta.created_at DESC`,
      [taskId]
    );
    return rows.map((r) => ({
      ...r,
      actor_name: r.actor_name || null,
    }));
  }
}
