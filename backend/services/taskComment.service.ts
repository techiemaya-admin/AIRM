import { TaskCommentRepository } from "@/backend/database/repositories/taskComment.repo";

export class TaskCommentService {
  static create(taskId: string, text: string, authorId?: string | null) {
    return TaskCommentRepository.create(taskId, text, authorId);
  }

  static getByTask(taskId: string) {
    return TaskCommentRepository.getByTask(taskId);
  }
}
