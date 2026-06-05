import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import type { EmployeeProfile } from "@/sdk/features/profiles";
import { getInitials, calculateYearsAtCompany, getBurnoutLevel, getProfileStatus } from "../utils";

interface ProfileListItemProps {
  profile: EmployeeProfile;
  onClick: () => void;
}

/**
 * Profile List Item Component for List View
 */
export const ProfileListItem = ({ profile, onClick }: ProfileListItemProps) => {
  const yearsAtCompany = calculateYearsAtCompany(profile.join_date, profile.created_at);
  const burnout = getBurnoutLevel(profile.burnout_score);
  const status = getProfileStatus(profile);

  return (
    <tr 
      className="hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm font-semibold">
              {getInitials(profile.full_name || profile.email)}
            </div>
          )}
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {profile.full_name || profile.email}
            </div>
            {profile.job_title && (
              <div className="text-sm text-gray-500">{profile.job_title}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 capitalize">{profile.role || 'N/A'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{profile.department || 'N/A'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs rounded-full ${
          status === 'ex-employee' 
            ? 'bg-red-100 text-red-800' 
            : status === 'onboarding'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {status === 'ex-employee' ? 'Ex-Employee' : status === 'onboarding' ? 'Onboarding' : 'Active'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {profile.burnout_score !== undefined && profile.burnout_score !== null ? (
          <div className="flex items-center space-x-2">
            <Flame className={`h-4 w-4 ${burnout.color}`} />
            <span className={`text-sm font-medium ${burnout.color}`}>
              {profile.burnout_score}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${burnout.bgColor} ${burnout.color}`}>
              {burnout.level}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Not Set</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {profile.experience_years ? `${profile.experience_years} years` : 'N/A'}
        </div>
        {profile.join_date && (
          <div className="text-xs text-gray-500">
            {yearsAtCompany.toFixed(1)} years at company
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{profile.email}</div>
      </td>
    </tr>
  );
};

