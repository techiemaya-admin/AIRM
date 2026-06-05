-- Fix issue comment trigger - issue_id is INTEGER, not UUID
-- This fixes the "cannot cast type integer to uuid" error when adding comments
-- Run this in your PostgreSQL database connected to salesmaya_agent

SET search_path TO erp, public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_issue_comment ON issue_comments;
DROP TRIGGER IF EXISTS on_issue_comment ON issue_comments;

-- Drop and recreate the trigger function with correct type handling
DROP FUNCTION IF EXISTS notify_issue_comment();

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
  -- Get issue details
  SELECT title, created_by INTO issue_title, issue_creator FROM issues WHERE id = NEW.issue_id;
  
  -- Get commenter email
  SELECT email INTO commenter_email FROM users WHERE id = NEW.user_id;
  
  -- Notify all assignees (except the commenter)
  FOR assignee_record IN 
    SELECT user_id FROM issue_assignees WHERE issue_id = NEW.issue_id AND user_id != NEW.user_id
  LOOP
    -- Create in-app notification
    -- Note: related_id is UUID, but issue_id is INTEGER, so we pass NULL
    -- The link contains the issue_id which is sufficient for navigation
    PERFORM create_notification(
      assignee_record.user_id,
      'New Comment on Issue',
      commenter_email || ' commented on: ' || issue_title,
      'issue_comment',
      '/issues/' || NEW.issue_id::text,
      NULL  -- Pass NULL instead of trying to cast integer to UUID
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
        '/issues/' || NEW.issue_id::text,
        NULL  -- Pass NULL instead of trying to cast integer to UUID
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_issue_comment
  AFTER INSERT ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_issue_comment();

-- Verify the trigger exists
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing as timing,
  event_manipulation as event
FROM information_schema.triggers
WHERE event_object_schema = 'erp'
  AND event_object_table = 'issue_comments'
  AND trigger_name = 'trigger_notify_issue_comment';

SELECT '✅ Issue comment trigger fixed! related_id will be NULL but link contains issue_id.' as status;

