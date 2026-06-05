import { randomUUID } from "crypto";
import { ProjectRepository } from "../database/repositories/project.repo";
import { TeamMemberRepository } from "../database/repositories/teamMember.repo";
import { TaskService } from "./task.service";

export class ProjectService {
  // Helper function to parse sprint length string
  static parseSprintLength(sprintLengthStr: string): number {
    if (!sprintLengthStr || typeof sprintLengthStr !== 'string') return 2;
    
    const match = sprintLengthStr.match(/^(\d+)\s*(week|weeks?)$/i);
    if (!match) return 2;
    
    const weeks = parseInt(match[1], 10);
    return weeks * 7; // Convert weeks to days
  }

  static async create(data: any) {
    const projectId = randomUUID();

    // Extract column names from template phases
    let columns: string[] | undefined;
    if (data.templatePhases && Array.isArray(data.templatePhases)) {
      columns = data.templatePhases.map((phase: any) => phase.name);
    }

    const project = await ProjectRepository.create({
      id: projectId,
      name: data.name,
      description: data.description || "",
      manager: data.manager || "",
      sprint_length: this.parseSprintLength(data.sprintLength),
      members_count: Array.isArray(data.members)
        ? data.members.length
        : 0,
      columns,
    });

    if (Array.isArray(data.members) && data.members.length > 0) {
      await TeamMemberRepository.createMany(projectId, data.members);
    }

    // ✅ Create tasks from template if provided
    if (data.templatePhases && Array.isArray(data.templatePhases)) {
      console.log("📝 Creating tasks from template phases:", data.templatePhases);
      for (const phase of data.templatePhases) {
        for (const taskTitle of phase.tasks) {
          try {
            const task = await TaskService.create({
              project_id: projectId,
              title: taskTitle,
              status: phase.name,
              priority: "medium",
              description: "",
              labels: [],
            });
            console.log("✅ Created task:", taskTitle, "in status:", phase.name);
          } catch (err) {
            console.error("❌ Failed to create task:", taskTitle, err);
          }
        }
      }
    } else {
      console.log("⚠️ No template phases provided for project creation");
    }

    // Ensure columns persisted as JSONB array (backfill/update in case DB driver coerced string)
    if (Array.isArray(columns) && columns.length > 0) {
      try {
        await ProjectRepository.updateColumns(projectId, columns);
      } catch (err) {
        console.error("❌ Failed to persist project columns:", err);
      }
    }

    // Return fresh project record (ensure columns and other fields are up-to-date)
    try {
      const fresh = await ProjectRepository.findById(projectId);
      return fresh || project;
    } catch (err) {
      return project;
    }
  }

  static async getAll() {
    return ProjectRepository.findAll();
  }

  static async getById(id: string) {
    return ProjectRepository.findById(id);
  }

  // ✅ ADD THIS
  static async update(projectId: string, data: any) {
  

  if (!Array.isArray(data.members)) {
    
  }

  await ProjectRepository.update(projectId, {
    name: data.name,
    description: data.description,
    manager: data.manager,
    sprint_length: this.parseSprintLength(data.sprintLength),
    members_count: data.membersCount,
  });

  // 🔥 FORCE DELETE
    
  await TeamMemberRepository.deleteByProject(projectId);

  if (Array.isArray(data.members) && data.members.length > 0) {
  
    await TeamMemberRepository.createMany(projectId, data.members);
  }
}

  // ✅ ADD THIS
  static async delete(id: string) {
    await ProjectRepository.delete(id);
  }
}
