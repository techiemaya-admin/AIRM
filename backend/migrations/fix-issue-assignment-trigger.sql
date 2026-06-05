-- Fix issue assignment trigger - issue_id is INTEGER, not UUID
-- This fixes the "cannot cast type integer to uuid" error
-- Run this in your PostgreSQL database connected to salesmaya_agent

SET search_path TO erp, public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_issue_assignment ON issue_assignees;

-- Drop and recreate the trigger function with correct type handling
DROP FUNCTION IF EXISTS notify_user_issue_assignment();

CREATE OR REPLACE FUNCTION notify_user_issue_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  issue_title TEXT;
BEGIN
  -- Get issue title
  SELECT title INTO issue_title FROM issues WHERE id = NEW.issue_id;
  
  -- Create in-app notification
  -- Note: related_id is UUID, but issue_id is INTEGER, so we pass NULL
  -- The link contains the issue_id which is sufficient for navigation
  PERFORM create_notification(
    NEW.user_id,
    'Assigned to Issue',
    'You have been assigned to issue: ' || issue_title,
    'issue_assigned',
    '/issues/' || NEW.issue_id::text,
    NULL  -- Pass NULL instead of trying to cast integer to UUID
  );
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_issue_assignment
  AFTER INSERT ON issue_assignees
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_issue_assignment();

-- Verify the trigger exists
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing as timing,
  event_manipulation as event
FROM information_schema.triggers
WHERE event_object_schema = 'erp'
  AND event_object_table = 'issue_assignees'
  AND trigger_name = 'trigger_notify_issue_assignment';

SELECT '✅ Issue assignment trigger fixed! related_id will be NULL but link contains issue_id.' as status;

