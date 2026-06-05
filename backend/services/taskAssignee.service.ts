import { TaskAssigneeRepository } from "@/backend/database/repositories/taskAssignee.repo";

export class TaskAssigneeService {
  static setForTask(taskId: string, memberIds: string[]) {
    return TaskAssigneeRepository.setForTask(taskId, memberIds);
  }

  static getByTask(taskId: string) {
    return TaskAssigneeRepository.getByTask(taskId);
  }
}
