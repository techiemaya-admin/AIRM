import { FjtService } from '../services/fjtService.js';
import { logger } from '../../../shared/logger.js';
import pool from '../../../shared/database/connection.js';
import { uploadFileToGCS, getFileFromGCS } from '../../../SDK/storage.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FjtController {
  static getSchema(req) {
    return req.user?.schema || req.headers['x-tenant-schema'] || 'erp';
  }

  static async uploadAttachment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const { buffer, originalname, mimetype } = req.file;
      const url = await uploadFileToGCS(buffer, originalname, mimetype, 'task-board');
      
      res.json({
        success: true,
        data: {
          url,
          originalname,
          mimetype,
        }
      });
    } catch (error) {
      logger.error('Error in uploadAttachment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload attachment to Google Cloud Storage'
      });
    }
  }

  static async getMedia(req, res) {
    try {
      // Extract target file path from wildcard or params
      const filePath = req.params[0] || (req.params.folder && req.params.filename ? `${req.params.folder}/${req.params.filename}` : '');
      if (!filePath) {
        return res.status(400).send('File path required');
      }

      const file = getFileFromGCS(filePath);

      // Attempt to get metadata for proper Content-Type
      try {
        const [metadata] = await file.getMetadata();
        if (metadata?.contentType) {
          res.setHeader('Content-Type', metadata.contentType);
        }
      } catch (metaErr) {
        // Fallback mime type based on extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
        };
        if (mimeMap[ext]) {
          res.setHeader('Content-Type', mimeMap[ext]);
        }
      }

      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h

      const stream = file.createReadStream();
      stream.on('error', (err) => {
        logger.error('Error streaming GCS media:', err);
        if (!res.headersSent) {
          res.status(404).send('Media not found');
        } else {
          res.end();
        }
      });

      stream.pipe(res);
    } catch (error) {
      logger.error('Error in getMedia:', error);
      if (!res.headersSent) {
        res.status(500).send('Failed to stream media');
      }
    }
  }

  static async getBoard(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const data = await FjtService.getBoardData(schema);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Error in getBoard:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch board data' });
    }
  }

  static formatErrorMessage(error, defaultMsg) {
    const raw = String(error?.message || '').toLowerCase();
    if (raw.includes('violates not-null constraint') || raw.includes('null value')) {
      return 'Please ensure all required fields are filled.';
    }
    if (raw.includes('violates unique constraint') || raw.includes('already exists')) {
      return 'An item with this key or name already exists.';
    }
    if (raw.includes('violates foreign key constraint')) {
      return 'The referenced parent item or project does not exist.';
    }
    return defaultMsg || 'An unexpected error occurred. Please try again.';
  }

  static async createIssue(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const issue = await FjtService.createIssue(schema, req.body);
      res.status(201).json({ success: true, data: issue });
    } catch (error) {
      logger.error('Error in createIssue:', error);
      res.status(500).json({ success: false, message: FjtController.formatErrorMessage(error, 'Failed to create issue') });
    }
  }

  static async updateIssue(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const { id } = req.params;
      const issue = await FjtService.updateIssue(schema, id, req.body);
      res.json({ success: true, data: issue });
    } catch (error) {
      logger.error('Error in updateIssue:', error);
      res.status(500).json({ success: false, message: FjtController.formatErrorMessage(error, 'Failed to update issue') });
    }
  }

  static async deleteIssue(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const { id } = req.params;
      await FjtService.deleteIssue(schema, id);
      res.json({ success: true, message: 'Issue deleted successfully' });
    } catch (error) {
      logger.error('Error in deleteIssue:', error);
      res.status(500).json({ success: false, message: FjtController.formatErrorMessage(error, 'Failed to delete issue') });
    }
  }

  static async createEpic(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const epic = await FjtService.createEpic(schema, req.body);
      res.status(201).json({ success: true, data: epic });
    } catch (error) {
      logger.error('Error in createEpic:', error);
      res.status(500).json({ success: false, message: FjtController.formatErrorMessage(error, 'Failed to create epic') });
    }
  }

  static async updateEpic(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const { id } = req.params;
      const epic = await FjtService.updateEpic(schema, id, req.body);
      res.json({ success: true, data: epic });
    } catch (error) {
      logger.error('Error in updateEpic:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update epic' });
    }
  }

  static async createSprint(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const sprint = await FjtService.createSprint(schema, req.body);
      res.status(201).json({ success: true, data: sprint });
    } catch (error) {
      logger.error('Error in createSprint:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create sprint' });
    }
  }

  static async updateSprint(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const { id } = req.params;
      const sprint = await FjtService.updateSprint(schema, id, req.body);
      res.json({ success: true, data: sprint });
    } catch (error) {
      logger.error('Error in updateSprint:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update sprint' });
    }
  }

  static async createProject(req, res) {
    try {
      const schema = FjtController.getSchema(req);
      const project = await FjtService.createProject(schema, req.body);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      logger.error('Error in createProject:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create project' });
    }
  }

  static async migrateAndSeed(req, res) {
    try {
      // 1. Fetch real users from erp.users
      const userRes = await pool.query(`
        SELECT id, full_name, email 
        FROM erp.users 
        ORDER BY created_at ASC 
        LIMIT 5
      `);

      if (userRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'No users found in erp.users' });
      }

      const primaryUser = userRes.rows[0];
      const secondaryUser = userRes.rows[1] || primaryUser;

      // 2. Drop any previous fjt tables to match clean erp.users schema
      await pool.query(`
        DROP TABLE IF EXISTS erp.fjt_issues CASCADE;
        DROP TABLE IF EXISTS erp.fjt_sprints CASCADE;
        DROP TABLE IF EXISTS erp.fjt_epics CASCADE;
        DROP TABLE IF EXISTS erp.fjt_projects CASCADE;
      `);

      // 3. Run DDL
      const ddlPath = path.resolve(__dirname, '../schema/fjt_board.sql');
      const ddl = fs.readFileSync(ddlPath, 'utf8');
      await pool.query(ddl);

      // 4. Seed Default Project
      await pool.query(`
        INSERT INTO erp.fjt_projects (key, name, description, category, lead_user_id, lead, created_by)
        VALUES ('FJT', 'Free Jira Training (FJT)', 'Training and demonstration project for Jira features', 'Software', $1, $2, $1)
      `, [primaryUser.id, primaryUser.full_name || primaryUser.email]);

      // 5. Seed Epics
      const epic1Res = await pool.query(`
        INSERT INTO erp.fjt_epics (key, epic_name, summary, color, status, start_date, due_date, reporter_id)
        VALUES ('FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', 'Requirements gathering and initial workflow specifications for WhatsApp channel.', '#ea580c', 'in_progress', '2026-06-20', '2026-07-20', $1)
        RETURNING id
      `, [primaryUser.id]);
      const epic1Id = epic1Res.rows[0].id;

      await pool.query(`
        INSERT INTO erp.fjt_epics (key, epic_name, summary, color, status, start_date, due_date, reporter_id)
        VALUES ('FJT-Epic-2', 'WHATSAPP MEDIA INTEGRATION', 'Support real-time camera capture, attachment compression, and gallery selection.', '#dc2626', 'to_do', '2026-06-01', '2026-07-30', $1)
      `, [primaryUser.id]);

      // 6. Seed Sprint
      const sprintRes = await pool.query(`
        INSERT INTO erp.fjt_sprints (name, goal, status, start_date, end_date, created_by)
        VALUES ('Sprint 1', 'Deliver WhatsApp Camera and messaging workflows', 'active', '2026-06-21', '2026-07-05', $1)
        RETURNING id
      `, [primaryUser.id]);
      const sprint1Id = sprintRes.rows[0].id;

      const pInitials = (primaryUser.full_name || 'FT')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'FT';
      const pName = primaryUser.full_name || primaryUser.email;

      // 7. Seed Stories
      const s1Res = await pool.query(`
        INSERT INTO erp.fjt_issues (
          key, project_key, project_name, type, summary, description,
          status, priority, epic_id, epic_key, epic_name, epic_color, sprint_id,
          story_points, assignee_id, assignee_name, assignee_initials, reporter_id, start_date, end_date
        ) VALUES (
          'FJT-Story-1', 'FJT', 'Free Jira Training (FJT)', 'story',
          'Capture Pictures using WhatsApp Camera', 'Allow end-users to invoke direct camera capture within the messaging window.',
          'to_do', 'high', $1, 'FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', '#ea580c', $2,
          5, $3, $4, $5, $3, '2026-06-21', '2026-07-05'
        ) RETURNING id
      `, [epic1Id, sprint1Id, primaryUser.id, pName, pInitials]);
      const story1Id = s1Res.rows[0].id;

      await pool.query(`
        INSERT INTO erp.fjt_issues (
          key, project_key, project_name, type, summary, description,
          status, priority, epic_id, epic_key, epic_name, epic_color, sprint_id,
          story_points, assignee_id, assignee_name, assignee_initials, reporter_id, start_date, end_date
        ) VALUES (
          'FJT-Story-2', 'FJT', 'Free Jira Training (FJT)', 'story',
          'Send Messages to other WhatsApp Numbers', 'Enable broadcasting and direct peer-to-peer messages via verified WhatsApp channel.',
          'in_progress', 'highest', $1, 'FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', '#ea580c', $2,
          8, $3, $4, $5, $3, '2026-06-21', '2026-07-05'
        )
      `, [epic1Id, sprint1Id, secondaryUser.id, secondaryUser.full_name || secondaryUser.email, pInitials]);

      // 8. Seed Tasks and Bugs
      await pool.query(`
        INSERT INTO erp.fjt_issues (
          key, project_key, project_name, type, summary, description,
          status, priority, epic_id, epic_key, epic_name, epic_color,
          story_id, story_key, story_summary, sprint_id,
          story_points, assignee_id, assignee_name, assignee_initials, reporter_id, start_date, end_date
        ) VALUES (
          'FJT-Task-1', 'FJT', 'Free Jira Training (FJT)', 'task',
          'Planning - Automate Paper HRAs into Questionnaire in Member Portal System',
          'Convert physical paper health risk assessments into responsive interactive questionnaires.',
          'to_do', 'medium', $1, 'FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', '#ea580c',
          $2, 'FJT-Story-1', 'Capture Pictures using WhatsApp Camera', $3,
          2, $4, $5, $6, $4, '2026-06-21', '2026-06-28'
        )
      `, [epic1Id, story1Id, sprint1Id, primaryUser.id, pName, pInitials]);

      await pool.query(`
        INSERT INTO erp.fjt_issues (
          key, project_key, project_name, type, summary, description,
          status, priority, epic_id, epic_key, epic_name, epic_color,
          story_id, story_key, story_summary, sprint_id,
          story_points, assignee_id, assignee_name, assignee_initials, reporter_id, start_date, end_date
        ) VALUES (
          'FJT-Task-2', 'FJT', 'Free Jira Training (FJT)', 'task',
          'Testing - Tester needs to test the picture .',
          'Verify picture capture resolution, aspect ratio, and validation on mobile web.',
          'to_do', 'medium', $1, 'FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', '#ea580c',
          $2, 'FJT-Story-1', 'Capture Pictures using WhatsApp Camera', $3,
          3, $4, $5, $6, $4, '2026-06-21', '2026-06-27'
        )
      `, [epic1Id, story1Id, sprint1Id, primaryUser.id, pName, pInitials]);

      await pool.query(`
        INSERT INTO erp.fjt_issues (
          key, project_key, project_name, type, summary, description,
          status, priority, epic_id, epic_key, epic_name, epic_color,
          story_id, story_key, story_summary, sprint_id,
          story_points, assignee_id, assignee_name, assignee_initials, reporter_id, start_date, end_date
        ) VALUES (
          'FJT-Task-3', 'FJT', 'Free Jira Training (FJT)', 'task',
          'Development task - Developer needs to code inorder to capture pictures .',
          'Implement camera stream capture API integration.',
          'to_do', 'medium', $1, 'FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', '#ea580c',
          $2, 'FJT-Story-1', 'Capture Pictures using WhatsApp Camera', $3,
          4, $4, $5, $6, $4, '2026-06-21', '2026-06-30'
        )
      `, [epic1Id, story1Id, sprint1Id, primaryUser.id, pName, pInitials]);

      await pool.query(`
        INSERT INTO erp.fjt_issues (
          key, project_key, project_name, type, summary, description,
          status, priority, epic_id, epic_key, epic_name, epic_color,
          story_id, story_key, story_summary, sprint_id,
          story_points, assignee_id, assignee_name, assignee_initials, reporter_id, start_date, end_date
        ) VALUES (
          'FJT-Bug-1', 'FJT', 'Free Jira Training (FJT)', 'bug',
          'Camera not working on specific Android versions',
          'Permission prompt fails on certain Chrome Android versions.',
          'in_progress', 'high', $1, 'FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', '#ea580c',
          $2, 'FJT-Story-1', 'Capture Pictures using WhatsApp Camera', $3,
          2, $4, $5, $6, $4, '2026-06-22', '2026-06-25'
        )
      `, [epic1Id, story1Id, sprint1Id, primaryUser.id, pName, pInitials]);

      res.json({
        success: true,
        message: 'Successfully migrated and seeded FJT schema matched with erp.users',
        matchedUser: {
          id: primaryUser.id,
          name: pName,
          email: primaryUser.email
        }
      });
    } catch (error) {
      logger.error('Error in migrateAndSeed:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
