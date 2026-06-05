import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import type { EmployeeProfile } from "@/sdk/features/profiles";
import { getInitials, calculateProfileCompleteness, getBurnoutLevel } from "../utils";

interface ProfileKanbanCardProps {
  profile: EmployeeProfile;
  onClick: () => void;
}

/**
 * Individual Kanban Card Component
 */
const ProfileKanbanCard = ({ profile, onClick }: ProfileKanbanCardProps) => {
  const completeness = calculateProfileCompleteness(profile);
  const burnout = getBurnoutLevel(profile.burnout_score);

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer bg-white"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {getInitials(profile.full_name || profile.email)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {profile.full_name || profile.email}
            </h4>
            <p className="text-xs text-gray-500 capitalize mt-0.5">
              {profile.job_title || profile.role || 'employee'}
            </p>
            {profile.department && (
              <p className="text-xs text-gray-400 mt-1">{profile.department}</p>
            )}
            {profile.burnout_score !== undefined && profile.burnout_score !== null && (
              <div className="flex items-center space-x-1 mt-2">
                <Flame className={`h-3 w-3 ${burnout.color}`} />
                <span className={`text-xs font-medium ${burnout.color}`}>
                  {profile.burnout_score} - {burnout.level}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-1 mt-2 text-xs text-gray-400">
              <span>{completeness}%</span>
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden max-w-[60px]">
                <div 
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ProfileKanbanViewProps {
  kanbanColumns: {
    active: EmployeeProfile[];
    onboarding: EmployeeProfile[];
    'ex-employee': EmployeeProfile[];
  };
  onProfileClick: (profileId: string) => void;
}

/**
 * Profile Kanban View Component
 */
export const ProfileKanbanView = ({ kanbanColumns, onProfileClick }: ProfileKanbanViewProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {(['active', 'onboarding', 'ex-employee'] as const).map((status) => (
        <div key={status} className="flex flex-col">
          <div className="bg-gray-50 px-4 py-3 rounded-t-lg border-b">
            <h3 className="text-sm font-semibold text-gray-700 uppercase">
              {status === 'ex-employee' ? 'Ex-Employee' : status === 'onboarding' ? 'Onboarding' : 'Active'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {kanbanColumns[status].length} employees
            </p>
          </div>
          <div className="bg-gray-50 rounded-b-lg p-4 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
            {kanbanColumns[status].map((profile) => (
              <ProfileKanbanCard
                key={profile.id}
                profile={profile}
                onClick={() => onProfileClick(profile.id)}
              />
            ))}
            {kanbanColumns[status].length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No employees in this status
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

