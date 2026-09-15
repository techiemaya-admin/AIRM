/**
 * FJT Board Controller
 * Input validation + call service + return response
 */

import { fjtBoardService } from '../services/fjt-board.service.js';

function getTenantContext(req) {
  const schema = req.user?.schema || process.env.DB_SCHEMA || 'erp';
  const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] || req.user?.id || '00000000-0000-0000-0000-000000000000';
  return { schema, tenantId };
}

export const fjtBoardController = {
  async getBoardData(req, res) {
    try {
      const { schema, tenantId } = getTenantContext(req);
      const data = await fjtBoardService.getBoardData(schema, tenantId);
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch FJT board data', message: err.message });
    }
  },

  async createIssue(req, res) {
    try {
      const { schema, tenantId } = getTenantContext(req);
      const { type, summary } = req.body;
      if (!type || !summary) {
        return res.status(400).json({ error: 'Validation failed', message: 'Type and Summary are required.' });
      }

      const issue = await fjtBoardService.createIssue(schema, tenantId, req.body);
      return res.status(201).json(issue);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create issue', message: err.message });
    }
  },

  async updateIssueStatus(req, res) {
    try {
      const { schema, tenantId } = getTenantContext(req);
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Validation failed', message: 'Status is required.' });
      }

      const issue = await fjtBoardService.updateIssueStatus(schema, tenantId, id, status);
      return res.json(issue);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update issue status', message: err.message });
    }
  },

  async updateIssueSprint(req, res) {
    try {
      const { schema, tenantId } = getTenantContext(req);
      const { id } = req.params;
      const { sprint_id } = req.body;

      const issue = await fjtBoardService.updateIssueSprint(schema, tenantId, id, sprint_id);
      return res.json(issue);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update issue sprint', message: err.message });
    }
  },

  async deleteIssue(req, res) {
    try {
      const { schema, tenantId } = getTenantContext(req);
      const { id } = req.params;
      await fjtBoardService.deleteIssue(schema, tenantId, id);
      return res.json({ success: true, message: 'Issue deleted successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete issue', message: err.message });
    }
  },
};
