import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { EmployeeProfile } from "@/sdk/features/profiles";
import { getInitials } from "../utils";

interface ProfileSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  profiles: EmployeeProfile[];
  onProfileSelect: (profile: EmployeeProfile) => void;
}

/**
 * Profile Search Modal Component (Cmd+K)
 */
export const ProfileSearchModal = ({
  open,
  onOpenChange,
  searchQuery,
  onSearchChange,
  profiles,
  onProfileSelect,
}: ProfileSearchModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Employees</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, skill, or project..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          {searchQuery && (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {profiles.slice(0, 10).map((profile) => (
                <div
                  key={profile.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => onProfileSelect(profile)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm font-semibold">
                      {getInitials(profile.full_name || profile.email)}
                    </div>
                    <div>
                      <p className="font-medium">{profile.full_name || profile.email}</p>
                      <p className="text-sm text-gray-500">
                        {profile.job_title || profile.role} {profile.department && `• ${profile.department}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {profiles.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No results found</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

