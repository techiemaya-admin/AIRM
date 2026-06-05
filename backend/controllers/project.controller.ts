import { ProjectService } from "../services/project.service";

export class ProjectController {
  static async create(req: any) {
    return ProjectService.create(req);
  }

  static async getAll() {
    return ProjectService.getAll();
  }

  static async getById(id: string) {
    // optional (later)
  }
}
