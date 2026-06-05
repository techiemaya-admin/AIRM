import { TeamMemberRepository } from "../database/repositories/teamMember.repo";

export class TeamMemberService {
  static async getByProject(projectId: string) {
    return TeamMemberRepository.getByProject(projectId);
  }
  static async getById(id: string) {
    return TeamMemberRepository.getById(id);
  }
}
