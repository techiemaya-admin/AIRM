import { AutomationService } from "../services/automation.service";
import { NextResponse } from "next/server";

export class AutomationController {
  static async getAll(projectId: string) {
    const automations = await AutomationService.list(projectId);
    return NextResponse.json(automations);
  }

  static async create(projectId: string, body: any) {
    await AutomationService.create(projectId, body);
    return NextResponse.json({ success: true });
  }
}
