import { TaskRepository } from "../database/repositories/task.repo";

export class TaskService {
  static create(data: {
    project_id: string;
    title: string;
    status: string;
    priority?: string;
    assignee_id?: string | null;
    due_date?: string | null;
    description?: string;
    labels?: string[];
    estimate?: number | null;
  }) {
    return TaskRepository.create(data);
  }

  static update(taskId: string, updates: any) {
    return TaskRepository.update(taskId, updates);
  }

  static getByProject(projectId: string) {
    return TaskRepository.getByProject(projectId);
  }

  static getById(taskId: string) {
    return TaskRepository.getById(taskId);
  }

  static async delete(id: string) {
    return TaskRepository.delete(id);
  }
}
