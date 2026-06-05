-- =====================================================
-- PostgreSQL Migration Script for Timesheet System
-- Creates all necessary tables, functions, and triggers
-- Uses ERP schema in PostgreSQL database
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ERP schema
CREATE SCHEMA IF NOT EXISTS erp;
SET search_path TO erp, public;

-- =====================================================
-- 1. CORE TABLES (No dependencies)
-- =====================================================

-- Users table (replaces auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Profiles table (user profile information)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. TIMESHEET SYSTEM TABLES
-- =====================================================

-- Time clock table (tracks clock in/out)
CREATE TABLE IF NOT EXISTS time_clock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  notes TEXT,
  total_hours NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'clocked_in' CHECK (status IN ('clocked_in', 'paused', 'clocked_out')),
  issue_id INTEGER, -- Will reference issues table later
  project_name TEXT,
  pause_start TIMESTAMPTZ,
  paused_duration NUMERIC(10, 2) DEFAULT 0, -- Total paused time in hours
  pause_reason TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  location_timestamp TIMESTAMPTZ,
  location_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Timesheets table (weekly containers)
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Timesheet entries table
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  project TEXT NOT NULL,
  task TEXT NOT NULL,
  source TEXT DEFAULT 'time_clock',
  mon_hours NUMERIC(10, 2) DEFAULT 0,
  tue_hours NUMERIC(10, 2) DEFAULT 0,
  wed_hours NUMERIC(10, 2) DEFAULT 0,
  thu_hours NUMERIC(10, 2) DEFAULT 0,
  fri_hours NUMERIC(10, 2) DEFAULT 0,
  sat_hours NUMERIC(10, 2) DEFAULT 0,
  sun_hours NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(timesheet_id, project, task, source)
);

-- =====================================================
-- 3. ISSUES SYSTEM TABLES
-- =====================================================

-- Labels table
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Sprints/Projects table
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  project_name TEXT,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Issue assignees table (many-to-many)
CREATE TABLE IF NOT EXISTS issue_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(issue_id, user_id)
);

-- Issue labels table (many-to-many)
CREATE TABLE IF NOT EXISTS issue_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(issue_id, label_id)
);

-- Issue comments table
CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Issue activity table (for timeline)
CREATE TABLE IF NOT EXISTS issue_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update time_clock to reference issues
ALTER TABLE time_clock 
  ADD CONSTRAINT time_clock_issue_id_fkey 
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE SET NULL;

-- =====================================================
-- 4. LEAVE CALENDAR SYSTEM TABLES
-- =====================================================

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('pto', 'sick', 'vacation', 'personal', 'unpaid')),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- =====================================================
-- 5. NOTIFICATIONS SYSTEM TABLES
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('issue_assigned', 'issue_comment', 'leave_request', 'leave_approved', 'leave_rejected', 'mention', 'general', 'clock_in')),
  link TEXT,
  related_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  notification_type TEXT,
  related_id UUID,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  retry_count INTEGER DEFAULT 0
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Time clock indexes
CREATE INDEX IF NOT EXISTS idx_time_clock_user_id ON time_clock(user_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_status ON time_clock(status);
CREATE INDEX IF NOT EXISTS idx_time_clock_clock_in ON time_clock(clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_time_clock_issue_id ON time_clock(issue_id);

-- Timesheets indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_user_week ON timesheets(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet_id ON timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_unique_combo ON timesheet_entries(timesheet_id, project, task, source);

-- Issues indexes
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON issues(created_by);
CREATE INDEX IF NOT EXISTS idx_issues_sprint_id ON issues(sprint_id);
CREATE INDEX IF NOT EXISTS idx_issue_assignees_user_id ON issue_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_assignees_issue_id ON issue_assignees(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_labels_issue_id ON issue_labels(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_activity_issue_id ON issue_activity(issue_id);

-- Leave requests indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Email queue indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_sent ON email_queue(sent, created_at);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_link TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, p_related_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to get or create timesheet
CREATE OR REPLACE FUNCTION get_or_create_timesheet(
  p_user_id UUID,
  p_week_start DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_timesheet_id UUID;
  v_week_end DATE;
BEGIN
  v_week_end := p_week_start + INTERVAL '6 days';
  
  INSERT INTO timesheets (user_id, week_start, week_end, status)
  VALUES (p_user_id, p_week_start, v_week_end, 'draft')
  ON CONFLICT (user_id, week_start) 
  DO UPDATE SET week_end = EXCLUDED.week_end
  RETURNING id INTO v_timesheet_id;
  
  RETURN v_timesheet_id;
EXCEPTION
  WHEN OTHERS THEN
    SELECT id INTO v_timesheet_id
    FROM timesheets
    WHERE user_id = p_user_id
      AND week_start = p_week_start
    LIMIT 1;
    
    IF v_timesheet_id IS NULL THEN
      RAISE EXCEPTION 'Failed to get or create timesheet: %', SQLERRM;
    END IF;
    
    RETURN v_timesheet_id;
END;
$$;

-- Function to add timesheet entry
CREATE OR REPLACE FUNCTION add_timesheet_entry(
  p_timesheet_id UUID,
  p_project TEXT,
  p_task TEXT,
  p_day_column TEXT,
  p_hours NUMERIC,
  p_source TEXT DEFAULT 'time_clock'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  IF p_day_column NOT IN ('mon_hours', 'tue_hours', 'wed_hours', 'thu_hours', 'fri_hours', 'sat_hours', 'sun_hours') THEN
    RAISE EXCEPTION 'Invalid day column: %', p_day_column;
  END IF;

  INSERT INTO timesheet_entries (
    timesheet_id,
    project,
    task,
    source,
    mon_hours,
    tue_hours,
    wed_hours,
    thu_hours,
    fri_hours,
    sat_hours,
    sun_hours
  ) VALUES (
    p_timesheet_id,
    p_project,
    p_task,
    p_source,
    CASE WHEN p_day_column = 'mon_hours' THEN p_hours ELSE 0 END,
    CASE WHEN p_day_column = 'tue_hours' THEN p_hours ELSE 0 END,
    CASE WHEN p_day_column = 'wed_hours' THEN p_hours ELSE 0 END,
    CASE WHEN p_day_column = 'thu_hours' THEN p_hours ELSE 0 END,
    CASE WHEN p_day_column = 'fri_hours' THEN p_hours ELSE 0 END,
    CASE WHEN p_day_column = 'sat_hours' THEN p_hours ELSE 0 END,
    CASE WHEN p_day_column = 'sun_hours' THEN p_hours ELSE 0 END
  )
  ON CONFLICT (timesheet_id, project, task, source) 
  DO UPDATE SET
    mon_hours = CASE 
      WHEN p_day_column = 'mon_hours' THEN timesheet_entries.mon_hours + EXCLUDED.mon_hours
      ELSE timesheet_entries.mon_hours
    END,
    tue_hours = CASE 
      WHEN p_day_column = 'tue_hours' THEN timesheet_entries.tue_hours + EXCLUDED.tue_hours
      ELSE timesheet_entries.tue_hours
    END,
    wed_hours = CASE 
      WHEN p_day_column = 'wed_hours' THEN timesheet_entries.wed_hours + EXCLUDED.wed_hours
      ELSE timesheet_entries.wed_hours
    END,
    thu_hours = CASE 
      WHEN p_day_column = 'thu_hours' THEN timesheet_entries.thu_hours + EXCLUDED.thu_hours
      ELSE timesheet_entries.thu_hours
    END,
    fri_hours = CASE 
      WHEN p_day_column = 'fri_hours' THEN timesheet_entries.fri_hours + EXCLUDED.fri_hours
      ELSE timesheet_entries.fri_hours
    END,
    sat_hours = CASE 
      WHEN p_day_column = 'sat_hours' THEN timesheet_entries.sat_hours + EXCLUDED.sat_hours
      ELSE timesheet_entries.sat_hours
    END,
    sun_hours = CASE 
      WHEN p_day_column = 'sun_hours' THEN timesheet_entries.sun_hours + EXCLUDED.sun_hours
      ELSE timesheet_entries.sun_hours
    END
  RETURNING id INTO v_entry_id;
  
  RETURN v_entry_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add timesheet entry: %', SQLERRM;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id AND read = false;
  
  RETURN unread_count;
END;
$$;

-- Function to get all leave requests with user emails
CREATE OR REPLACE FUNCTION get_all_leave_requests()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  start_date DATE,
  end_date DATE,
  leave_type TEXT,
  reason TEXT,
  status TEXT,
  requested_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.id,
    lr.user_id,
    COALESCE(u.email::TEXT, 'Unknown') as user_email,
    lr.start_date,
    lr.end_date,
    lr.leave_type,
    lr.reason,
    lr.status,
    lr.requested_at,
    lr.reviewed_by,
    lr.reviewed_at,
    lr.admin_notes,
    lr.created_at,
    lr.updated_at
  FROM leave_requests lr
  LEFT JOIN users u ON lr.user_id = u.id
  ORDER BY lr.created_at DESC;
END;
$$;

-- Function to get all users with roles
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(p.full_name, u.full_name) as full_name,
    COALESCE(ur.role, 'user') as role
  FROM users u
  LEFT JOIN profiles p ON u.id = p.id
  LEFT JOIN user_roles ur ON u.id = ur.user_id;
END;
$$;

-- =====================================================
-- 8. TRIGGER FUNCTIONS
-- =====================================================

-- Function to notify admins about leave requests
CREATE OR REPLACE FUNCTION notify_admins_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record RECORD;
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM users WHERE id = NEW.user_id;
  
  FOR admin_record IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    PERFORM create_notification(
      admin_record.user_id,
      'New Leave Request',
      user_email || ' has requested ' || NEW.leave_type || ' leave from ' || 
        NEW.start_date || ' to ' || NEW.end_date,
      'leave_request',
      '/leave-calendar',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to notify user about leave status change
CREATE OR REPLACE FUNCTION notify_user_leave_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM create_notification(
      NEW.user_id,
      'Leave Request ' || INITCAP(NEW.status),
      'Your ' || NEW.leave_type || ' leave request from ' || NEW.start_date || 
        ' to ' || NEW.end_date || ' has been ' || NEW.status,
      'leave_' || NEW.status,
      '/leave-calendar',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to notify user when assigned to an issue
CREATE OR REPLACE FUNCTION notify_user_issue_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  issue_title TEXT;
BEGIN
  SELECT title INTO issue_title FROM issues WHERE id = NEW.issue_id;
  
  PERFORM create_notification(
    NEW.user_id,
    'Assigned to Issue',
    'You have been assigned to issue: ' || issue_title,
    'issue_assigned',
    '/issues/' || NEW.issue_id,
    NEW.issue_id::UUID
  );
  
  RETURN NEW;
END;
$$;

-- Function to notify users about issue comments
CREATE OR REPLACE FUNCTION notify_issue_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  issue_title TEXT;
  assignee_record RECORD;
  commenter_email TEXT;
  issue_creator UUID;
BEGIN
  SELECT title, created_by INTO issue_title, issue_creator FROM issues WHERE id = NEW.issue_id;
  SELECT email INTO commenter_email FROM users WHERE id = NEW.user_id;
  
  -- Notify all assignees (except the commenter)
  FOR assignee_record IN 
    SELECT user_id FROM issue_assignees WHERE issue_id = NEW.issue_id AND user_id != NEW.user_id
  LOOP
    PERFORM create_notification(
      assignee_record.user_id,
      'New Comment on Issue',
      commenter_email || ' commented on: ' || issue_title,
      'issue_comment',
      '/issues/' || NEW.issue_id,
      NEW.issue_id::UUID
    );
  END LOOP;
  
  -- Notify issue creator if they're not the commenter and not already notified
  IF issue_creator IS NOT NULL AND issue_creator != NEW.user_id THEN
    IF NOT EXISTS (SELECT 1 FROM issue_assignees WHERE issue_id = NEW.issue_id AND user_id = issue_creator) THEN
      PERFORM create_notification(
        issue_creator,
        'New Comment on Your Issue',
        commenter_email || ' commented on: ' || issue_title,
        'issue_comment',
        '/issues/' || NEW.issue_id,
        NEW.issue_id::UUID
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 9. CREATE TRIGGERS
-- =====================================================

-- Leave request triggers
DROP TRIGGER IF EXISTS trigger_notify_leave_request ON leave_requests;
CREATE TRIGGER trigger_notify_leave_request
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admins_leave_request();

DROP TRIGGER IF EXISTS trigger_notify_leave_status ON leave_requests;
CREATE TRIGGER trigger_notify_leave_status
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_leave_status();

-- Issue assignment trigger
DROP TRIGGER IF EXISTS trigger_notify_issue_assignment ON issue_assignees;
CREATE TRIGGER trigger_notify_issue_assignment
  AFTER INSERT ON issue_assignees
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_issue_assignment();

-- Issue comment trigger
DROP TRIGGER IF EXISTS trigger_notify_issue_comment ON issue_comments;
CREATE TRIGGER trigger_notify_issue_comment
  AFTER INSERT ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_issue_comment();

-- =====================================================
-- 10. INSERT DEFAULT DATA
-- =====================================================

-- Insert default labels
INSERT INTO labels (name, color, description) VALUES
  ('Feature', '#0e8a16', 'New feature or request'),
  ('Bug', '#d73a4a', 'Something isn''t working'),
  ('Enhancement', '#a2eeef', 'Improvement to existing feature'),
  ('Documentation', '#0075ca', 'Documentation improvements'),
  ('Help Wanted', '#008672', 'Extra attention is needed'),
  ('Question', '#d876e3', 'Further information is requested'),
  ('Urgent', '#e99695', 'Needs immediate attention')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO postgres;
GRANT EXECUTE ON FUNCTION get_or_create_timesheet(UUID, DATE) TO postgres;
GRANT EXECUTE ON FUNCTION add_timesheet_entry(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION get_all_leave_requests() TO postgres;
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO postgres;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ PostgreSQL migration completed successfully!' as status;
SELECT 'Schema: erp' as schema_name;
SELECT COUNT(*) as tables_created FROM information_schema.tables WHERE table_schema = 'erp';
SELECT COUNT(*) as functions_created FROM information_schema.routines WHERE routine_schema = 'erp';

