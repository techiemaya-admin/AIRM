import { db } from "../db";

export class ProjectRepository {
  static async create(project: {
    id: string;
    name: string;
    description: string;
    manager: string;
    sprint_length: number;
    members_count: number;
    columns?: string[];
  }) {
    const columns = project.columns || ["Todo", "Sprint", "Review", "Completed"];
    const { rows } = await db.query(
      `
      INSERT INTO projects (id, name, description, manager, sprint_length, members_count, columns)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *;
      `,
      [
        project.id,
        project.name,
        project.description,
        project.manager,
        project.sprint_length,
        project.members_count,
        JSON.stringify(columns),
      ]
    );
    return rows[0];
  }

  static async findAll() {
    const { rows } = await db.query(
      `SELECT * FROM projects ORDER BY created_at DESC`
    );
    return rows;
  }

  static async findById(id: string) {
    const { rows } = await db.query(
      `SELECT * FROM projects WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  /* ========= UPDATE ========= */
  static async update(id: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const key in data) {
      fields.push(`${key} = $${i}`);
      values.push(data[key]);
      i++;
    }

    const { rows } = await db.query(
      `
      UPDATE projects
SET ${fields.join(", ")}
WHERE id = $${i}
RETURNING *;

      `,
      [...values, id]
    );

    return rows[0];
  }

  static async delete(id: string) {
    await db.query(`DELETE FROM projects WHERE id = $1`, [id]);
  }

  /* ========= COLUMN OPERATIONS ========= */
  static async addColumn(projectId: string, columnName: string, position?: number) {
    const project = await this.findById(projectId);
    const columns = Array.isArray(project.columns) ? project.columns : JSON.parse(project.columns || "[]");
    
    if (position !== undefined && position >= 0 && position <= columns.length) {
      columns.splice(position, 0, columnName);
    } else {
      columns.push(columnName);
    }

    const { rows } = await db.query(
      `UPDATE projects SET columns = $1 WHERE id = $2 RETURNING *;`,
      [JSON.stringify(columns), projectId]
    );
    return rows[0];
  }

  static async removeColumn(projectId: string, columnName: string) {
    const project = await this.findById(projectId);
    const columns = Array.isArray(project.columns) ? project.columns : JSON.parse(project.columns || "[]");
    
    const filtered = columns.filter((col: string) => col !== columnName);

    const { rows } = await db.query(
      `UPDATE projects SET columns = $1 WHERE id = $2 RETURNING *;`,
      [JSON.stringify(filtered), projectId]
    );
    return rows[0];
  }

  static async updateColumns(projectId: string, columns: string[]) {
    const { rows } = await db.query(
      `UPDATE projects SET columns = $1 WHERE id = $2 RETURNING *;`,
      [JSON.stringify(columns), projectId]
    );
    return rows[0];
  }
}
