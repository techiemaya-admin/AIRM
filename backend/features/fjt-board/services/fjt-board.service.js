/**
 * FJT Board Service
 * Business logic only
 */

import { fjtBoardRepository } from '../repository/fjt-board.repository.js';

export const fjtBoardService = {
  async getBoardData(schema, tenantId) {
    const [epics, sprints, issues] = await Promise.all([
      fjtBoardRepository.getEpics(schema, tenantId),
      fjtBoardRepository.getSprints(schema, tenantId),
      fjtBoardRepository.getIssues(schema, tenantId),
    ]);

    return {
      project: {
        key: 'FJT',
        name: 'Free Jira Training (FJT)',
      },
      epics,
      sprints,
      issues,
    };
  },

  async createIssue(schema, tenantId, issueData) {
    if (!issueData.key) {
      const projectKey = (issueData.project_key || 'FJT').trim().toUpperCase();
      const typeLabel = issueData.type
        ? issueData.type.charAt(0).toUpperCase() + issueData.type.slice(1).toLowerCase()
        : 'Task';
      const existingIssues = await fjtBoardRepository.getIssues(schema, tenantId);
      let maxNum = 0;
      const regex = new RegExp(`^${projectKey}-${typeLabel}-(\\d+)$`, 'i');
      existingIssues.forEach((i) => {
        if (!i.key) return;
        const match = i.key.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      issueData.key = `${projectKey}-${typeLabel}-${maxNum + 1}`;
    }
    return fjtBoardRepository.createIssue(schema, tenantId, issueData);
  },

  async updateIssueStatus(schema, tenantId, issueId, status) {
    return fjtBoardRepository.updateIssueStatus(schema, tenantId, issueId, status);
  },

  async updateIssueSprint(schema, tenantId, issueId, sprintId) {
    return fjtBoardRepository.updateIssueSprint(schema, tenantId, issueId, sprintId);
  },

  async deleteIssue(schema, tenantId, issueId) {
    return fjtBoardRepository.deleteIssue(schema, tenantId, issueId);
  },
};

