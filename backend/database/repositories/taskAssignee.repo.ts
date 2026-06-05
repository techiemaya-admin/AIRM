import { db } from "../db";

export class TaskAssigneeRepository {
  static async setForTask(taskId: string, memberIds: string[]) {
    // remove existing
    await db.query(`DELETE FROM task_assignees WHERE task_id = $1`, [taskId]);

    if (!memberIds || memberIds.length === 0) return [];

    // bulk insert
    const values: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const memberId of memberIds) {
      values.push(`($${idx}, $${idx + 1})`);
      params.push(taskId, memberId);
      idx += 2;
    }

    const insertSql = `INSERT INTO task_assignees (task_id, member_id) VALUES ${values.join(",")} RETURNING *;`;
    const { rows } = await db.query(insertSql, params);
    return rows;
  }

  static async getByTask(taskId: string) {
    const { rows } = await db.query(
      `SELECT tm.id, tm.name, tm.email
       FROM task_assignees ta
       JOIN team_members tm ON ta.member_id = tm.id
       WHERE ta.task_id = $1
       ORDER BY ta.created_at DESC`,
      [taskId]
    );
    return rows; // array of { id, name, email }
  }
}
