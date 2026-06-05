import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Calendar, Briefcase, Code, Flame } from "lucide-react";
import { format } from "date-fns";
import type { EmployeeProfile } from "@/sdk/features/profiles";
import { getInitials, calculateYearsAtCompany, calculateProfileCompleteness, getBurnoutLevel, getProfileStatus } from "../utils";

interface ProfileCardProps {
  profile: EmployeeProfile;
  onClick: () => void;
}

/**
 * Profile Card Component for Grid View
 */
export const ProfileCard = ({ profile, onClick }: ProfileCardProps) => {
  const yearsAtCompany = calculateYearsAtCompany(profile.join_date, profile.created_at);
  const completeness = calculateProfileCompleteness(profile);
  const status = getProfileStatus(profile);

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {getInitials(profile.full_name || profile.email)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl mb-1 truncate">
                {profile.full_name || profile.email}
              </CardTitle>
              <p className="text-sm text-gray-500 capitalize">{profile.job_title || profile.role || 'employee'}</p>
              {profile.department && (
                <p className="text-xs text-gray-400 mt-1">{profile.department}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span className={`px-2 py-1 text-xs rounded-full ${
              status === 'ex-employee' 
                ? 'bg-red-100 text-red-800' 
                : status === 'onboarding'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {status === 'ex-employee' 
                ? 'Ex-Employee' 
                : status === 'onboarding'
                ? 'Onboarding'
                : 'Active'}
            </span>
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <span>{completeness}%</span>
              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Burnout Score */}
        {profile.burnout_score !== undefined && profile.burnout_score !== null && (
          <div className="flex items-center justify-between p-2 rounded-md bg-gray-50">
            <div className="flex items-center space-x-2">
              <Flame className={`h-4 w-4 ${getBurnoutLevel(profile.burnout_score).color}`} />
              <span className="text-xs text-gray-600">Burnout Risk</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-semibold ${getBurnoutLevel(profile.burnout_score).color}`}>
                {profile.burnout_score}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${getBurnoutLevel(profile.burnout_score).bgColor} ${getBurnoutLevel(profile.burnout_score).color}`}>
                {getBurnoutLevel(profile.burnout_score).level}
              </span>
            </div>
          </div>
        )}
        {/* Contact Information */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 truncate">{profile.email}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{profile.phone}</span>
            </div>
          )}
        </div>

        {/* Join Date & Experience */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          {profile.join_date && (
            <div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                <Calendar className="h-3 w-3" />
                <span>Joined</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {format(new Date(profile.join_date), "MMM yyyy")}
              </p>
              <p className="text-xs text-gray-500">
                {yearsAtCompany.toFixed(1)} years
              </p>
            </div>
          )}
          {profile.experience_years && (
            <div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                <Briefcase className="h-3 w-3" />
                <span>Experience</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {profile.experience_years} years
              </p>
            </div>
          )}
        </div>

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
              <Code className="h-3 w-3" />
              <span>Top Skills</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.skills.slice(0, 3).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
                >
                  {skill}
                </span>
              ))}
              {profile.skills.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
                  +{profile.skills.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

