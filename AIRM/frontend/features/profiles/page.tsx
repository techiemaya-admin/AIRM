import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUsers } from "@/hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import JoiningForm from "../joining-form/JoiningForm";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
// LAD Architecture: Use SDK instead of direct API calls
import { useProfiles, useProfile, useProfileMutation, type EmployeeProfile as SDKEmployeeProfile } from "@/sdk/features/profiles";
import { useExitAssets } from "../exit-formalities/hooks/useExitFeatures";
import type { EmployeeAsset } from "../exit-formalities/types";
import { downloadTemplate, uploadProfileFile, uploadBatchProfiles } from "@sdk/profilesService";
import {
  User,
  Briefcase,
  ExternalLink,
  RefreshCw,
  Edit,
  Save,
  GraduationCap,
  Award,
  FileText,
  Plus,
  Download,
  Grid3x3,
  List,
  Columns,
  Flame,
  Package,
  Copy,
  Check,
  Trash2,
  Upload,
  ChevronDown,
  FileSpreadsheet,
  FileCheck,
  ScrollText,
  BadgeCheck,
  Image as ImageIcon,
  PenTool
} from "lucide-react";
import { format } from "date-fns";
import { PfManagementSection, ProfileCard, ProfileFilters, ProfileSearchModal, ProfileListView, ProfileKanbanView, ProfileDetailDialog } from "./components";
import { getInitials, getBurnoutLevel, getProfileStatus } from "./utils";
import { CardSkeleton } from "@/components/PageSkeletons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Use SDK types
type EmployeeProfile = SDKEmployeeProfile;

type SortOption = 'name' | 'join_date' | 'experience' | 'department';
type FilterStatus = 'all' | 'active' | 'onboarding' | 'ex-employee';
type ViewMode = 'grid' | 'list' | 'kanban';

interface ProfilesProps {
  onlyCurrentUser?: boolean;
  hideHeader?: boolean;
  noPadding?: boolean;
}

const Profiles = ({ onlyCurrentUser = false, hideHeader = false, noPadding = false }: ProfilesProps) => {
  const { id: profileId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // LAD Architecture: Use SDK hooks
  const { data: profiles = [], isLoading: loading, error: profilesError, refetch: refetchProfiles } = useProfiles();
  const updateProfileMutation = useProfileMutation();

  // Log profiles data for debugging
  useEffect(() => {
    console.log('[Profiles Page] Profiles data:', profiles);
    console.log('[Profiles Page] Loading:', loading);
    console.log('[Profiles Page] Error:', profilesError);
  }, [profiles, loading, profilesError]);

  // React Query Hooks
  const { data: usersData = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const users = usersData as any[];

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(profileId || null);
  const { data: selectedProfile, isLoading: selectedProfileLoading } = useProfile(selectedProfileId);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // If onlyCurrentUser is true, show detail dialog by default
  useEffect(() => {
    if (onlyCurrentUser && currentUser && profiles.length > 0) {
      const userProfile = profiles.find((p) => p.id === currentUser.id || p.email === currentUser.email);
      if (userProfile) {
        setSelectedProfileId(userProfile.id);
        setIsDetailOpen(true);
      }
    }
  }, [onlyCurrentUser, currentUser, profiles]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('basic');
  const { data: assetsData, isLoading: loadingAssets, refetch: refetchAssets } = useExitAssets(selectedProfileId || undefined);
  const employeeAssets = (assetsData as any)?.assets || [];

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterExperience, setFilterExperience] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<EmployeeProfile>>({});

  // Cmd+K global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Add profile form state
  const [addForm, setAddForm] = useState<Partial<EmployeeProfile>>({
    email: '',
    full_name: '',
    job_title: '',
    department: '',
    phone: '',
    join_date: '',
    experience_years: 0,
    employment_type: 'Full-time',
  });

  // No manual init or loadUsers needed

  useEffect(() => {
    if (profileId) {
      handleViewProfile(profileId);
    }
  }, [profileId]);

  // LAD Architecture: Profiles loaded via SDK hook
  // No need for loadProfiles function

  const handleViewProfile = (id: string) => {
    setSelectedProfileId(id);
    setIsDetailOpen(true);
    // Edit form will be initialized in a separate useEffect when selectedProfile loads
  };

  // Sync edit form when selectedProfile changes
  useEffect(() => {
    if (selectedProfile) {
      setEditForm(selectedProfile);
    }
  }, [selectedProfile]);

  // Handle HR Document Template Upload
  const handleTemplateUpload = async (file: File, documentType: string, templateName: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('template', file);
      formData.append('documentType', documentType);
      formData.append('name', `${templateName} - ${file.name.replace(/\.[^/.]+$/, '')}`);

      const apiBase = import.meta.env.VITE_API_BASE_URL;
      if (!apiBase) throw new Error('VITE_API_BASE_URL is not set!');
      const response = await fetch(`${apiBase}/api/hr-documents/templates/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        let successMsg = `${templateName} template uploaded successfully!`;

        // Show what was learned from the template
        if (data.extractedInfo?.documentType) {
          successMsg += ` Detected as: ${data.extractedInfo.documentType}.`;
        }
        if (data.extractedInfo?.companyInfo?.name) {
          successMsg += ` Company: ${data.extractedInfo.companyInfo.name}.`;
        }
        if (data.extractedInfo?.employeeFields?.length > 0) {
          successMsg += ` Found ${data.extractedInfo.employeeFields.length} fields.`;
        }
        if (data.extractedInfo?.letterFormat?.hasNumberedList) {
          successMsg += ' Format: Numbered list style.';
        }

        toast({
          title: "Template Uploaded",
          description: successMsg,
        });

        // Redirect to HR Documents tab to manage the template
        navigate('/hr-documents');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error(`Error uploading ${templateName} template:`, error);
      toast({
        title: "Upload Failed",
        description: error.message || `Failed to upload ${templateName} template`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Logo/Signature Image Upload
  const handleBrandingUpload = async (file: File, type: 'logo' | 'signature') => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      const apiBase = import.meta.env.VITE_API_BASE_URL;
      if (!apiBase) throw new Error('VITE_API_BASE_URL is not set!');
      const response = await fetch(`${apiBase}/api/hr-documents/branding/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: `${type === 'logo' ? 'Logo' : 'Signature'} Uploaded`,
          description: `${type === 'logo' ? 'Company logo' : 'Signature image'} has been saved and will be used in generated documents.`,
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Upload Failed",
        description: error.message || `Failed to upload ${type}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Batch Profile Upload
  const handleProfileBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Check file type
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        throw new Error("Invalid file type. Please upload Excel or CSV file.");
      }

      const response = await updateProfileMutation.uploadBatch.mutateAsync(file);

      if (response.success) {
        toast({
          title: "Batch Upload Successful",
          description: response.message || `Processed ${response.total} profiles.`,
        });

        // Show details of results if mixed success
        if (response.failed > 0) {
          console.warn('Batch upload partial failures:', response.results.filter((r: any) => !r.success));
          toast({
            title: "Partial Success",
            description: `${response.successful} succeeded, ${response.failed} failed. Check console for details.`,
          });
        }

        refetchProfiles();
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error("Error uploading profiles:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload profiles",
        variant: "destructive",
      });
    } finally {
      // Reset input
      e.target.value = '';
    }
  };

  const handleEditProfile = () => {
    if (selectedProfile) {
      setEditForm({
        ...selectedProfile,
        skills: selectedProfile.skills || [],
        documents: selectedProfile.documents || [],
      });
    }
    setActiveTab('basic');
    setIsEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;

    try {
      // Prepare form data, converting null to undefined for API
      const profileData: any = { ...editForm };
      if (profileData.phone === null || profileData.phone === '') {
        profileData.phone = undefined;
      }

      // LAD Architecture: Use SDK mutation
      await updateProfileMutation.mutateAsync({
        id: selectedProfile.id,
        data: profileData
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditOpen(false);
      refetchProfiles();

      // selectedProfile will automatically reload because the query is invalidated
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleAddProfile = async () => {
    if (!addForm.email) {
      toast({
        title: "Error",
        description: "Please select a user or enter an email",
        variant: "destructive",
      });
      return;
    }

    // Find user by email
    const user = users.find(u => u.email === addForm.email);
    if (!user) {
      toast({
        title: "Error",
        description: "User not found. Please select a valid user.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare form data, converting null to undefined for API
      const profileData: any = { ...addForm };
      if (profileData.phone === null || profileData.phone === '') {
        profileData.phone = undefined;
      }

      // LAD Architecture: Use SDK mutation
      await updateProfileMutation.mutateAsync({
        id: user.id,
        data: profileData
      });

      toast({
        title: "Success",
        description: "Profile created successfully",
      });
      setIsAddOpen(false);
      setAddForm({
        email: '',
        full_name: '',
        job_title: '',
        department: '',
        phone: '',
        join_date: '',
        experience_years: 0,
        employment_type: 'Full-time',
      });
      refetchProfiles();
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    }
  };

  // Get unique departments and roles for filters
  const departments = useMemo(() => {
    const depts = new Set<string>();
    profiles.forEach(p => {
      if (p.department) depts.add(p.department);
    });
    return Array.from(depts).sort();
  }, [profiles]);

  const roles = useMemo(() => {
    const roleSet = new Set<string>();
    profiles.forEach(p => {
      if (p.role) roleSet.add(p.role);
    });
    return Array.from(roleSet).sort();
  }, [profiles]);

  // Filter and sort profiles
  const filteredAndSortedProfiles = useMemo(() => {
    let filtered = [...profiles];

    // If onlyCurrentUser, filter to just the current user's profile
    if (onlyCurrentUser && currentUser) {
      filtered = filtered.filter(p => p.id === currentUser.id || p.email === currentUser.email);
      return filtered; // Skip other filters for single user mode
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.skills?.some(s => s.toLowerCase().includes(query)) ||
        p.job_title?.toLowerCase().includes(query) ||
        p.department?.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (filterDepartment !== "all") {
      filtered = filtered.filter(p => p.department === filterDepartment);
    }

    // Role filter
    if (filterRole !== "all") {
      filtered = filtered.filter(p => p.role === filterRole);
    }

    // Status filter (simplified - using role or join_date)
    if (filterStatus !== "all") {
      filtered = filtered.filter(p => {
        if (filterStatus === "active") return p.role !== "ex-employee";
        if (filterStatus === "onboarding") return !p.join_date || new Date(p.join_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        if (filterStatus === "ex-employee") return p.role === "ex-employee";
        return true;
      });
    }

    // Experience filter
    if (filterExperience !== "all") {
      filtered = filtered.filter(p => {
        const exp = p.experience_years || 0;
        if (filterExperience === "0-2") return exp >= 0 && exp < 2;
        if (filterExperience === "2-5") return exp >= 2 && exp < 5;
        if (filterExperience === "5-10") return exp >= 5 && exp < 10;
        if (filterExperience === "10+") return exp >= 10;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
          break;
        case 'join_date':
          const dateA = a.join_date ? new Date(a.join_date).getTime() : 0;
          const dateB = b.join_date ? new Date(b.join_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'experience':
          comparison = (a.experience_years || 0) - (b.experience_years || 0);
          break;
        case 'department':
          comparison = (a.department || '').localeCompare(b.department || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [profiles, searchQuery, filterDepartment, filterRole, filterStatus, filterExperience, sortBy, sortOrder, onlyCurrentUser, currentUser]);

  // Reset assets when profile changes - handled by hook dependencies
  // No need for fetchEmployeeAssets manual function

  // Group profiles by status for Kanban view
  const kanbanColumns = useMemo(() => {
    const columns = {
      'active': filteredAndSortedProfiles.filter(p => getProfileStatus(p) === 'active'),
      'onboarding': filteredAndSortedProfiles.filter(p => getProfileStatus(p) === 'onboarding'),
      'ex-employee': filteredAndSortedProfiles.filter(p => getProfileStatus(p) === 'ex-employee'),
    };
    return columns;
  }, [filteredAndSortedProfiles]);

  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isAdmin || (selectedProfile && selectedProfile.id === currentUser?.id) || false;

  // Debug logging
  useEffect(() => {
    console.log('🔍 Current User:', currentUser);
    console.log('🔍 Is Admin:', isAdmin);
    console.log('🔍 User Role:', currentUser?.role);
  }, [currentUser, isAdmin]);

  if (loading && profiles.length === 0) {
    return (
      <div className={noPadding ? "" : "p-6"}>
        {!hideHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="h-10 w-48 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-96 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={noPadding ? "" : "p-6"}>


      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {onlyCurrentUser ? 'My Profile' : 'Employee Profiles'}
            </h1>
            <p className="text-gray-500 mt-1">
              {onlyCurrentUser
                ? 'View and manage your profile details'
                : 'View and manage employee directory and professional history'}
            </p>
          </div>
          {!onlyCurrentUser && (
            <div className="flex items-center space-x-2">
              {/* Download Template Button */}
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await downloadTemplate();
                    toast({
                      title: "Success",
                      description: "Template downloaded successfully",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to download template",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              {/* Upload File Dropdown */}
              <div className="relative">
                {/* Hidden file inputs for different upload types */}
                <input
                  type="file"
                  id="profile-upload"
                  className="hidden"
                  accept=".xls,.xlsx,.csv"
                  onChange={handleProfileBatchUpload}
                  disabled={isUploading}
                />

                {/* Hidden file inputs for HR document templates */}
                <input
                  type="file"
                  id="experience-template-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleTemplateUpload(file, 'experience_letter', 'Experience Letter');
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  id="payslip-template-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleTemplateUpload(file, 'payslip', 'Payslip');
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  id="asset-handover-template-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleTemplateUpload(file, 'asset_handover', 'Asset Handover');
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  id="relieving-letter-template-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleTemplateUpload(file, 'relieving_letter', 'Relieving Letter');
                    e.target.value = '';
                  }}
                />

                {/* Hidden file inputs for Logo and Signature */}
                <input
                  type="file"
                  id="logo-upload"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleBrandingUpload(file, 'logo');
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  id="signature-upload"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleBrandingUpload(file, 'signature');
                    e.target.value = '';
                  }}
                />

                <Button
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => document.getElementById('profile-upload')?.click()}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Employees
                    </>
                  )}
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-0"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="rounded-none border-0"
                >
                  <Columns className="h-4 w-4" />
                </Button>
              </div>
              {(isAdmin || true) && (
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Employee Profile</DialogTitle>
                    </DialogHeader>
                    <JoiningForm isModal onCancel={() => setIsAddOpen(false)} onComplete={() => { setIsAddOpen(false); refetchProfiles(); }} />
                  </DialogContent>
                </Dialog>
              )}
              <Button onClick={async () => {
                await queryClient.invalidateQueries({ queryKey: ['profiles'] });
                refetchProfiles();
              }} variant="outline" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Global Search Modal (Cmd+K) */}
      {
        !onlyCurrentUser && (
          <ProfileSearchModal
            open={isSearchOpen}
            onOpenChange={setIsSearchOpen}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            profiles={filteredAndSortedProfiles}
            onProfileSelect={(profile) => {
              setSelectedProfileId(profile.id);
              setIsDetailOpen(true);
              setIsSearchOpen(false);
            }}
          />
        )
      }

      {/* Search and Filters */}
      {
        !onlyCurrentUser && (
          <ProfileFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchClick={() => setIsSearchOpen(true)}
            filterDepartment={filterDepartment}
            onDepartmentChange={setFilterDepartment}
            filterRole={filterRole}
            onRoleChange={setFilterRole}
            filterStatus={filterStatus}
            onStatusChange={setFilterStatus}
            filterExperience={filterExperience}
            onExperienceChange={setFilterExperience}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            departments={departments}
            roles={roles}
            totalProfiles={profiles.length}
            filteredCount={filteredAndSortedProfiles.length}
          />
        )
      }

      {/* Error Display */}
      {
        profilesError && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <span className="font-semibold">Error loading profiles:</span>
                <span>{profilesError instanceof Error ? profilesError.message : String(profilesError)}</span>
              </div>
              <p className="text-sm text-red-600 mt-2">
                Check browser console and backend logs for more details.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => refetchProfiles()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )
      }

      {/* Profiles Display */}
      {
        filteredAndSortedProfiles.length === 0 && !loading && !profilesError ? (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No employee profiles found</p>
              <p className="text-sm text-gray-400 mt-2">
                {profiles.length === 0
                  ? "The database appears to be empty. Use the '+ Add Employee' button to create profiles."
                  : "No profiles match your current filters."}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onClick={() => handleViewProfile(profile.id)}
              />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <ProfileListView
            profiles={filteredAndSortedProfiles}
            onProfileClick={handleViewProfile}
          />
        ) : (
          <ProfileKanbanView
            kanbanColumns={kanbanColumns}
            onProfileClick={handleViewProfile}
          />
        )
      }

      {/* Profile Detail Dialog */}
      <ProfileDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        profile={selectedProfile}
        activeTab={activeTab as 'basic' | 'contact' | 'family' | 'skills' | 'experience' | 'projects' | 'education' | 'performance' | 'health' | 'verification' | 'burnout' | 'hr-payroll' | 'documents' | 'assets' | 'activity'}
        onTabChange={setActiveTab}
        canEdit={canEdit}
        onEdit={handleEditProfile}
        employeeAssets={employeeAssets}
        loadingAssets={loadingAssets}
        onFetchAssets={() => { }} // Hook handles it automatically
        currentUser={currentUser}
        isAdmin={isAdmin}
        onDeleteSuccess={async () => {
          setSelectedProfileId(null);
          setIsDetailOpen(false);
          // Invalidate the profiles cache to force a fresh fetch
          await queryClient.invalidateQueries({ queryKey: ['profiles'] });
          await refetchProfiles();
        }}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (open) setActiveTab('basic');
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription className="sr-only">Form to edit profile details for {editForm.full_name || editForm.email}</DialogDescription>
          </DialogHeader>

          {/* Tabs for different sections */}
          <div className="flex space-x-1 border-b mb-4 overflow-x-auto">
            {['basic', 'assets', 'id-card', 'projects', 'performance', 'burnout', 'activity'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  // Fetch assets when assets tab is clicked - Handled by hook
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ').replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={editForm.job_title || ''}
                      onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={editForm.department || ''}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="join_date">Join Date</Label>
                    <Input
                      id="join_date"
                      type="date"
                      value={editForm.join_date?.split('T')[0] || ''}
                      onChange={(e) => setEditForm({ ...editForm, join_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience_years">Experience (Years)</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      step="0.1"
                      value={editForm.experience_years || ''}
                      onChange={(e) => setEditForm({ ...editForm, experience_years: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={editForm.bio || ''}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    value={editForm.linkedin_url || ''}
                    onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="github_url">GitHub URL</Label>
                  <Input
                    id="github_url"
                    value={editForm.github_url || ''}
                    onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Skills (comma-separated)</Label>
                  <Input
                    value={editForm.skills?.join(', ') || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    })}
                    placeholder="e.g., React, Node.js, TypeScript"
                  />
                </div>
                <div>
                  <Label htmlFor="burnout_score">Burnout Score (0-100)</Label>
                  <Input
                    id="burnout_score"
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.burnout_score !== undefined && editForm.burnout_score !== null ? editForm.burnout_score : ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      burnout_score: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    placeholder="0-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    0 = No risk, 100 = Critical risk
                  </p>
                </div>

                {/* Additional Fields */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employee_id">Employee ID</Label>
                      <Input
                        id="employee_id"
                        value={editForm.employee_id || ''}
                        onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="employment_type">Employment Type</Label>
                      <select
                        id="employment_type"
                        value={editForm.employment_type || 'Full-time'}
                        onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Intern">Intern</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="reporting_manager">Reporting Manager</Label>
                      <Input
                        id="reporting_manager"
                        value={editForm.reporting_manager || ''}
                        onChange={(e) => setEditForm({ ...editForm, reporting_manager: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="personal_email">Personal Email</Label>
                      <Input
                        id="personal_email"
                        type="email"
                        value={editForm.personal_email || ''}
                        onChange={(e) => setEditForm({ ...editForm, personal_email: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="emergency_contact">Emergency Contact</Label>
                      <Input
                        id="emergency_contact"
                        value={editForm.emergency_contact || ''}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                        placeholder="Name and phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Documents</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDocs = editForm.documents || [];
                        setEditForm({
                          ...editForm,
                          documents: [
                            ...currentDocs,
                            {
                              name: '',
                              type: '',
                              url: '',
                              uploaded_date: new Date().toISOString(),
                            },
                          ],
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </div>

                  {editForm.documents && editForm.documents.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {editForm.documents.map((doc: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg hover:bg-gray-50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">Document {idx + 1}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedDocs = editForm.documents?.filter((_, i) => i !== idx) || [];
                                setEditForm({ ...editForm, documents: updatedDocs });
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <Label className="text-xs">Document Name</Label>
                              <Input
                                placeholder="e.g., Resume, ID Proof, Contract"
                                value={doc.name || ''}
                                onChange={(e) => {
                                  const updatedDocs = [...(editForm.documents || [])];
                                  updatedDocs[idx] = { ...updatedDocs[idx], name: e.target.value };
                                  setEditForm({ ...editForm, documents: updatedDocs });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Document Type</Label>
                              <Input
                                placeholder="e.g., PDF, Image, Certificate"
                                value={doc.type || ''}
                                onChange={(e) => {
                                  const updatedDocs = [...(editForm.documents || [])];
                                  updatedDocs[idx] = { ...updatedDocs[idx], type: e.target.value };
                                  setEditForm({ ...editForm, documents: updatedDocs });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Document URL</Label>
                              <Input
                                placeholder="https://example.com/document.pdf"
                                value={doc.url || ''}
                                onChange={(e) => {
                                  const updatedDocs = [...(editForm.documents || [])];
                                  updatedDocs[idx] = { ...updatedDocs[idx], url: e.target.value };
                                  setEditForm({ ...editForm, documents: updatedDocs });
                                }}
                              />
                              <p className="text-xs text-gray-400 mt-1">
                                Provide a URL to the document (can be a file storage link)
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg">
                      <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No documents added</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Add Document" to add a document entry</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Assets Tab */}
            {activeTab === 'assets' && (
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Employee Assets
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchAssets()}
                      disabled={loadingAssets}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingAssets ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  {loadingAssets ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Loading assets...</span>
                    </div>
                  ) : employeeAssets.length > 0 ? (
                    <div className="space-y-3">
                      {employeeAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-medium text-sm">{asset.asset_name}</h4>
                                {asset.asset_category && (
                                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                    {asset.asset_category}
                                  </span>
                                )}
                              </div>
                              {asset.asset_id && (
                                <p className="text-xs text-gray-500 mb-1">
                                  <span className="font-medium">Asset ID:</span> {asset.asset_id}
                                </p>
                              )}
                              {asset.assigned_date && (
                                <p className="text-xs text-gray-500 mb-1">
                                  <span className="font-medium">Assigned:</span>{" "}
                                  {format(new Date(asset.assigned_date), "MMMM dd, yyyy")}
                                </p>
                              )}
                              {asset.condition_at_assignment && (
                                <p className="text-xs text-gray-500 mb-1">
                                  <span className="font-medium">Condition:</span> {asset.condition_at_assignment}
                                </p>
                              )}
                              {asset.notes && (
                                <p className="text-xs text-gray-600 mt-2 italic">{asset.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No assets assigned to this employee</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ID Card Tab */}
            {activeTab === 'id-card' && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">ID Card Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employee_id">Employee ID</Label>
                      <Input
                        id="employee_id"
                        value={editForm.employee_id || ''}
                        onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                        placeholder="e.g., EMP001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="id_card_number">ID Card Number</Label>
                      <Input
                        id="id_card_number"
                        value={(editForm as any).id_card_number || ''}
                        onChange={(e) => setEditForm({ ...editForm, id_card_number: e.target.value } as any)}
                        placeholder="e.g., ID123456"
                      />
                    </div>
                    <div>
                      <Label htmlFor="id_card_issue_date">Issue Date</Label>
                      <Input
                        id="id_card_issue_date"
                        type="date"
                        value={(editForm as any).id_card_issue_date?.split('T')[0] || ''}
                        onChange={(e) => setEditForm({ ...editForm, id_card_issue_date: e.target.value } as any)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="id_card_expiry_date">Expiry Date</Label>
                      <Input
                        id="id_card_expiry_date"
                        type="date"
                        value={(editForm as any).id_card_expiry_date?.split('T')[0] || ''}
                        onChange={(e) => setEditForm({ ...editForm, id_card_expiry_date: e.target.value } as any)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="id_card_photo">ID Card Photo URL</Label>
                      <Input
                        id="id_card_photo"
                        value={(editForm as any).id_card_photo || ''}
                        onChange={(e) => setEditForm({ ...editForm, id_card_photo: e.target.value } as any)}
                        placeholder="https://example.com/id-card.jpg"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Provide a URL to the ID card photo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Employee Projects
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentProjects = editForm.project_history || [];
                        setEditForm({
                          ...editForm,
                          project_history: [
                            ...currentProjects,
                            {
                              name: '',
                              role: '',
                              start_date: '',
                              end_date: '',
                              description: '',
                            },
                          ],
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </div>
                  {editForm.project_history && editForm.project_history.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {editForm.project_history.map((project: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg hover:bg-gray-50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Briefcase className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">Project {idx + 1}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedProjects = editForm.project_history?.filter((_, i) => i !== idx) || [];
                                setEditForm({ ...editForm, project_history: updatedProjects });
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Project Name</Label>
                              <Input
                                placeholder="e.g., Project Alpha"
                                value={project.name || ''}
                                onChange={(e) => {
                                  const updatedProjects = [...(editForm.project_history || [])];
                                  updatedProjects[idx] = { ...updatedProjects[idx], name: e.target.value };
                                  setEditForm({ ...editForm, project_history: updatedProjects });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Role</Label>
                              <Input
                                placeholder="e.g., Developer, Lead"
                                value={project.role || ''}
                                onChange={(e) => {
                                  const updatedProjects = [...(editForm.project_history || [])];
                                  updatedProjects[idx] = { ...updatedProjects[idx], role: e.target.value };
                                  setEditForm({ ...editForm, project_history: updatedProjects });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Start Date</Label>
                              <Input
                                type="date"
                                value={project.start_date?.split('T')[0] || ''}
                                onChange={(e) => {
                                  const updatedProjects = [...(editForm.project_history || [])];
                                  updatedProjects[idx] = { ...updatedProjects[idx], start_date: e.target.value };
                                  setEditForm({ ...editForm, project_history: updatedProjects });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">End Date</Label>
                              <Input
                                type="date"
                                value={project.end_date?.split('T')[0] || ''}
                                onChange={(e) => {
                                  const updatedProjects = [...(editForm.project_history || [])];
                                  updatedProjects[idx] = { ...updatedProjects[idx], end_date: e.target.value };
                                  setEditForm({ ...editForm, project_history: updatedProjects });
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Description</Label>
                              <Textarea
                                placeholder="Project description..."
                                value={project.description || ''}
                                onChange={(e) => {
                                  const updatedProjects = [...(editForm.project_history || [])];
                                  updatedProjects[idx] = { ...updatedProjects[idx], description: e.target.value };
                                  setEditForm({ ...editForm, project_history: updatedProjects });
                                }}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No projects added</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Add Project" to add a project entry</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Award className="h-5 w-5 mr-2" />
                      Performance Reviews
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentReviews = editForm.performance_reviews || [];
                        setEditForm({
                          ...editForm,
                          performance_reviews: [
                            ...currentReviews,
                            {
                              period: '',
                              rating: '',
                              summary: '',
                              date: new Date().toISOString(),
                            },
                          ],
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Review
                    </Button>
                  </div>
                  {editForm.performance_reviews && editForm.performance_reviews.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {editForm.performance_reviews.map((review: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg hover:bg-gray-50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Award className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">Review {idx + 1}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedReviews = editForm.performance_reviews?.filter((_, i) => i !== idx) || [];
                                setEditForm({ ...editForm, performance_reviews: updatedReviews });
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Period</Label>
                              <Input
                                placeholder="e.g., Q1 2024, Annual 2023"
                                value={review.period || review.title || ''}
                                onChange={(e) => {
                                  const updatedReviews = [...(editForm.performance_reviews || [])];
                                  updatedReviews[idx] = { ...updatedReviews[idx], period: e.target.value, title: e.target.value };
                                  setEditForm({ ...editForm, performance_reviews: updatedReviews });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Rating</Label>
                              <Input
                                placeholder="e.g., 4.5/5, Excellent"
                                value={review.rating || ''}
                                onChange={(e) => {
                                  const updatedReviews = [...(editForm.performance_reviews || [])];
                                  updatedReviews[idx] = { ...updatedReviews[idx], rating: e.target.value };
                                  setEditForm({ ...editForm, performance_reviews: updatedReviews });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Date</Label>
                              <Input
                                type="date"
                                value={review.date?.split('T')[0] || ''}
                                onChange={(e) => {
                                  const updatedReviews = [...(editForm.performance_reviews || [])];
                                  updatedReviews[idx] = { ...updatedReviews[idx], date: e.target.value };
                                  setEditForm({ ...editForm, performance_reviews: updatedReviews });
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Summary</Label>
                              <Textarea
                                placeholder="Performance review summary..."
                                value={review.summary || ''}
                                onChange={(e) => {
                                  const updatedReviews = [...(editForm.performance_reviews || [])];
                                  updatedReviews[idx] = { ...updatedReviews[idx], summary: e.target.value };
                                  setEditForm({ ...editForm, performance_reviews: updatedReviews });
                                }}
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No performance reviews added</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Add Review" to add a performance review</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Burnout Tab */}
            {activeTab === 'burnout' && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Burnout Risk Assessment</h3>
                  <div>
                    <Label htmlFor="burnout_score">Burnout Score (0-100)</Label>
                    <Input
                      id="burnout_score"
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.burnout_score !== undefined && editForm.burnout_score !== null ? editForm.burnout_score : ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        burnout_score: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      placeholder="0-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      0 = No risk, 100 = Critical risk
                    </p>
                    {editForm.burnout_score !== undefined && editForm.burnout_score !== null && (
                      <div className="mt-3 p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-2">
                          <Flame className={`h-5 w-5 ${getBurnoutLevel(editForm.burnout_score).color}`} />
                          <span className={`text-sm font-semibold ${getBurnoutLevel(editForm.burnout_score).color}`}>
                            {getBurnoutLevel(editForm.burnout_score).level} Risk
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
                  <div className="space-y-3">
                    {editForm.updated_at && (
                      <div className="flex items-start space-x-3 pb-3 border-b">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Profile Updated</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(editForm.updated_at), "MMMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    )}
                    {editForm.join_date && (
                      <div className="flex items-start space-x-3 pb-3 border-b">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Joined Company</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(editForm.join_date), "MMMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}
                    {editForm.created_at && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Profile Created</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(editForm.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    )}
                    {(!editForm.updated_at && !editForm.join_date && !editForm.created_at) && (
                      <p className="text-sm text-gray-500">No activity recorded</p>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profiles;
