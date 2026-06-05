import type { EmployeeProfile } from "@/sdk/features/profiles";

/**
 * Get initials from a name string
 */
export const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Calculate years at company
 */
export const calculateYearsAtCompany = (joinDate: string | null, createdDate: string): number => {
  if (joinDate) {
    const join = new Date(joinDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - join.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = (diffDays / 365).toFixed(1);
    return parseFloat(years);
  }
  const created = new Date(createdDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = (diffDays / 365).toFixed(1);
  return parseFloat(years);
};

/**
 * Calculate profile completeness percentage
 */
export const calculateProfileCompleteness = (profile: EmployeeProfile): number => {
  const fields = [
    profile.full_name,
    profile.email,
    profile.phone,
    profile.job_title,
    profile.department,
    profile.join_date,
    profile.experience_years,
    profile.skills?.length > 0,
    profile.bio,
  ];
  const filled = fields.filter(f => f !== null && f !== undefined && f !== '').length;
  return Math.round((filled / fields.length) * 100);
};

/**
 * Get burnout level information
 */
export const getBurnoutLevel = (score: number | undefined | null): { level: string; color: string; bgColor: string } => {
  if (!score && score !== 0) return { level: 'Not Set', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  if (score <= 30) return { level: 'Low', color: 'text-green-700', bgColor: 'bg-green-100' };
  if (score <= 60) return { level: 'Moderate', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
  if (score <= 80) return { level: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' };
  return { level: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' };
};

/**
 * Get profile status
 */
export const getProfileStatus = (profile: EmployeeProfile): string => {
  if (profile.role === 'ex-employee') return 'ex-employee';
  if (!profile.join_date || new Date(profile.join_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
    return 'onboarding';
  }
  return 'active';
};

