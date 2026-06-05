import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";

type FilterStatus = "all" | "active" | "onboarding" | "ex-employee";
type SortOption = "name" | "join_date" | "experience" | "department";

interface ProfileFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchClick: () => void;
  filterDepartment: string;
  onDepartmentChange: (value: string) => void;
  filterRole: string;
  onRoleChange: (value: string) => void;
  filterStatus: FilterStatus;
  onStatusChange: (value: FilterStatus) => void;
  filterExperience: string;
  onExperienceChange: (value: string) => void;
  sortBy: SortOption;
  onSortByChange: (value: SortOption) => void;
  sortOrder: "asc" | "desc";
  onSortOrderToggle: () => void;
  departments: string[];
  roles: string[];
  totalProfiles: number;
  filteredCount: number;
}

/**
 * Profile Filters Component
 */
export const ProfileFilters = ({
  searchQuery,
  onSearchChange,
  onSearchClick,
  filterDepartment,
  onDepartmentChange,
  filterRole,
  onRoleChange,
  filterStatus,
  onStatusChange,
  filterExperience,
  onExperienceChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  departments,
  roles,
  totalProfiles,
  filteredCount,
}: ProfileFiltersProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or skill... (Cmd+K)"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onClick={onSearchClick}
                className="pl-10 cursor-pointer"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 hidden md:block">
                ⌘K
              </div>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={filterDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={filterRole}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => onStatusChange(e.target.value as FilterStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="ex-employee">Ex-Employee</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Experience Filter */}
          <div>
            <select
              value={filterExperience}
              onChange={(e) => onExperienceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Experience</option>
              <option value="0-2">0-2 years</option>
              <option value="2-5">2-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="10+">10+ years</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortOption)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="join_date">Sort by Join Date</option>
                <option value="experience">Sort by Experience</option>
                <option value="department">Sort by Department</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={onSortOrderToggle}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center text-sm text-gray-500">
            Showing {filteredCount} of {totalProfiles} employees
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

