import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
                className="pl-10 cursor-pointer border-gray-300 focus:border-[#0B1957] focus:ring-[#0B1957]/20"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 hidden md:block">
                ⌘K
              </div>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <Select value={filterDepartment} onValueChange={onDepartmentChange}>
              <SelectTrigger className="w-full text-sm font-medium border-gray-300 focus:border-[#0B1957] focus:ring-[#0B1957]/20">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Filter */}
          <div>
            <Select value={filterRole} onValueChange={onRoleChange}>
              <SelectTrigger className="w-full text-sm font-medium border-gray-300 focus:border-[#0B1957] focus:ring-[#0B1957]/20">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={filterStatus}
              onValueChange={(val) => onStatusChange(val as FilterStatus)}
            >
              <SelectTrigger className="w-full text-sm font-medium border-gray-300 focus:border-[#0B1957] focus:ring-[#0B1957]/20">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="ex-employee">Ex-Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Experience Filter */}
          <div>
            <Select
              value={filterExperience}
              onValueChange={onExperienceChange}
            >
              <SelectTrigger className="w-full text-sm font-medium border-gray-300 focus:border-[#0B1957] focus:ring-[#0B1957]/20">
                <SelectValue placeholder="All Experience" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="all">All Experience</SelectItem>
                <SelectItem value="0-2">0-2 years</SelectItem>
                <SelectItem value="2-5">2-5 years</SelectItem>
                <SelectItem value="5-10">5-10 years</SelectItem>
                <SelectItem value="10+">10+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <Select
                value={sortBy}
                onValueChange={(val) => onSortByChange(val as SortOption)}
              >
                <SelectTrigger className="flex-1 text-sm font-medium border-gray-300 focus:border-[#0B1957] focus:ring-[#0B1957]/20">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="join_date">Sort by Join Date</SelectItem>
                  <SelectItem value="experience">Sort by Experience</SelectItem>
                  <SelectItem value="department">Sort by Department</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={onSortOrderToggle}
                className="hover:border-[#0B1957]"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
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

