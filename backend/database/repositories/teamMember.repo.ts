import { db } from "../db";

export class TeamMemberRepository {
  static async getByProject(projectId: string) {
    const { rows } = await db.query(
      `SELECT id, name, email, role
       FROM team_members
       WHERE project_id = $1
       ORDER BY created_at`,
      [projectId]
    );

    return rows;
  }
   static async deleteByProject(projectId: string) {
  console.log("🔥 SQL DELETE team_members WHERE project_id =", projectId);

  await db.query(
    "DELETE FROM team_members WHERE project_id = $1",
    [projectId]
  );
}


  static async createMany(
    projectId: string,
    members: { name: string; email: string; role: string }[]
  ) {
    console.log("INSERTING MEMBERS INTO DB:", members);

    for (const m of members) {
      await db.query(
        `
        INSERT INTO team_members (project_id, name, email, role)
        VALUES ($1, $2, $3, $4)
        `,
        [projectId, m.name, m.email, m.role]
      );
    }
  }

  static async getById(id: string) {
    const { rows } = await db.query(
      `SELECT id, name, email, role FROM team_members WHERE id = $1`,
      [id]
    );
    return rows[0];
  }
}
