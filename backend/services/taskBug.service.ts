import { TaskBugRepository } from "@/backend/database/repositories/taskBug.repo";

export class TaskBugService {
  static create(taskId: string, description: string, reporterId?: string | null) {
    return TaskBugRepository.create(taskId, description, reporterId);
  }

  static getByTask(taskId: string) {
    return TaskBugRepository.getByTask(taskId);
  }
}
