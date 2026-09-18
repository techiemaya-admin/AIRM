import { FjtRepository } from '../repositories/fjtRepository.js';

const isValidUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

function formatRawData(comments, existingRawData = {}) {
  let result = {};
  if (existingRawData && typeof existingRawData === 'object' && !Array.isArray(existingRawData)) {
    result = { ...existingRawData };
    // Clear out any old comment keys so deleted comments are removed
    Object.keys(result).forEach((k) => {
      if (/^comment\s*\d+/i.test(k)) {
        delete result[k];
      }
    });
  }

  let commentList = [];
  if (Array.isArray(comments)) {
    commentList = comments;
  } else if (comments && typeof comments === 'object') {
    commentList = [comments];
  }

  // Populate "comment 1", "comment 2", etc. as requested by user
  commentList.forEach((c, idx) => {
    const key = `comment ${idx + 1}`;
    result[key] = c.content || (typeof c === 'string' ? c : '');
  });

  result.comments = commentList;
  return result;
}


export class FjtService {
  static async getBoardData(schema) {
    const [projects, epics, issues] = await Promise.all([
      FjtRepository.getProjects(schema),
      FjtRepository.getEpics(schema),
      FjtRepository.getIssues(schema)
    ]);

    // Format issues to match frontend expected structure matched with erp.users
    const formattedIssues = issues.map(i => {
      const empName = i.user_full_name || i.assignee_name || (i.user_email ? i.user_email.split('@')[0] : null);
      const empInitials = i.assignee_initials || (empName ? empName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U');
      
      const assigneeObj = (i.user_id || empName) ? {
        id: String(i.user_id || i.assignee_id || ''),
        name: empName || 'Unassigned',
        email: i.user_email || undefined,
        initials: empInitials
      } : undefined;

      // Safely parse raw_data
      let rawData = i.raw_data;
      if (typeof rawData === 'string') {
        try {
          rawData = JSON.parse(rawData);
        } catch {
          rawData = {};
        }
      }
      if (!rawData || typeof rawData !== 'object') {
        rawData = {};
      }

      // Parse comments from raw_data
      let issueComments = [];
      if (Array.isArray(rawData.comments)) {
        issueComments = rawData.comments;
      } else if (Array.isArray(rawData)) {
        issueComments = rawData;
      } else {
        const keys = Object.keys(rawData).filter(k => /^comment\s*\d+/i.test(k)).sort();
        if (keys.length > 0) {
          issueComments = keys.map((k, idx) => ({
            id: `comment-${idx + 1}`,
            authorName: i.assignee_name || 'User',
            authorInitials: i.assignee_initials || 'U',
            content: typeof rawData[k] === 'string' ? rawData[k] : (rawData[k]?.content || JSON.stringify(rawData[k])),
            createdAt: i.updated_at || i.created_at
          }));
        }
      }

      let assigneesList = [];
      if (Array.isArray(rawData.assignees) && rawData.assignees.length > 0) {
        assigneesList = rawData.assignees.map(a => ({
          id: String(a.id || a.user_id || ''),
          name: a.name || a.full_name || a.email || 'User',
          email: a.email || '',
          initials: a.initials || (a.name || a.full_name ? (a.name || a.full_name).split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U')
        }));
      } else if (assigneeObj) {
        assigneesList = [assigneeObj];
      }

      return {
        id: i.id,
        numericId: i.numeric_id,
        key: i.key,
        projectKey: i.project_key,
        projectName: i.project_name,
        type: i.type,
        summary: i.summary,
        description: i.description,
        descriptionAuthor: rawData.descriptionAuthor || (i.reporter_user_name ? {
          id: String(i.reporter_user_id || i.reporter_id || ''),
          name: i.reporter_user_name,
          email: i.reporter_user_email,
          role: 'Author',
          initials: i.reporter_user_name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AU'
        } : undefined),
        descriptionCreatedAt: rawData.descriptionCreatedAt || i.updated_at || i.created_at,
        descriptionSaved: rawData.descriptionSaved !== undefined ? rawData.descriptionSaved : !!(i.description && i.description.trim()),
        comments: issueComments,
        raw_data: rawData,
        status: i.status,
        priority: i.priority,
        storyPoints: i.story_points,
        epicId: i.epic_id,
        epicKey: i.epic_key,
        epicName: i.epic_name,
        epicColor: i.epic_color,
        storyId: i.story_id,
        storyKey: i.story_key,
        storySummary: i.story_summary,
        linkedTaskId: i.linked_task_id,
        linkedTaskKey: i.linked_task_key,
        linkedTaskSummary: i.linked_task_summary,
        sprintId: i.sprint_id,
        assigneeId: i.assignee_id || i.user_id,
        assignee: assigneesList[0] || assigneeObj || null,
        assignees: assigneesList,
        reporterId: i.reporter_id,
        reporter: i.reporter_user_name ? {
          id: String(i.reporter_user_id || i.reporter_id || ''),
          name: i.reporter_user_name,
          email: i.reporter_user_email
        } : undefined,
        startDate: i.start_date ? new Date(i.start_date).toISOString().split('T')[0] : undefined,
        endDate: i.end_date ? new Date(i.end_date).toISOString().split('T')[0] : undefined,
        labels: typeof i.labels === 'string' ? JSON.parse(i.labels) : (i.labels || []),
        createdAt: i.created_at,
        updatedAt: i.updated_at
      };
    });

    const formattedEpics = epics.map(e => ({
      id: e.id,
      key: e.key,
      epicName: e.epic_name,
      name: e.epic_name,
      epic_name: e.epic_name,
      summary: e.summary,
      color: e.color,
      status: e.status,
      startDate: e.start_date ? new Date(e.start_date).toISOString().split('T')[0] : undefined,
      dueDate: e.due_date ? new Date(e.due_date).toISOString().split('T')[0] : undefined,
      reporterId: e.reporter_id,
      reporter: e.reporter_name ? {
        id: String(e.reporter_id || ''),
        name: e.reporter_name,
        email: e.reporter_email
      } : undefined,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));

    const formattedProjects = projects.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      category: p.category,
      leadUserId: p.lead_user_id,
      lead: p.lead_name || (p.lead && p.lead !== 'Free Tech' ? p.lead : '-'),
      leadEmail: p.lead_email,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return {
      projects: formattedProjects,
      epics: formattedEpics,
      sprints: [],
      issues: formattedIssues
    };
  }

  static async createIssue(schema, data) {
    const projectKey = data.projectKey || data.project_key || 'FJT';
    const projectName = data.projectName || data.project_name || 'Free Jira Training (FJT)';
    const type = data.type || 'task';
    const key = data.key || await FjtRepository.getNextIssueKey(schema, projectKey, type);
    
    const assignees = Array.isArray(data.assignees) ? data.assignees : (data.assignee ? [data.assignee] : []);
    const assignee = assignees[0] || data.assignee;
    const assigneeName = assignees.length > 0 ? assignees.map(a => a.name || a.full_name).join(', ') : (assignee?.name !== undefined ? assignee.name : (typeof assignee === 'string' ? assignee : data.assigneeName));
    const assigneeInitials = assignees[0]?.initials || (assignees[0]?.name ? assignees[0].name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : (assignee?.initials || (assigneeName ? assigneeName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U')));
    const assigneeId = isValidUuid(data.assignee_id || assignee?.id) ? (data.assignee_id || assignee?.id) : null;

    let rawData = data.raw_data || {};
    if (data.comments) {
      rawData = formatRawData(data.comments, rawData);
    }
    if (data.assignees !== undefined) {
      rawData = { ...rawData, assignees: Array.isArray(data.assignees) ? data.assignees : [] };
    }
    if (data.descriptionAuthor !== undefined || data.descriptionCreatedAt !== undefined || data.descriptionSaved !== undefined) {
      rawData = {
        ...rawData,
        descriptionAuthor: data.descriptionAuthor !== undefined ? data.descriptionAuthor : rawData.descriptionAuthor,
        descriptionCreatedAt: data.descriptionCreatedAt !== undefined ? data.descriptionCreatedAt : rawData.descriptionCreatedAt,
        descriptionSaved: data.descriptionSaved !== undefined ? data.descriptionSaved : rawData.descriptionSaved
      };
    }

    const payload = {
      key,
      project_key: projectKey,
      project_name: projectName,
      type,
      summary: data.summary,
      description: data.description || '',
      status: data.status || 'to_do',
      priority: data.priority || 'medium',
      story_points: data.storyPoints ? parseInt(data.storyPoints, 10) : null,
      epic_id: isValidUuid(data.epicId) ? data.epicId : null,
      epic_key: data.epicKey || null,
      epic_name: data.epicName || null,
      epic_color: data.epicColor || null,
      story_id: isValidUuid(data.storyId) ? data.storyId : null,
      story_key: data.storyKey || null,
      story_summary: data.storySummary || null,
      linked_task_id: isValidUuid(data.linkedTaskId) ? data.linkedTaskId : null,
      sprint_id: isValidUuid(data.sprintId) ? data.sprintId : null,
      assignee_id: assigneeId,
      assignee_name: assigneeName || null,
      assignee_initials: assigneeInitials || null,
      reporter_id: isValidUuid(data.reporterId || data.reporter_id) ? (data.reporterId || data.reporter_id) : null,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      labels: data.labels || [],
      metadata: data.metadata || {},
      raw_data: rawData
    };

    const row = await FjtRepository.createIssue(schema, payload);
    return row;
  }

  static async updateIssue(schema, id, data) {
    const hasAssigneesArray = data.assignees !== undefined;
    const assignees = hasAssigneesArray ? (Array.isArray(data.assignees) ? data.assignees : []) : undefined;
    const assignee = hasAssigneesArray ? (assignees && assignees[0] ? assignees[0] : null) : data.assignee;
    
    let assigneeName;
    if (hasAssigneesArray) {
      assigneeName = assignees && assignees.length > 0 ? assignees.map(a => a.name || a.full_name).join(', ') : null;
    } else {
      assigneeName = assignee?.name !== undefined ? assignee.name : (typeof assignee === 'string' ? assignee : (data.assigneeName !== undefined ? data.assigneeName : undefined));
    }

    let assigneeInitials;
    if (hasAssigneesArray) {
      assigneeInitials = assignees && assignees[0] ? (assignees[0].initials || (assignees[0].name ? assignees[0].name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U')) : null;
    } else {
      assigneeInitials = assignee?.initials !== undefined ? assignee.initials : (assigneeName ? assigneeName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : (assigneeName === null ? null : undefined));
    }

    const rawAssigneeId = hasAssigneesArray ? (assignees && assignees[0] ? assignees[0].id : null) : (data.assignee_id !== undefined ? data.assignee_id : (data.assigneeId !== undefined ? data.assigneeId : (assignee?.id)));
    const assigneeId = rawAssigneeId === null || rawAssigneeId === '' ? null : (isValidUuid(rawAssigneeId) ? rawAssigneeId : undefined);

    let rawData = data.raw_data !== undefined ? data.raw_data : undefined;
    if (data.comments !== undefined) {
      rawData = formatRawData(data.comments, rawData || {});
    }
    if (data.assignees !== undefined) {
      rawData = { ...(rawData || {}), assignees: Array.isArray(data.assignees) ? data.assignees : [] };
    }
    if (data.descriptionAuthor !== undefined || data.descriptionCreatedAt !== undefined || data.descriptionSaved !== undefined) {
      rawData = {
        ...(rawData || {}),
        descriptionAuthor: data.descriptionAuthor !== undefined ? data.descriptionAuthor : (rawData?.descriptionAuthor),
        descriptionCreatedAt: data.descriptionCreatedAt !== undefined ? data.descriptionCreatedAt : (rawData?.descriptionCreatedAt),
        descriptionSaved: data.descriptionSaved !== undefined ? data.descriptionSaved : (rawData?.descriptionSaved)
      };
    }

    const payload = {
      summary: data.summary,
      description: data.description,
      status: data.status,
      priority: data.priority,
      story_points: data.storyPoints === null || data.storyPoints === '' || data.storyPoints === 'none' ? null : (data.storyPoints !== undefined ? parseInt(data.storyPoints, 10) : undefined),
      epic_id: data.epicId === null || data.epicId === '' || data.epicId === 'none' ? null : (isValidUuid(data.epicId) ? data.epicId : undefined),
      epic_key: data.epicKey === null || data.epicKey === '' ? null : data.epicKey,
      epic_name: data.epicName === null || data.epicName === '' ? null : data.epicName,
      epic_color: data.epicColor === null || data.epicColor === '' ? null : data.epicColor,
      story_id: data.storyId === null || data.storyId === '' || data.storyId === 'none' ? null : (isValidUuid(data.storyId) ? data.storyId : undefined),
      story_key: data.storyKey === null || data.storyKey === '' ? null : data.storyKey,
      story_summary: data.storySummary === null || data.storySummary === '' ? null : data.storySummary,
      linked_task_id: data.linkedTaskId === null || data.linkedTaskId === '' || data.linkedTaskId === 'none' ? null : (isValidUuid(data.linkedTaskId) ? data.linkedTaskId : undefined),
      sprint_id: data.sprintId === null || data.sprintId === '' || data.sprintId === 'none' ? null : (isValidUuid(data.sprintId) ? data.sprintId : undefined),
      assignee_id: assigneeId,
      assignee_name: assigneeName === null ? null : assigneeName,
      assignee_initials: assigneeInitials === null ? null : assigneeInitials,
      reporter_id: isValidUuid(data.reporterId || data.reporter_id) ? (data.reporterId || data.reporter_id) : undefined,
      start_date: data.startDate === null || data.startDate === '' ? null : data.startDate,
      end_date: data.endDate === null || data.endDate === '' ? null : data.endDate,
      labels: data.labels,
      metadata: data.metadata,
      raw_data: rawData
    };

    return await FjtRepository.updateIssue(schema, id, payload);
  }

  static async deleteIssue(schema, id) {
    return await FjtRepository.deleteIssue(schema, id);
  }

  static async createEpic(schema, data) {
    const projectKey = data.projectKey || data.project_key || 'FJT';
    const key = data.key || await FjtRepository.getNextEpicKey(schema, projectKey);
    const summary = data.summary || data.epic_name || data.epicName || 'Epic';
    const epicName = data.epic_name || data.epicName || summary;

    const row = await FjtRepository.createEpic(schema, {
      ...data,
      key,
      summary,
      epic_name: epicName
    });

    return {
      id: row.id,
      key: row.key,
      epicName: row.epic_name,
      name: row.epic_name,
      epic_name: row.epic_name,
      summary: row.summary,
      color: row.color,
      status: row.status,
      startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : undefined,
      dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updateEpic(schema, id, data) {
    const row = await FjtRepository.updateEpic(schema, id, data);
    if (!row) return null;
    return {
      id: row.id,
      key: row.key,
      epicName: row.epic_name,
      name: row.epic_name,
      epic_name: row.epic_name,
      summary: row.summary,
      color: row.color,
      status: row.status,
      startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : undefined,
      dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async createSprint(schema, data) {
    return await FjtRepository.createSprint(schema, data);
  }

  static async updateSprint(schema, id, data) {
    return await FjtRepository.updateSprint(schema, id, data);
  }

  static async createProject(schema, data) {
    return await FjtRepository.createProject(schema, data);
  }
}
