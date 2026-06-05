import { db } from "../db";
import { Automation, CreateAutomationDTO } from "../types/automation";

export class AutomationRepository {
  static async findByProject(projectId: string): Promise<Automation[]> {
    const { rows } = await db.query(
      `
      SELECT *
      FROM project_automations
      WHERE project_id = $1
      ORDER BY created_at DESC
      `,
      [projectId]
    );

    return rows;
  }

  static async create(
    projectId: string,
    data: CreateAutomationDTO
  ): Promise<void> {
    await db.query(
      `
      INSERT INTO project_automations
      (project_id, trigger_type, trigger_config, action_type, action_config)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        projectId,
        data.trigger_type,
        data.trigger_config ?? {},
        data.action_type,
        data.action_config ?? {},
      ]
    );
  }
}
