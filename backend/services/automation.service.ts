import { AutomationRepository } from "@/backend/database/repositories/automation.repo";
import { CreateAutomationDTO } from "../database/types/automation";

export class AutomationService {
  static async list(projectId: string) {
    return AutomationRepository.findByProject(projectId);
  }

  static async create(projectId: string, data: CreateAutomationDTO) {
    if (!data.trigger_type || !data.action_type) {
      throw new Error("Invalid automation rule");
    }

    return AutomationRepository.create(projectId, data);
  }
}
