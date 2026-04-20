/**
 * Exit Formalities Page - Extended with All Features
 * Manage employee exit workflow with Asset Recovery, Settlement, Compliance, etc.
 * LAD Architecture: Uses SDK hooks only
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useExitRequests, useExitRequest, useExitMutation, useCalculateSettlement } from '@/sdk/features/exit-formalities';
import type { ExitStatus } from '@/sdk/features/exit-formalities';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUsers } from '@/hooks/useUsers';
import { useExitAssetRecovery, useExitDeprovisioning, useExitCompliance, useExitSettlementDetails, useExitDues, useExitFeatureMutation } from './hooks/useExitFeatures';
import {
  LogOut,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  Building,
  Trash2,
  Package,
  Shield,
  DollarSign,
  FileText,
  TrendingUp,
  AlertTriangle,
  Download,
  Percent,
} from 'lucide-react';
import { format } from 'date-fns';
import { SettlementTab } from './components/SettlementTab';
import { DocumentGenerator } from './components/DocumentGenerator';
import { TableSkeleton } from '@/components/PageSkeletons';

type ExitStatusFilter = 'all' | ExitStatus;
type DetailTab = 'overview' | 'assets' | 'deprovisioning' | 'settlement' | 'pf-gratuity' | 'compliance' | 'progress';

const ExitFormalities = () => {
  const [statusFilter, setStatusFilter] = useState<ExitStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExit, setSelectedExit] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInitiateOpen, setIsInitiateOpen] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr';

  const [initiateForm, setInitiateForm] = useState({
    user_id: '',
    resignation_date: '',
    last_working_day: '',
    reason_category: '',
    reason_details: '',
    resignation_letter_url: '',
    exit_type: 'Resignation' as 'Resignation' | 'Termination' | 'Absconded' | 'Contract End',
  });

  const [pfManagement, setPFManagement] = useState<any>(null);
  const [gratuity, setGratuity] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data: exitRequests = [], isLoading: requestsLoading, refetch } = useExitRequests(filters);
  const { data: exitRequestDetail, isLoading: detailLoading } = useExitRequest(selectedExit);
  const mutations = useExitMutation();
  const { data: usersData = [] } = useUsers();

  // Feature Hooks
  const { data: assetsData } = useExitAssetRecovery(selectedExit);
  const { data: deprovisioningData } = useExitDeprovisioning(selectedExit);
  const { data: complianceData } = useExitCompliance(selectedExit);
  const { data: settlementData } = useExitSettlementDetails(selectedExit);
  const { data: duesData } = useExitDues(selectedExit);
  const featureMutations = useExitFeatureMutation();
  const calculateSettlementMutation = useCalculateSettlement();

  const assets = assetsData?.assets || [];
  const deprovisioning = deprovisioningData?.deprovisioning || [];
  const compliance = complianceData?.compliance || [];
  const settlement = settlementData?.settlement || null;
  const payableDues = duesData?.payable || [];
  const recoverableDues = duesData?.recoverable || [];

  const progress = useMemo(() => {
    if (!exitRequestDetail?.exit_request) return 0;
    const req = exitRequestDetail.exit_request;

    const statusProgress: Record<string, number> = {
      'initiated': 10,
      'manager_approved': 20,
      'hr_approved': 40,
      'clearance_completed': 60,
      'settlement_pending': 80,
      'completed': 100,
      'rejected': 0,
    };

    return statusProgress[req.status] || 0;
  }, [exitRequestDetail]);

  const isLoading = requestsLoading || (selectedExit && detailLoading);

  // Filter by search query
  const filteredExits = exitRequests.filter((exit: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exit.full_name?.toLowerCase().includes(query) ||
      exit.email?.toLowerCase().includes(query) ||
      exit.employee_id?.toLowerCase().includes(query) ||
      exit.department?.toLowerCase().includes(query)
    );
  });

  const handleInitiateExit = async () => {
    if (!initiateForm.resignation_date || !initiateForm.last_working_day) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      let targetFullName = userData.full_name || 'Employee';
      let targetUserId = userData.id;
      let targetEmployeeId = userData.employee_id;
      let targetDepartment = userData.department;

      if (isAdmin && initiateForm.user_id) {
        const selectedUser = usersData.find((u: any) => u.id === initiateForm.user_id);
        if (selectedUser) {
          targetFullName = selectedUser.full_name || selectedUser.name || 'Employee';
          targetUserId = selectedUser.id;
          targetEmployeeId = selectedUser.employee_id;
          targetDepartment = selectedUser.department;
        }
      }

      await mutations.createExitRequest.mutateAsync({
        user_id: targetUserId,
        employee_id: targetEmployeeId,
        full_name: targetFullName,
        department: targetDepartment,
        resignation_date: initiateForm.resignation_date,
        last_working_day: initiateForm.last_working_day,
        reason_category: initiateForm.reason_category,
        reason_details: initiateForm.reason_details,
        resignation_letter_url: initiateForm.resignation_letter_url,
        exit_type: initiateForm.exit_type,
      });

      toast({ title: 'Success', description: 'Exit request submitted successfully' });
      setIsInitiateOpen(false);
      setInitiateForm({
        user_id: '',
        resignation_date: '',
        last_working_day: '',
        reason_category: '',
        reason_details: '',
        resignation_letter_url: '',
        exit_type: 'Resignation',
      });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to submit exit request', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string, role: 'manager' | 'hr') => {
    try {
      await mutations.approveExitRequest.mutateAsync({ id, data: { role } });
      toast({ title: 'Success', description: `Exit request ${role === 'manager' ? 'manager' : 'HR'} approved` });
      refetch();
      setIsDetailOpen(false);
      setSelectedExit(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleCalculateSettlement = async () => {
    if (!selectedExit) return;
    try {
      setLoading(true);
      toast({ title: 'Processing', description: 'Calculating settlement...' });

      // Real implementation using the mutation hook
      await calculateSettlementMutation.mutateAsync({ exitRequestId: selectedExit });

      toast({ title: 'Success', description: 'Settlement calculated successfully' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to calculate settlement', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ExitStatus): string => {
    switch (status) {
      case 'initiated': return 'bg-yellow-100 text-yellow-800';
      case 'manager_approved': return 'bg-blue-100 text-blue-800';
      case 'hr_approved': return 'bg-purple-100 text-purple-800';
      case 'clearance_pending': return 'bg-orange-100 text-orange-800';
      case 'clearance_completed': return 'bg-green-100 text-green-800';
      case 'settlement_pending': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ExitStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const statusCounts = {
    initiated: exitRequests.filter((e) => e.status === 'initiated').length,
    manager_approved: exitRequests.filter((e) => e.status === 'manager_approved').length,
    hr_approved: exitRequests.filter((e) => e.status === 'hr_approved').length,
    clearance_pending: exitRequests.filter((e) => e.status === 'clearance_pending').length,
    completed: exitRequests.filter((e) => e.status === 'completed').length,
  };

  const tabs: { id: DetailTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'deprovisioning', label: 'De-Provisioning', icon: Shield },
    { id: 'settlement', label: 'Settlement', icon: DollarSign },
    { id: 'pf-gratuity', label: 'PF & Gratuity', icon: TrendingUp },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle },
    { id: 'progress', label: 'Progress & Reports', icon: Percent },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exit Formalities</h1>
          <p className="text-gray-500 mt-1">Complete Exit Management with Asset Recovery, Settlement & Compliance</p>
        </div>
        <Button onClick={() => setIsInitiateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Initiate Exit
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.initiated}</div>
            <div className="text-sm text-gray-500">Initiated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.manager_approved}</div>
            <div className="text-sm text-gray-500">Manager Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.hr_approved}</div>
            <div className="text-sm text-gray-500">HR Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.clearance_pending}</div>
            <div className="text-sm text-gray-500">Clearance Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{statusCounts.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ExitStatusFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="initiated">Initiated</option>
                <option value="manager_approved">Manager Approved</option>
                <option value="hr_approved">HR Approved</option>
                <option value="clearance_pending">Clearance Pending</option>
                <option value="clearance_completed">Clearance Completed</option>
                <option value="settlement_pending">Settlement Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exit Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : filteredExits.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <LogOut className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No exit requests found</p>
            </CardContent>
          </Card>
        ) : (
          filteredExits.map((exit) => (
            <Card
              key={exit.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedExit(exit.id);
                setIsDetailOpen(true);
                setActiveTab('overview');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold">
                      {exit.full_name?.charAt(0) || 'E'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{exit.full_name}</h3>
                        {exit.employee_id && (
                          <span className="text-xs text-gray-500">({exit.employee_id})</span>
                        )}
                        {exit.exit_type && (
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">{exit.exit_type}</span>
                        )}
                        {exit.exit_progress_percentage !== undefined && (
                          <span className="text-xs px-2 py-1 bg-blue-100 rounded">
                            {exit.exit_progress_percentage}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        {exit.department && (
                          <span className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{exit.department}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Last Day: {format(new Date(exit.last_working_day), 'MMM dd, yyyy')}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(
                          exit.status
                        )}`}
                      >
                        {getStatusIcon(exit.status)}
                        <span>{exit.status.replace('_', ' ').toUpperCase()}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Exit Detail Dialog with Tabs */}
      {selectedExit && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Exit Request Details</span>
                {exitRequestDetail?.exit_request.exit_progress_percentage !== undefined && (
                  <div className="flex items-center space-x-2">
                    <Percent className="h-4 w-4" />
                    <span className="text-sm font-normal">
                      {exitRequestDetail.exit_request.exit_progress_percentage}% Complete
                    </span>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex space-x-1 border-b">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {detailLoading || loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : exitRequestDetail ? (
              <div className="space-y-6 mt-4">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <>
                    {/* Basic Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Employee Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">Full Name</Label>
                            <p className="text-sm font-medium">{exitRequestDetail.exit_request.full_name}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Employee ID</Label>
                            <p className="text-sm font-medium">
                              {exitRequestDetail.exit_request.employee_id || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Department</Label>
                            <p className="text-sm font-medium">
                              {exitRequestDetail.exit_request.department || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Exit Type</Label>
                            <p className="text-sm font-medium">
                              {exitRequestDetail.exit_request.exit_type || 'Resignation'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Exit Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Exit Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">Resignation Date</Label>
                            <p className="text-sm font-medium">
                              {format(new Date(exitRequestDetail.exit_request.resignation_date), 'MMMM dd, yyyy')}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Last Working Day</Label>
                            <p className="text-sm font-medium">
                              {format(new Date(exitRequestDetail.exit_request.last_working_day), 'MMMM dd, yyyy')}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Status</Label>
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                exitRequestDetail.exit_request.status
                              )}`}
                            >
                              {exitRequestDetail.exit_request.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Clearance Checklist */}
                    {exitRequestDetail.clearance && exitRequestDetail.clearance.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Clearance Checklist</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {exitRequestDetail.clearance.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div>
                                  <p className="font-medium">{item.department}</p>
                                  {item.comments && (
                                    <p className="text-xs text-gray-500 mt-1">{item.comments}</p>
                                  )}
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : item.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                >
                                  {item.status.toUpperCase()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Document Generator */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <span>Generate Documents</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DocumentGenerator
                          exitRequestId={exitRequestDetail.exit_request.id}
                          employeeName={exitRequestDetail.exit_request.full_name}
                          employeeId={exitRequestDetail.exit_request.employee_id || undefined}
                        />
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Assets Tab */}
                {activeTab === 'assets' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Asset Recovery</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {assets.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No assets found</p>
                      ) : (
                        <div className="space-y-3">
                          {assets.map((asset: any) => (
                            <div key={asset.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{asset.asset_name}</p>
                                  <p className="text-sm text-gray-500">{asset.asset_id}</p>
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${asset.recovery_status === 'returned'
                                    ? 'bg-green-100 text-green-800'
                                    : asset.recovery_status === 'lost' || asset.recovery_status === 'damaged'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                >
                                  {asset.recovery_status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* De-Provisioning Tab */}
                {activeTab === 'deprovisioning' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">System Access De-Provisioning</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {deprovisioning.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500 mb-4">No systems configured</p>
                          {isAdmin && (
                            <Button onClick={async () => {
                              try {
                                await featureMutations.autoRevokeAccess.mutateAsync(selectedExit!);
                                refetch();
                                toast({ title: 'Success', description: 'Access auto-revoked' });
                              } catch (error: any) {
                                toast({ title: 'Error', description: error.message, variant: 'destructive' });
                              }
                            }}>
                              Auto-Revoke Access
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {deprovisioning.map((item: any) => (
                            <div key={item.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{item.system_name}</p>
                                  <p className="text-sm text-gray-500">{item.system_type}</p>
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'revoked'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                >
                                  {item.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Settlement Tab */}
                {activeTab === 'settlement' && exitRequestDetail && (
                  <SettlementTab
                    exitRequest={exitRequestDetail.exit_request}
                    isAdmin={isAdmin}
                    onRefresh={refetch}
                  />
                )}

                {/* PF & Gratuity Tab */}
                {activeTab === 'pf-gratuity' && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">PF Management</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!pfManagement ? (
                          <p className="text-gray-500">PF exit not initiated</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-gray-500">PF Exit Status</Label>
                                <p className="text-sm font-medium">
                                  {pfManagement.pf_exit_initiated ? 'Initiated' : 'Not Initiated'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Withdrawal Amount</Label>
                                <p className="text-sm font-medium">₹{pfManagement.pf_withdrawal_amount.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Gratuity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!gratuity ? (
                          <p className="text-gray-500">Gratuity not calculated</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-gray-500">Eligible</Label>
                                <p className="text-sm font-medium">{gratuity.eligible ? 'Yes' : 'No'}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Years of Service</Label>
                                <p className="text-sm font-medium">{gratuity.years_of_service}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Gratuity Amount</Label>
                                <p className="text-lg font-bold text-green-600">₹{gratuity.gratuity_amount.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Compliance Tab */}
                {activeTab === 'compliance' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Compliance Checklist</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {compliance.length === 0 ? (
                        <p className="text-gray-500">No compliance items</p>
                      ) : (
                        <div className="space-y-2">
                          {compliance.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{item.compliance_item}</p>
                                {item.remarks && (
                                  <p className="text-xs text-gray-500 mt-1">{item.remarks}</p>
                                )}
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : item.status === 'not_applicable'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                  }`}
                              >
                                {item.status.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Progress & Reports Tab */}
                {activeTab === 'progress' && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Exit Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm font-medium">Overall Progress</Label>
                              <span className="text-sm font-bold">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                              <div
                                className="bg-blue-600 h-4 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {risks.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            <span>Asset Risks</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {risks.map((risk: any) => (
                              <div key={risk.id} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{risk.asset_name || 'General Risk'}</p>
                                    <p className="text-sm text-gray-500">{risk.risk_reason}</p>
                                  </div>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${risk.risk_level === 'critical'
                                      ? 'bg-red-100 text-red-800'
                                      : risk.risk_level === 'high'
                                        ? 'bg-orange-100 text-orange-800'
                                        : risk.risk_level === 'medium'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                  >
                                    {risk.risk_level.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    {isAdmin && exitRequestDetail.exit_request.status === 'initiated' && (
                      <Button
                        onClick={() => handleApprove(exitRequestDetail.exit_request.id, 'manager')}
                        variant="default"
                        disabled={mutations.approveExitRequest.isPending}
                      >
                        {mutations.approveExitRequest.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve as Manager
                          </>
                        )}
                      </Button>
                    )}
                    {isAdmin &&
                      (exitRequestDetail.exit_request.status === 'clearance_completed' ||
                        exitRequestDetail.exit_request.status === 'settlement_pending') && (
                        <Button
                          onClick={() => {
                            mutations.completeExit.mutate(exitRequestDetail.exit_request.id, {
                              onSuccess: () => {
                                toast({
                                  title: 'Success',
                                  description: 'Exit completed successfully',
                                });
                                setIsDetailOpen(false);
                                refetch();
                              },
                              onError: (error: any) => {
                                toast({
                                  title: 'Error',
                                  description: error.message || 'Failed to complete exit',
                                  variant: 'destructive',
                                });
                              },
                            });
                          }}
                          variant="default"
                          disabled={mutations.completeExit.isPending}
                        >
                          {mutations.completeExit.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete Exit
                            </>
                          )}
                        </Button>
                      )}
                  </div>
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Failed to load exit request details</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Initiate Exit Dialog */}
      <Dialog open={isInitiateOpen} onOpenChange={setIsInitiateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Initiate Exit Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isAdmin && (
              <div>
                <Label htmlFor="exit_user">Select Employee *</Label>
                <select
                  id="exit_user"
                  value={initiateForm.user_id}
                  onChange={(e) => setInitiateForm({ ...initiateForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Ensure Employee is selected --</option>
                  {usersData.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.name} {user.employee_id ? `(${user.employee_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label htmlFor="exit_type">Exit Type *</Label>
              <select
                id="exit_type"
                value={initiateForm.exit_type}
                onChange={(e) =>
                  setInitiateForm({ ...initiateForm, exit_type: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Resignation">Resignation</option>
                <option value="Termination">Termination</option>
                <option value="Absconded">Absconded</option>
                <option value="Contract End">Contract End</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resignation_date">Resignation Date *</Label>
                <Input
                  id="resignation_date"
                  type="date"
                  value={initiateForm.resignation_date}
                  onChange={(e) => setInitiateForm({ ...initiateForm, resignation_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="last_working_day">Last Working Day *</Label>
                <Input
                  id="last_working_day"
                  type="date"
                  value={initiateForm.last_working_day}
                  onChange={(e) => setInitiateForm({ ...initiateForm, last_working_day: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reason_category">Reason Category</Label>
              <select
                id="reason_category"
                value={initiateForm.reason_category}
                onChange={(e) => setInitiateForm({ ...initiateForm, reason_category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select reason</option>
                <option value="Personal">Personal</option>
                <option value="Better Opportunity">Better Opportunity</option>
                <option value="Relocation">Relocation</option>
                <option value="Health">Health</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reason_details">Reason Details</Label>
              <Textarea
                id="reason_details"
                value={initiateForm.reason_details}
                onChange={(e) => setInitiateForm({ ...initiateForm, reason_details: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="resignation_letter_url">Resignation Letter URL</Label>
              <Input
                id="resignation_letter_url"
                value={initiateForm.resignation_letter_url}
                onChange={(e) =>
                  setInitiateForm({ ...initiateForm, resignation_letter_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInitiateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInitiateExit}
              disabled={mutations.createExitRequest.isPending}
            >
              {mutations.createExitRequest.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Submit Exit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExitFormalities;

