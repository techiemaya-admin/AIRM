-- ==========================================================
-- LAD Feature Schema: FJT Agile Board (Jira Clone)
-- User-Centric Schema aligned with erp.users
-- ==========================================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS erp.fjt_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Software',
    lead_user_id UUID, -- Matches erp.users(id)
    lead VARCHAR(255) DEFAULT '-',
    created_by UUID, -- Matches erp.users(id)
    metadata JSONB NOT NULL DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fjt_projects_deleted ON erp.fjt_projects(is_deleted);

-- 2. Epics Table
CREATE TABLE IF NOT EXISTS erp.fjt_epics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) NOT NULL UNIQUE,
    epic_name VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    color VARCHAR(30) NOT NULL DEFAULT '#ea580c',
    status VARCHAR(50) NOT NULL DEFAULT 'to_do',
    start_date DATE,
    due_date DATE,
    reporter_id UUID, -- Matches erp.users(id)
    metadata JSONB NOT NULL DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fjt_epics_deleted ON erp.fjt_epics(is_deleted);

-- 3. Issues Table (Hierarchy: Epic -> Story -> Task / Bug)
CREATE TABLE IF NOT EXISTS erp.fjt_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numeric_id SERIAL,
    key VARCHAR(50) NOT NULL UNIQUE,
    project_key VARCHAR(50) NOT NULL DEFAULT 'FJT',
    project_name VARCHAR(255) NOT NULL DEFAULT 'Free Jira Training (FJT)',
    type VARCHAR(50) NOT NULL, -- 'epic', 'story', 'task', 'bug'
    summary TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'to_do', -- 'to_do', 'in_progress', 'done'
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- 'highest', 'high', 'medium', 'low', 'lowest'
    story_points INTEGER,
    epic_id UUID REFERENCES erp.fjt_epics(id) ON DELETE SET NULL,
    epic_key VARCHAR(50),
    epic_name VARCHAR(255),
    epic_color VARCHAR(30),
    story_id UUID REFERENCES erp.fjt_issues(id) ON DELETE SET NULL,
    story_key VARCHAR(50),
    story_summary TEXT,
    linked_task_id UUID REFERENCES erp.fjt_issues(id) ON DELETE SET NULL,
    assignee_id UUID, -- Matches erp.users(id)
    assignee_name VARCHAR(255),
    assignee_initials VARCHAR(10),
    reporter_id UUID, -- Matches erp.users(id)
    start_date DATE,
    end_date DATE,
    labels JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    raw_data JSONB NOT NULL DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fjt_issues_deleted ON erp.fjt_issues(is_deleted);
CREATE INDEX IF NOT EXISTS idx_fjt_issues_epic ON erp.fjt_issues(epic_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_fjt_issues_story ON erp.fjt_issues(story_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_fjt_issues_assignee ON erp.fjt_issues(assignee_id) WHERE is_deleted = false;
