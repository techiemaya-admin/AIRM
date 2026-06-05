import { TaskActivityRepository } from "@/backend/database/repositories/taskActivity.repo";

export class TaskActivityService {
  static create(taskId: string, text: string, actorId?: string | null) {
    return TaskActivityRepository.create(taskId, text, actorId);
  }

  static getByTask(taskId: string) {
    return TaskActivityRepository.getByTask(taskId);
  }
}
