export type Automation = {
  id: string;
  project_id: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  enabled: boolean;
  created_at: string;
};

export type CreateAutomationDTO = {
  trigger_type: string;
  trigger_config?: Record<string, any>;
  action_type: string;
  action_config?: Record<string, any>;
};
