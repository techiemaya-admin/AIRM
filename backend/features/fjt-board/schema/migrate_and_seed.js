import pool from '../../../shared/database/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateAndSeed() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting FJT Board migration & seeding for erp schema matching erp.users...');

    // 1. Fetch real users from erp.users
    const userRes = await client.query(`
      SELECT id, full_name, email 
      FROM erp.users 
      ORDER BY created_at ASC 
      LIMIT 10
    `);
    
    if (userRes.rows.length === 0) {
      throw new Error('No users found in erp.users! Please ensure erp.users has employees.');
    }
    
    console.log(`Found ${userRes.rows.length} users in erp.users.`);
    const primaryUser = userRes.rows[0];
    const secondaryUser = userRes.rows[1] || primaryUser;
    console.log(`Primary user: ${primaryUser.full_name || primaryUser.email} (${primaryUser.id})`);

    // 2. Drop old tables if they have tenant_id column so we have clean schema matching erp.users
    console.log('Dropping any previous fjt tables to match clean erp.users schema...');
    await client.query(`
      DROP TABLE IF EXISTS erp.fjt_issues CASCADE;
      DROP TABLE IF EXISTS erp.fjt_sprints CASCADE;
      DROP TABLE IF EXISTS erp.fjt_epics CASCADE;
      DROP TABLE IF EXISTS erp.fjt_projects CASCADE;
    `);

    // 3. Run DDL from fjt_board.sql
    const ddlPath = path.resolve(__dirname, 'fjt_board.sql');
    const ddl = fs.readFileSync(ddlPath, 'utf8');
    await client.query(ddl);
    console.log('✅ Tables created in erp schema: fjt_projects, fjt_epics, fjt_sprints, fjt_issues matching erp.users');

    // 4. Seed Default Project
    const projRes = await client.query(`
      INSERT INTO erp.fjt_projects (key, name, description, category, lead_user_id, lead, created_by)
      VALUES ('FJT', 'Free Jira Training (FJT)', 'Training and demonstration project for Jira features', 'Software', $1, $2, $1)
      RETURNING id;
    `, [primaryUser.id, primaryUser.full_name || primaryUser.email]);
    console.log('✅ Seeded default project: Free Jira Training (FJT)');

    // 5. Seed Epics
    const epic1Res = await client.query(`
      INSERT INTO erp.fjt_epics (key, epic_name, summary, color, status, start_date, due_date, reporter_id)
      VALUES ('FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', 'Requirements gathering and initial workflow specifications for WhatsApp channel.', '#ea580c', 'in_progress', '2026-06-20', '2026-07-20', $1)
      RETURNING id;
    `, [primaryUser.id]);
    const epic1Id = epic1Res.rows[0].id;

    const epic2Res = await client.query(`
      INSERT INTO erp.fjt_epics (key, epic_name, summary, color, status, start_date, due_date, reporter_id)
      VALUES ('FJT-Epic-2', 'WHATSAPP MEDIA INTEGRATION', 'Support real-time camera capture, attachment compression, and gallery selection.', '#dc2626', 'to_do', '2026-06-01', '2026-07-30', $1)
      RETURNING id;
    `, [primaryUser.id]);
    const epic2Id = epic2Res.rows[0].id;
    console.log('✅ Seeded Epics: FJT-Epic-1, FJT-Epic-2');

    // 6. Seed Sprint
    const sprintRes = await client.query(`
      INSERT INTO erp.fjt_sprints (name, goal, status, start_date, end_date, created_by)
      VALUES ('Sprint 1', 'Deliver WhatsApp Camera and messaging workflows', 'active', '2026-06-21', '2026-07-05', $1)
      RETURNING id;
    `, [primaryUser.id]);
    const sprint1Id = sprintRes.rows[0].id;
    console.log('✅ Seeded Sprint: Sprint 1');

    const pInitials = (primaryUser.full_name || 'FT')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'FT';

    const pName = primaryUser.full_name || primaryUser.email;

    // 7. Seed Stories
    const s1Res = await client.query(`
      INSERT INTO erp.fjt_issues (
        key, project_key, project_name, type, summary, description,
        status, priority, epic_id, epic_key, epic_name, epic_color, sprint_id,
        story_points, assignee_id, assignee_name, assignee_initials, reporter_id, start_date, end_date
      ) VALUES (
        'FJT-Story-1', 'FJT', 'Free Jira Training (FJT)', 'story',
        'Capture Pictures using WhatsApp Camera', 'Allow end-users to invoke direct camera capture within the messaging window.',
        'to_do', 'high', $1, 'FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', '#ea580c', $2,
        5, $3, $4, $5, $3, '2026-06-21', '2026-07-05'
      ) RETURNING id;
    `, [epic1Id, sprint1Id, primaryUser.id, pName, pInitials]);
    const story1Id = s1Res.rows[0].id;

    const s2Res = await client.query(`
      INSERT INTO erp.fjt_issues (
        key, project_key, project_name, type, summary, description,
        status, priority, epic_id, epic_key, epic_name, epic_color, sprint_id,
        story_points, assignee_id, assignee_name, assignee_initials, reporter_id, start_date, end_date
      ) VALUES (
        'FJT-Story-2', 'FJT', 'Free Jira Training (FJT)', 'story',
        'Send Messages to other WhatsApp Numbers', 'Enable broadcasting and direct peer-to-peer messages via verified WhatsApp channel.',
        'in_progress', 'highest', $1, 'FJT-Epic-1', 'GATHER REQUIREMENTS FOR WHATSAPP.', '#ea580c', $2,
        8, $3, $4, $5, $3, '2026-06-21', '2026-07-05'
      ) RETURNING id;
    `, [epic1Id, sprint1Id, secondaryUser.id, secondaryUser.full_name || secondaryUser.email, pInitials]);
    console.log('✅ Seeded Stories: FJT-Story-1, FJT-Story-2');

    // 8. Seed Tasks and Bugs under Story 1
    await client.query(`
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
      );
    `, [epic1Id, story1Id, sprint1Id, primaryUser.id, pName, pInitials]);

    await client.query(`
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
      );
    `, [epic1Id, story1Id, sprint1Id, primaryUser.id, pName, pInitials]);

    await client.query(`
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
      );
    `, [epic1Id, story1Id, sprint1Id, primaryUser.id, pName, pInitials]);

    await client.query(`
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
      );
    `, [epic1Id, story1Id, sprint1Id, primaryUser.id, pName, pInitials]);

    console.log('🎉 Migration and Seeding finished successfully matching erp.users!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateAndSeed();
