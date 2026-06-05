import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
// LAD Architecture: Use SDK instead of direct API calls
import { useProfiles, useProfileMutation, type EmployeeProfile as SDKEmployeeProfile } from "@/sdk/features/profiles";
import { usePfDetails, usePfContributions, usePayrollMutation } from "@/sdk/features/payroll-pf";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Code,
  ExternalLink,
  RefreshCw,
  Search,
  ArrowUpDown,
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
  Wallet,
  Building2,
  Upload as UploadIcon
} from "lucide-react";
import { format } from "date-fns";

// Use SDK types
type EmployeeProfile = SDKEmployeeProfile;

type SortOption = 'name' | 'join_date' | 'experience' | 'department';
type FilterStatus = 'all' | 'active' | 'onboarding' | 'ex-employee';
type ViewMode = 'grid' | 'list' | 'kanban';

interface ProfilesProps {
  onlyCurrentUser?: boolean;
}

const Profiles = ({ onlyCurrentUser = false }: ProfilesProps) => {
  const { id: profileId } = useParams();

  // LAD Architecture: Use SDK hooks
  const { data: profiles = [], isLoading: loading, error: profilesError, refetch: refetchProfiles } = useProfiles();
  const updateProfileMutation = useProfileMutation();

  // Log profiles data for debugging
  useEffect(() => {
    console.log('[Profiles Page] Profiles data:', profiles);
    console.log('[Profiles Page] Loading:', loading);
    console.log('[Profiles Page] Error:', profilesError);
  }, [profiles, loading, profilesError]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedProfile, setSelectedProfile] = useState<EmployeeProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // Fix: Add missing uploadFiles state for file uploads
  const [uploadFiles, setUploadFiles] = useState<{ [key: string]: File | null }>({});

  // If onlyCurrentUser is true, show detail dialog by default
  useEffect(() => {
    if (onlyCurrentUser && currentUser && profiles.length > 0) {
      const userProfile = profiles.find((p) => p.id === currentUser.id || p.email === currentUser.email);
      if (userProfile) {
        setSelectedProfile(userProfile);
        setIsDetailOpen(true);
      }
    }
  }, [onlyCurrentUser, currentUser, profiles]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [users, setUsers] = useState<any[]>([]);

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

  // Function to handle download template
  const handleDownloadTemplate = async () => {
    try {
      // Create sample data for the template
      const sampleData = [
        {
          email: 'john.doe@techiemaya.com',
          full_name: 'John Doe',
          job_title: 'Software Engineer',
          department: 'Engineering',
          phone: '+1-234-567-8900',
          join_date: '2023-05-15',
          experience_years: 5.5,
          skills: 'JavaScript,React,Node.js',
          bio: 'Senior developer with expertise in full-stack development',
          linkedin_url: 'https://linkedin.com/in/johndoe',
          github_url: 'https://github.com/johndoe',
          burnout_score: 25,
          reporting_manager: 'Jane Smith',
          employment_type: 'Full-time',
          employee_id: 'EMP001',
          personal_email: 'john.personal@gmail.com',
          emergency_contact: 'Jane Doe +1-987-654-3210',
          address: '123 Main St, City, State',
          date_of_birth: '1990-01-01',
          education: 'B.Tech Computer Science',
          certifications: 'AWS Certified,Scrum Master',
          previous_projects: 'Project Alpha,Project Beta',
          project_history: 'Project Gamma',
          performance_reviews: 'Annual Review 2023',
          documents: 'Resume,Cover Letter',
        }
      ];

      // Convert to CSV format
      const headers = Object.keys(sampleData[0]);
      const csvContent = [
        headers.join(','),
        ...sampleData.map(row => headers.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(','))
      ].join('\n');

      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'employee_profile_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: 'Template downloaded successfully',
      });
    } catch (error: any) {
      console.error('Error downloading template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  // Function to handle upload profiles
  const handleUploadProfiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Reset the file input
      if (e.target) {
        e.target.value = '';
      }

      // Show loading state
      toast({
        title: 'Processing',
        description: 'Uploading profiles...',
      });

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Get token from localStorage (the key might be different in your app)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

      // Upload the file to the backend
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not set!');
      const response = await fetch(`${API_BASE_URL}/api/profiles/upload-batch`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header as it will be set automatically with boundary
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      toast({
        title: 'Success',
        description: `${result.message || `${file.name} uploaded successfully`}`,
      });

      // Refresh profiles after upload
      refetchProfiles();
    } catch (error: any) {
      console.error('Error uploading profiles:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload profiles',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const initProfiles = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.id) {
          setCurrentUser(userData);

          // Get user role from API
          try {
            const currentUserResp = await api.auth.getMe() as any;
            console.log('🔍 API Response:', currentUserResp);
            const userRole = currentUserResp?.role || currentUserResp?.user?.role || userData.role || 'user';
            console.log('🔍 Detected role:', userRole);
            const userWithRole = {
              ...userData,
              role: userRole
            };
            setCurrentUser(userWithRole);

            // Profiles are loaded via SDK hook (useProfiles)
            // Load users if admin
            if (userWithRole.role === 'admin') {
              await loadUsers();
            }
          } catch (apiError) {
            console.error('Error fetching user role:', apiError);
            // Fallback to localStorage role
            if (userData.role === 'admin') {
              await loadUsers();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing profiles:', error);
      }
    };
    initProfiles();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.users.getAll() as any;
      const usersData = response.users || response || [];
      setUsers(usersData);
    } catch (error: any) {
      console.error("Error loading users:", error);
    }
  };

  useEffect(() => {
    if (profileId) {
      handleViewProfile(profileId);
    }
  }, [profileId]);

  // LAD Architecture: Profiles loaded via SDK hook
  // No need for loadProfiles function

  const handleViewProfile = async (id: string) => {
    try {
      // Use SDK to get profile
      const { getProfileById } = await import("@/sdk/features/profiles");
      const response = await getProfileById(id);
      if (response.profile) {
        setSelectedProfile(response.profile);
        setEditForm(response.profile);
        setIsDetailOpen(true);
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load profile details",
        variant: "destructive",
      });
    }
  };

  const handleEditProfile = () => {
    setIsDetailOpen(false);
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
      setIsDetailOpen(true);
      refetchProfiles();

      // Reload selected profile
      if (selectedProfile) {
        const { getProfileById } = await import("@/sdk/features/profiles");
        const response = await getProfileById(selectedProfile.id);
        if (response.profile) {
          setSelectedProfile(response.profile);
          setEditForm(response.profile);
        }
      }
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

  const handleExitEmployee = async () => {
    if (!selectedProfile) return;
    
    if (!window.confirm(`Are you sure you want to mark ${selectedProfile.full_name || selectedProfile.email} as an Ex-Employee? Their details will be retained.`)) {
      return;
    }

    try {
      await api.users.updateRole(selectedProfile.id, 'ex-employee');

      toast({
        title: "Success",
        description: "Employee status updated to Ex-Employee",
      });
      refetchProfiles();

      // Reload selected profile
      const { getProfileById } = await import("@/sdk/features/profiles");
      const response = await getProfileById(selectedProfile.id);
      if (response.profile) {
        setSelectedProfile(response.profile);
        setEditForm(response.profile);
      }
    } catch (error: any) {
      console.error("Error exiting employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update employee status",
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
      console.log('🔍 OnlyCurrentUser mode - Current User:', currentUser);
      console.log('🔍 OnlyCurrentUser mode - All Profiles:', profiles);
      filtered = filtered.filter(p => {
        const match = p.id === currentUser.id || p.email === currentUser.email;
        console.log(`🔍 Profile ${p.email} (${p.id}) matches current user: ${match}`);
        return match;
      });
      console.log('🔍 OnlyCurrentUser mode - Filtered profiles:', filtered);
    } else {
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

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const calculateYearsAtCompany = (joinDate: string | null, createdDate: string) => {
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

  const calculateProfileCompleteness = (profile: EmployeeProfile): number => {
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

  const getBurnoutLevel = (score: number | undefined | null): { level: string; color: string; bgColor: string } => {
    if (!score && score !== 0) return { level: 'Not Set', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    if (score <= 30) return { level: 'Low', color: 'text-green-700', bgColor: 'bg-green-100' };
    if (score <= 60) return { level: 'Moderate', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
    if (score <= 80) return { level: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' };
    return { level: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' };
  };

  const getProfileStatus = (profile: EmployeeProfile): string => {
    if (profile.role === 'ex-employee') return 'ex-employee';
    if (!profile.join_date || new Date(profile.join_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      return 'onboarding';
    }
    return 'active';
  };

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
  const canEdit = isAdmin || (selectedProfile && selectedProfile.id === currentUser?.id);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Current User:', currentUser);
    console.log('🔍 Is Admin:', isAdmin);
    console.log('🔍 User Role:', currentUser?.role);
  }, [currentUser, isAdmin]);

  if (loading && profiles.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading employee profiles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
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

            {/* Download Template Button */}
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Template</span>
            </Button>

            {/* Upload Profiles Button */}
            <label className="cursor-pointer">
              <Button
                variant="outline"
                className="flex items-center space-x-2"
              >
                <UploadIcon className="h-4 w-4" />
                <span>Upload Profiles</span>
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleUploadProfiles}
              />
            </label>

            {(isAdmin || true) && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Employee Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="add_email">Select User *</Label>
                      <select
                        id="add_email"
                        value={addForm.email || ''}
                        onChange={(e) => {
                          const selectedUser = users.find(u => u.email === e.target.value);
                          setAddForm({
                            ...addForm,
                            email: e.target.value,
                            full_name: selectedUser?.full_name || addForm.full_name,
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a user...</option>
                        {users
                          .filter(u => !profiles.find(p => p.email === u.email))
                          .map(user => (
                            <option key={user.id} value={user.email}>
                              {user.email} {user.full_name ? `(${user.full_name})` : ''}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Only users without profiles are shown
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="add_full_name">Full Name</Label>
                        <Input
                          id="add_full_name"
                          value={addForm.full_name || ''}
                          onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="add_job_title">Job Title</Label>
                        <Input
                          id="add_job_title"
                          value={addForm.job_title || ''}
                          onChange={(e) => setAddForm({ ...addForm, job_title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="add_department">Department</Label>
                        <Input
                          id="add_department"
                          value={addForm.department || ''}
                          onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="add_phone">Phone</Label>
                        <Input
                          id="add_phone"
                          value={addForm.phone || ''}
                          onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="add_join_date">Join Date</Label>
                        <Input
                          id="add_join_date"
                          type="date"
                          value={addForm.join_date?.split('T')[0] || ''}
                          onChange={(e) => setAddForm({ ...addForm, join_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="add_experience_years">Experience (Years)</Label>
                        <Input
                          id="add_experience_years"
                          type="number"
                          step="0.1"
                          value={addForm.experience_years || 0}
                          onChange={(e) => setAddForm({ ...addForm, experience_years: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="add_employment_type">Employment Type</Label>
                        <select
                          id="add_employment_type"
                          value={addForm.employment_type || 'Full-time'}
                          onChange={(e) => setAddForm({ ...addForm, employment_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Full-time">Full-time</option>
                          <option value="Contract">Contract</option>
                          <option value="Intern">Intern</option>
                          <option value="Part-time">Part-time</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="add_skills">Skills (comma-separated)</Label>
                      <Input
                        id="add_skills"
                        value={Array.isArray(addForm.skills) ? addForm.skills.join(', ') : ''}
                        onChange={(e) => setAddForm({
                          ...addForm,
                          skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                        })}
                        placeholder="e.g., React, Node.js, TypeScript"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add_bio">Bio</Label>
                      <Textarea
                        id="add_bio"
                        value={addForm.bio || ''}
                        onChange={(e) => setAddForm({ ...addForm, bio: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddProfile} disabled={updateProfileMutation.isPending || !addForm.email}>
                      {updateProfileMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Profile
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Button onClick={() => refetchProfiles()} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Global Search Modal (Cmd+K) */}
      {!onlyCurrentUser && isSearchOpen && (
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              {searchQuery && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredAndSortedProfiles.slice(0, 10).map((profile) => (
                    <div
                      key={profile.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedProfile(profile);
                        setIsDetailOpen(true);
                        setIsSearchOpen(false);
                      }}
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
                  {filteredAndSortedProfiles.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No results found</p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Search and Filters */}
      {!onlyCurrentUser && (
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={() => setIsSearchOpen(true)}
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
                  onChange={(e) => setFilterDepartment(e.target.value)}
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
                  onChange={(e) => setFilterRole(e.target.value)}
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
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
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
                  onChange={(e) => setFilterExperience(e.target.value)}
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
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
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
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center text-sm text-gray-500">
                Showing {filteredAndSortedProfiles.length} of {profiles.length} employees
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {profilesError && (
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
      )}

      {/* Profiles Display */}
      {filteredAndSortedProfiles.length === 0 && !loading && !profilesError ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No employee profiles found</p>
            <p className="text-sm text-gray-400 mt-2">
              {profiles.length === 0
                ? "The database appears to be empty. Use the '+ Add Profile' button to create profiles."
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
          {filteredAndSortedProfiles.map((profile) => {
            const yearsAtCompany = calculateYearsAtCompany(profile.join_date, profile.created_at);
            const completeness = calculateProfileCompleteness(profile);

            return (
              <Card
                key={profile.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewProfile(profile.id)}
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
                      <span className={`px-2 py-1 text-xs rounded-full ${profile.role === 'ex-employee'
                          ? 'bg-red-100 text-red-800'
                          : !profile.join_date || new Date(profile.join_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                        {profile.role === 'ex-employee'
                          ? 'Ex-Employee'
                          : !profile.join_date || new Date(profile.join_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
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
          })}
        </div>
      ) : viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Burnout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedProfiles.map((profile) => {
                    const yearsAtCompany = calculateYearsAtCompany(profile.join_date, profile.created_at);
                    const burnout = getBurnoutLevel(profile.burnout_score);
                    const status = getProfileStatus(profile);
                    return (
                      <tr
                        key={profile.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewProfile(profile.id)}
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
                          <span className={`px-2 py-1 text-xs rounded-full ${status === 'ex-employee'
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
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['active', 'onboarding', 'ex-employee'].map((status) => (
            <div key={status} className="flex flex-col">
              <div className="bg-gray-50 px-4 py-3 rounded-t-lg border-b">
                <h3 className="text-sm font-semibold text-gray-700 uppercase">
                  {status === 'ex-employee' ? 'Ex-Employee' : status === 'onboarding' ? 'Onboarding' : 'Active'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {kanbanColumns[status as keyof typeof kanbanColumns].length} employees
                </p>
              </div>
              <div className="bg-gray-50 rounded-b-lg p-4 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
                {kanbanColumns[status as keyof typeof kanbanColumns].map((profile) => {
                  const completeness = calculateProfileCompleteness(profile);
                  const burnout = getBurnoutLevel(profile.burnout_score);
                  return (
                    <Card
                      key={profile.id}
                      className="hover:shadow-md transition-shadow cursor-pointer bg-white"
                      onClick={() => handleViewProfile(profile.id)}
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
                })}
                {kanbanColumns[status as keyof typeof kanbanColumns].length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No employees in this status
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProfile && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    {selectedProfile.avatar_url ? (
                      <img
                        src={selectedProfile.avatar_url}
                        alt={selectedProfile.full_name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-semibold">
                        {getInitials(selectedProfile.full_name || selectedProfile.email)}
                      </div>
                    )}
                    <div>
                      <DialogTitle className="text-2xl">
                        {selectedProfile.full_name || selectedProfile.email}
                      </DialogTitle>
                      <p className="text-gray-500 mt-1">
                        {selectedProfile.job_title || selectedProfile.role}
                        {selectedProfile.department && ` • ${selectedProfile.department}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pr-8">
                    {isAdmin && selectedProfile.role !== 'ex-employee' && (
                      <Button onClick={handleExitEmployee} variant="destructive" size="sm">
                        Exit Employee
                      </Button>
                    )}
                    {canEdit && (
                      <Button onClick={handleEditProfile} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Tabs */}
              <div className="flex space-x-1 border-b mb-4 overflow-x-auto">
                {['basic', 'contact', 'skills', 'experience', 'projects', 'education', 'performance', 'burnout', 'hr-payroll', 'documents', 'activity'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ').replace('-', ' & ')}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {/* Basic Information */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Full Name</Label>
                      <p className="text-sm font-medium">{selectedProfile.full_name || 'N/A'}</p>
                    </div>
                    {selectedProfile.employee_id && (
                      <div>
                        <Label className="text-xs text-gray-500">Employee ID</Label>
                        <p className="text-sm font-medium">{selectedProfile.employee_id}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500">Job Title</Label>
                      <p className="text-sm font-medium">{selectedProfile.job_title || selectedProfile.role || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Department</Label>
                      <p className="text-sm font-medium">{selectedProfile.department || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Date of Joining</Label>
                      <p className="text-sm font-medium">
                        {selectedProfile.join_date
                          ? format(new Date(selectedProfile.join_date), "MMMM dd, yyyy")
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Employment Type</Label>
                      <p className="text-sm font-medium">{selectedProfile.employment_type || 'Full-time'}</p>
                    </div>
                    {selectedProfile.reporting_manager && (
                      <div>
                        <Label className="text-xs text-gray-500">Reporting Manager</Label>
                        <p className="text-sm font-medium">{selectedProfile.reporting_manager}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500">Total Experience</Label>
                      <p className="text-sm font-medium">
                        {selectedProfile.experience_years
                          ? `${selectedProfile.experience_years} years`
                          : 'N/A'}
                      </p>
                    </div>
                    {selectedProfile.bio && (
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Bio</Label>
                        <p className="text-sm text-gray-700 mt-1">{selectedProfile.bio}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Information */}
                {activeTab === 'contact' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Official Email</Label>
                      <p className="text-sm font-medium">{selectedProfile.email}</p>
                    </div>
                    {selectedProfile.personal_email && (
                      <div>
                        <Label className="text-xs text-gray-500">Personal Email</Label>
                        <p className="text-sm font-medium">{selectedProfile.personal_email}</p>
                      </div>
                    )}
                    {selectedProfile.phone && (
                      <div>
                        <Label className="text-xs text-gray-500">Phone Number</Label>
                        <p className="text-sm font-medium">{selectedProfile.phone}</p>
                      </div>
                    )}
                    {selectedProfile.emergency_contact && (
                      <div>
                        <Label className="text-xs text-gray-500">Emergency Contact</Label>
                        <p className="text-sm font-medium">{selectedProfile.emergency_contact}</p>
                      </div>
                    )}
                    {selectedProfile.linkedin_url && (
                      <div>
                        <Label className="text-xs text-gray-500">LinkedIn</Label>
                        <a
                          href={selectedProfile.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <span>View Profile</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {selectedProfile.github_url && (
                      <div>
                        <Label className="text-xs text-gray-500">GitHub</Label>
                        <a
                          href={selectedProfile.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 hover:underline flex items-center space-x-1"
                        >
                          <span>View Profile</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Skills & Expertise */}
                {activeTab === 'skills' && (
                  <div className="space-y-4">
                    {selectedProfile.skills && selectedProfile.skills.length > 0 ? (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Technical Skills</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No skills listed</p>
                    )}
                  </div>
                )}

                {/* Professional Experience */}
                {activeTab === 'experience' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Total Years of Experience</Label>
                      <p className="text-lg font-semibold">{selectedProfile.experience_years || 0} years</p>
                    </div>

                    {/* Experience Timeline */}
                    <div className="mt-6">
                      <Label className="text-sm font-medium mb-3 block">Experience Timeline</Label>
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                        <div className="space-y-4">
                          {/* Current Company */}
                          {selectedProfile.join_date && (() => {
                            const joinDate = new Date(selectedProfile.join_date);
                            const now = new Date();
                            const yearsAtCompany = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
                            return (
                              <div className="relative flex items-start space-x-4">
                                <div className="relative z-10 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Briefcase className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex-1 pb-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-blue-600">Current Company</p>
                                      <p className="text-sm text-gray-600">{selectedProfile.department || 'Company'}</p>
                                      <p className="text-sm text-gray-500">{selectedProfile.job_title || 'Employee'}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">
                                        {format(joinDate, "MMM yyyy")} - Present
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {yearsAtCompany.toFixed(1)} years
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Previous Experience */}
                          {selectedProfile.previous_projects && selectedProfile.previous_projects.length > 0 && (
                            <>
                              {Array.isArray(selectedProfile.previous_projects) && selectedProfile.previous_projects.map((project: any, idx: number) => (
                                <div key={idx} className="relative flex items-start space-x-4">
                                  <div className="relative z-10 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                                    <Briefcase className="h-4 w-4 text-white" />
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold">
                                          {typeof project === 'string' ? project : project.name || project.company || 'Previous Company'}
                                        </p>
                                        {typeof project === 'object' && project.role && (
                                          <p className="text-sm text-gray-600">{project.role}</p>
                                        )}
                                        {typeof project === 'object' && project.description && (
                                          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                                        )}
                                      </div>
                                      {typeof project === 'object' && project.duration && (
                                        <div className="text-right">
                                          <p className="text-xs text-gray-500">{project.duration}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {(!selectedProfile.previous_projects || selectedProfile.previous_projects.length === 0) && !selectedProfile.join_date && (
                      <p className="text-sm text-gray-500">No experience listed</p>
                    )}
                  </div>
                )}

                {/* Project History */}
                {activeTab === 'projects' && (
                  <div className="space-y-4">
                    {selectedProfile.project_history && selectedProfile.project_history.length > 0 ? (
                      <div className="space-y-3">
                        {selectedProfile.project_history.map((project: any, idx: number) => (
                          <Card key={idx} className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium">{project.name || 'Project'}</p>
                                {project.description && (
                                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {project.role && (
                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                      Role: {project.role}
                                    </span>
                                  )}
                                  {project.start_date && project.end_date && (
                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                      {format(new Date(project.start_date), "MMM yyyy")} - {format(new Date(project.end_date), "MMM yyyy")}
                                    </span>
                                  )}
                                </div>
                                {project.technologies && project.technologies.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {project.technologies.map((tech: string, techIdx: number) => (
                                      <span key={techIdx} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                        {tech}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No project history available</p>
                    )}
                  </div>
                )}

                {/* Education */}
                {activeTab === 'education' && (
                  <div className="space-y-4">
                    {selectedProfile.education && selectedProfile.education.length > 0 ? (
                      <div className="space-y-3">
                        {selectedProfile.education.map((edu: any, idx: number) => (
                          <Card key={idx} className="p-4">
                            <div className="flex items-start space-x-3">
                              <GraduationCap className="h-5 w-5 text-gray-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium">{edu.degree || edu.qualification || 'Education'}</p>
                                {edu.institution && (
                                  <p className="text-sm text-gray-600 mt-1">{edu.institution}</p>
                                )}
                                {edu.graduation_year && (
                                  <p className="text-xs text-gray-400 mt-1">Graduated: {edu.graduation_year}</p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No education information available</p>
                    )}
                    {selectedProfile.certifications && selectedProfile.certifications.length > 0 && (
                      <div className="mt-6">
                        <Label className="text-sm font-medium mb-2 block">Certifications</Label>
                        <div className="space-y-2">
                          {selectedProfile.certifications.map((cert: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-2 text-sm">
                              <Award className="h-4 w-4 text-gray-400" />
                              <span>{cert.name || cert}</span>
                              {cert.issued_date && (
                                <span className="text-xs text-gray-400">
                                  ({format(new Date(cert.issued_date), "MMM yyyy")})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Performance & Growth */}
                {activeTab === 'performance' && (
                  <div className="space-y-4">
                    {selectedProfile.performance_reviews && selectedProfile.performance_reviews.length > 0 ? (
                      <div className="space-y-3">
                        {selectedProfile.performance_reviews.map((review: any, idx: number) => (
                          <Card key={idx} className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{review.period || review.title || 'Performance Review'}</p>
                                {review.rating && (
                                  <p className="text-sm text-gray-600 mt-1">Rating: {review.rating}</p>
                                )}
                                {review.summary && (
                                  <p className="text-sm text-gray-600 mt-2">{review.summary}</p>
                                )}
                              </div>
                              {review.date && (
                                <span className="text-xs text-gray-400">
                                  {format(new Date(review.date), "MMM yyyy")}
                                </span>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No performance reviews available</p>
                    )}
                  </div>
                )}

                {/* Burnout Risk */}
                {activeTab === 'burnout' && (
                  <div className="space-y-4">
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Flame className={`h-6 w-6 ${getBurnoutLevel(selectedProfile.burnout_score).color}`} />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Burnout Risk Assessment</h3>
                            <p className="text-sm text-gray-500">Current burnout risk level</p>
                          </div>
                        </div>
                        {selectedProfile.burnout_score !== undefined && selectedProfile.burnout_score !== null ? (
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${getBurnoutLevel(selectedProfile.burnout_score).color}`}>
                              {selectedProfile.burnout_score}
                            </div>
                            <span className={`px-3 py-1 text-sm rounded-full ${getBurnoutLevel(selectedProfile.burnout_score).bgColor} ${getBurnoutLevel(selectedProfile.burnout_score).color}`}>
                              {getBurnoutLevel(selectedProfile.burnout_score).level} Risk
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not Set</span>
                        )}
                      </div>
                      {selectedProfile.burnout_score !== undefined && selectedProfile.burnout_score !== null && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>Low Risk</span>
                            <span>Critical Risk</span>
                          </div>
                          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${selectedProfile.burnout_score <= 30 ? 'bg-green-500' :
                                  selectedProfile.burnout_score <= 60 ? 'bg-yellow-500' :
                                    selectedProfile.burnout_score <= 80 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${selectedProfile.burnout_score}%` }}
                            />
                          </div>
                          <div className="mt-4 text-sm text-gray-600">
                            <p className="mb-2">
                              <strong>Risk Level:</strong> {getBurnoutLevel(selectedProfile.burnout_score).level}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedProfile.burnout_score <= 30
                                ? 'Employee shows low signs of burnout. Continue monitoring and maintain healthy work-life balance.'
                                : selectedProfile.burnout_score <= 60
                                  ? 'Employee shows moderate signs of burnout. Consider workload adjustments and check-in meetings.'
                                  : selectedProfile.burnout_score <= 80
                                    ? 'Employee shows high signs of burnout. Immediate intervention recommended - reduce workload and provide support.'
                                    : 'Employee shows critical signs of burnout. Urgent action required - consider time off and professional support.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* HR & Payroll */}
                {activeTab === 'hr-payroll' && (
                  <div className="space-y-4">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">HR & Payroll Information</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">Employee ID</Label>
                            <p className="text-sm font-medium">{selectedProfile.employee_id || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Employment Type</Label>
                            <p className="text-sm font-medium">{selectedProfile.employment_type || 'Full-time'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Date of Joining</Label>
                            <p className="text-sm font-medium">
                              {selectedProfile.join_date
                                ? format(new Date(selectedProfile.join_date), "MMMM dd, yyyy")
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Reporting Manager</Label>
                            <p className="text-sm font-medium">{selectedProfile.reporting_manager || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-semibold mb-2">Payroll Documents</h4>
                          <p className="text-sm text-gray-500 mb-4">
                            {currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.id === selectedProfile.id
                              ? 'Access granted to view payroll information'
                              : 'You do not have permission to view this section'}
                          </p>
                          {(currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.id === selectedProfile.id) && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <FileText className="h-5 w-5 text-gray-400" />
                                  <div>
                                    <p className="text-sm font-medium">Monthly Payslips</p>
                                    <p className="text-xs text-gray-400">Available for download</p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.location.href = '/payslips'}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  View Payslips
                                </Button>
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <FileText className="h-5 w-5 text-gray-400" />
                                  <div>
                                    <p className="text-sm font-medium">Form 16</p>
                                    <p className="text-xs text-gray-400">Tax document</p>
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" disabled>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <FileText className="h-5 w-5 text-gray-400" />
                                  <div>
                                    <p className="text-sm font-medium">PF / ESI Details</p>
                                    <p className="text-xs text-gray-400">Provident fund information</p>
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" disabled>
                                  <Download className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* PF Management Section */}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.id === selectedProfile.id) && (
                          <PfManagementSection profileId={selectedProfile.id} isAdmin={isAdmin} />
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* Documents */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    {/* Document Upload Section */}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.id === selectedProfile.id) && (
                      <div className="p-4 border rounded-lg bg-gray-50 mb-2">
                        <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>

                        {/* KYC Documents */}
                        <div className="mb-6">
                          <h4 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b">KYC Documents</h4>
                          <div className="space-y-3">
                            {[
                              { label: 'Aadhaar', type: 'aadhaar' },
                              { label: 'Electricity / Utility Bill', type: 'utility_bill' },
                              { label: 'PAN', type: 'pan' },
                            ].map((doc) => (
                              <form
                                key={doc.type}
                                className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-center p-3 border rounded-lg hover:bg-white transition-colors"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const file = uploadFiles[doc.type] || null;
                                  if (!file) {
                                    toast({ title: 'Error', description: `Please select a file for ${doc.label}.`, variant: 'destructive' });
                                    return;
                                  }
                                  try {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    formData.append('type', doc.type);
                                    formData.append('user_id', selectedProfile.id);
                                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                                    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
                                    if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not set!');
                                    const response = await fetch(`${API_BASE_URL}/api/profiles/upload-document`, {
                                      method: 'POST',
                                      body: formData,
                                      headers: { 'Authorization': `Bearer ${token || ''}` },
                                    });
                                    const result = await response.json();
                                    if (!response.ok) throw new Error(result.message || 'Upload failed');
                                    toast({ title: 'Success', description: result.message || `${doc.label} uploaded.` });
                                    setUploadFiles((prev: any) => ({ ...prev, [doc.type]: null }));
                                    refetchProfiles();
                                  } catch (error: any) {
                                    toast({ title: 'Error', description: error.message || `Failed to upload ${doc.label}`, variant: 'destructive' });
                                  }
                                }}
                              >
                                <Label htmlFor={`file-${doc.type}`} className="font-medium text-sm">{doc.label}</Label>
                                <input
                                  id={`file-${doc.type}`}
                                  type="file"
                                  title={`Upload ${doc.label}`}
                                  className="border rounded px-3 py-2 text-sm w-full"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => setUploadFiles((prev: any) => ({ ...prev, [doc.type]: e.target.files?.[0] || null }))}
                                  required
                                  aria-label={`Upload ${doc.label}`}
                                />
                                <Button type="submit" variant="outline" size="sm" title={`Upload ${doc.label}`}>Upload</Button>
                              </form>
                            ))}
                          </div>
                        </div>

                        {/* Education Certificates */}
                        <div className="mb-6">
                          <h4 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b">Education Certificates</h4>
                          <div className="space-y-3">
                            {[
                              { label: 'SSC', type: 'ssc' },
                              { label: 'HSC', type: 'hsc' },
                              { label: 'Graduation', type: 'graduation' },
                              { label: 'Post Graduation', type: 'post_graduation' },
                            ].map((doc) => (
                              <form
                                key={doc.type}
                                className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-center p-3 border rounded-lg hover:bg-white transition-colors"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const file = uploadFiles[doc.type] || null;
                                  if (!file) {
                                    toast({ title: 'Error', description: `Please select a file for ${doc.label}.`, variant: 'destructive' });
                                    return;
                                  }
                                  try {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    formData.append('type', doc.type);
                                    formData.append('user_id', selectedProfile.id);
                                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                                    const apiBase = import.meta.env.VITE_API_BASE_URL;
                                    if (!apiBase) {
                                      throw new Error('VITE_API_BASE_URL environment variable is required');
                                    }
                                    const response = await fetch(`${apiBase}/api/profiles/upload-document`, {
                                      method: 'POST',
                                      body: formData,
                                      headers: { 'Authorization': `Bearer ${token || ''}` },
                                    });
                                    const result = await response.json();
                                    if (!response.ok) throw new Error(result.message || 'Upload failed');
                                    toast({ title: 'Success', description: result.message || `${doc.label} uploaded.` });
                                    setUploadFiles((prev: any) => ({ ...prev, [doc.type]: null }));
                                    refetchProfiles();
                                  } catch (error: any) {
                                    toast({ title: 'Error', description: error.message || `Failed to upload ${doc.label}`, variant: 'destructive' });
                                  }
                                }}
                              >
                                <Label htmlFor={`file-${doc.type}`} className="font-medium text-sm">{doc.label}</Label>
                                <input
                                  id={`file-${doc.type}`}
                                  type="file"
                                  title={`Upload ${doc.label}`}
                                  className="border rounded px-3 py-2 text-sm w-full"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => setUploadFiles((prev: any) => ({ ...prev, [doc.type]: e.target.files?.[0] || null }))}
                                  required
                                  aria-label={`Upload ${doc.label}`}
                                />
                                <Button type="submit" variant="outline" size="sm" title={`Upload ${doc.label}`}>Upload</Button>
                              </form>
                            ))}
                          </div>
                        </div>

                        {/* Experience Documents */}
                        <div>
                          <h4 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b">Experience Documents</h4>
                          <div className="space-y-3">
                            {[
                              { label: 'Experience Letter', type: 'experience_letter' },
                              { label: 'Previous Company Salary Slips', type: 'salary_slip' },
                              { label: 'Previous Company Offer / Appointment Letter', type: 'offer_letter' },
                            ].map((doc) => (
                              <form
                                key={doc.type}
                                className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-center p-3 border rounded-lg hover:bg-white transition-colors"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const file = uploadFiles[doc.type] || null;
                                  if (!file) {
                                    toast({ title: 'Error', description: `Please select a file for ${doc.label}.`, variant: 'destructive' });
                                    return;
                                  }
                                  try {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    formData.append('type', doc.type);
                                    formData.append('user_id', selectedProfile.id);
                                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                                    const apiBase = import.meta.env.VITE_API_BASE_URL;
                                    if (!apiBase) {
                                      throw new Error('VITE_API_BASE_URL environment variable is required');
                                    }
                                    const response = await fetch(`${apiBase}/api/profiles/upload-document`, {
                                      method: 'POST',
                                      body: formData,
                                      headers: { 'Authorization': `Bearer ${token || ''}` },
                                    });
                                    const result = await response.json();
                                    if (!response.ok) throw new Error(result.message || 'Upload failed');
                                    toast({ title: 'Success', description: result.message || `${doc.label} uploaded.` });
                                    setUploadFiles((prev: any) => ({ ...prev, [doc.type]: null }));
                                    refetchProfiles();
                                  } catch (error: any) {
                                    toast({ title: 'Error', description: error.message || `Failed to upload ${doc.label}`, variant: 'destructive' });
                                  }
                                }}
                              >
                                <Label htmlFor={`file-${doc.type}`} className="font-medium text-sm">{doc.label}</Label>
                                <input
                                  id={`file-${doc.type}`}
                                  type="file"
                                  title={`Upload ${doc.label}`}
                                  className="border rounded px-3 py-2 text-sm w-full"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => setUploadFiles((prev: any) => ({ ...prev, [doc.type]: e.target.files?.[0] || null }))}
                                  required
                                  aria-label={`Upload ${doc.label}`}
                                />
                                <Button type="submit" variant="outline" size="sm" title={`Upload ${doc.label}`}>Upload</Button>
                              </form>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Document List */}
                    {selectedProfile.documents && selectedProfile.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedProfile.documents.map((doc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium">{doc.name || doc.type || 'Document'}</p>
                                {doc.uploaded_date && (
                                  <p className="text-xs text-gray-400">
                                    Uploaded: {format(new Date(doc.uploaded_date), "MMM dd, yyyy")}
                                  </p>
                                )}
                              </div>
                            </div>
                            {doc.url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No documents available</p>
                    )}
                  </div>
                )}

                {/* Activity Log */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
                      <div className="space-y-3">
                        {selectedProfile.updated_at && (
                          <div className="flex items-start space-x-3 pb-3 border-b">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Profile Updated</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(selectedProfile.updated_at), "MMMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedProfile.join_date && (
                          <div className="flex items-start space-x-3 pb-3 border-b">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Joined Company</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(selectedProfile.join_date), "MMMM dd, yyyy")}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedProfile.created_at && (
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Profile Created</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(selectedProfile.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        )}
                        {(!selectedProfile.updated_at && !selectedProfile.join_date && !selectedProfile.created_at) && (
                          <p className="text-sm text-gray-500">No activity recorded</p>
                        )}
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setIsDetailOpen(true);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                <Label htmlFor="email">Official Email</Label>
                <Input
                  id="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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
          </div>
          <DialogFooter>
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

/**
 * PF Management Section Component
 */
const PfManagementSection = ({ profileId, isAdmin }: { profileId: string; isAdmin: boolean }) => {
  const { data: pfDetails, isLoading: pfLoading } = usePfDetails(profileId);
  const { data: pfContributions = [], isLoading: contributionsLoading } = usePfContributions({ user_id: profileId });
  const mutations = usePayrollMutation();
  const [isEditPfOpen, setIsEditPfOpen] = useState(false);
  const [pfForm, setPfForm] = useState({
    uan_number: '',
    pf_account_number: '',
    enrollment_date: '',
    status: 'active' as 'active' | 'on_hold' | 'closed',
    employee_contribution_percent: 12,
    employer_contribution_percent: 12,
    pf_base_salary: '',
    notes: '',
  });

  useEffect(() => {
    if (pfDetails) {
      setPfForm({
        uan_number: pfDetails.uan_number || '',
        pf_account_number: pfDetails.pf_account_number || '',
        enrollment_date: pfDetails.enrollment_date || '',
        status: pfDetails.status,
        employee_contribution_percent: pfDetails.employee_contribution_percent,
        employer_contribution_percent: pfDetails.employer_contribution_percent,
        pf_base_salary: pfDetails.pf_base_salary ? String(pfDetails.pf_base_salary) : '',
        notes: pfDetails.notes || '',
      });
    }
  }, [pfDetails]);

  const handleSavePf = async () => {
    try {
      await mutations.upsertPfDetails.mutateAsync({
        data: {
          user_id: profileId,
          ...pfForm,
          pf_base_salary: pfForm.pf_base_salary ? parseFloat(pfForm.pf_base_salary) : undefined,
        },
        userId: profileId,
      });
      toast({
        title: 'Success',
        description: 'PF details saved successfully',
      });
      setIsEditPfOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save PF details',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold flex items-center space-x-2">
          <Wallet className="h-4 w-4" />
          <span>Provident Fund (PF) Details</span>
        </h4>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setIsEditPfOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            {pfDetails ? 'Edit' : 'Add'} PF Details
          </Button>
        )}
      </div>

      {pfLoading ? (
        <p className="text-sm text-gray-500">Loading PF details...</p>
      ) : pfDetails ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">UAN Number</Label>
              <p className="text-sm font-medium">{pfDetails.uan_number || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">PF Account Number</Label>
              <p className="text-sm font-medium">{pfDetails.pf_account_number || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Enrollment Date</Label>
              <p className="text-sm font-medium">
                {pfDetails.enrollment_date
                  ? format(new Date(pfDetails.enrollment_date), "MMMM dd, yyyy")
                  : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${pfDetails.status === 'active' ? 'bg-green-100 text-green-800' :
                  pfDetails.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                {pfDetails.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Employee Contribution</Label>
              <p className="text-sm font-medium">{pfDetails.employee_contribution_percent}%</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Employer Contribution</Label>
              <p className="text-sm font-medium">{pfDetails.employer_contribution_percent}%</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">PF Base Salary</Label>
              <p className="text-sm font-medium">
                {pfDetails.pf_base_salary ? `₹${pfDetails.pf_base_salary.toLocaleString()}` : 'N/A'}
              </p>
            </div>
          </div>

          {/* PF Contributions History */}
          {contributionsLoading ? (
            <p className="text-xs text-gray-500">Loading contributions...</p>
          ) : pfContributions.length > 0 ? (
            <div className="mt-4">
              <Label className="text-xs font-semibold mb-2 block">Recent PF Contributions</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pfContributions.slice(0, 5).map((contrib) => (
                  <div key={contrib.id} className="flex items-center justify-between p-2 border rounded text-xs">
                    <span>
                      {format(new Date(contrib.year, contrib.month - 1, 1), "MMM yyyy")}
                    </span>
                    <span className="font-medium">
                      ₹{contrib.total_contribution.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No PF details available</p>
      )}

      {/* Edit PF Dialog */}
      <Dialog open={isEditPfOpen} onOpenChange={setIsEditPfOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit PF Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="uan_number">UAN Number</Label>
                <Input
                  id="uan_number"
                  value={pfForm.uan_number}
                  onChange={(e) => setPfForm({ ...pfForm, uan_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pf_account_number">PF Account Number</Label>
                <Input
                  id="pf_account_number"
                  value={pfForm.pf_account_number}
                  onChange={(e) => setPfForm({ ...pfForm, pf_account_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="enrollment_date">Enrollment Date</Label>
                <Input
                  id="enrollment_date"
                  type="date"
                  value={pfForm.enrollment_date}
                  onChange={(e) => setPfForm({ ...pfForm, enrollment_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pf_status">Status</Label>
                <select
                  id="pf_status"
                  value={pfForm.status}
                  onChange={(e) => setPfForm({ ...pfForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <Label htmlFor="employee_contribution_percent">Employee Contribution %</Label>
                <Input
                  id="employee_contribution_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={pfForm.employee_contribution_percent}
                  onChange={(e) => setPfForm({ ...pfForm, employee_contribution_percent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="employer_contribution_percent">Employer Contribution %</Label>
                <Input
                  id="employer_contribution_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={pfForm.employer_contribution_percent}
                  onChange={(e) => setPfForm({ ...pfForm, employer_contribution_percent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="pf_base_salary">PF Base Salary</Label>
                <Input
                  id="pf_base_salary"
                  type="number"
                  step="0.01"
                  value={pfForm.pf_base_salary}
                  onChange={(e) => setPfForm({ ...pfForm, pf_base_salary: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pf_notes">Notes</Label>
              <Textarea
                id="pf_notes"
                value={pfForm.notes}
                onChange={(e) => setPfForm({ ...pfForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSavePf}
              disabled={mutations.upsertPfDetails.isPending}
            >
              {mutations.upsertPfDetails.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
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
