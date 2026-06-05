/**
 * Exit Formalities Page
 * Manage employee exit workflow
 * LAD Architecture: Uses SDK hooks only
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useExitRequests, useExitRequest, useExitMutation } from '@/sdk/features/exit-formalities';
import type { ExitStatus } from '@/sdk/features/exit-formalities';
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
} from 'lucide-react';
import { format } from 'date-fns';

type ExitStatusFilter = 'all' | ExitStatus;

const ExitFormalities = () => {
  const [statusFilter, setStatusFilter] = useState<ExitStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExit, setSelectedExit] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInitiateOpen, setIsInitiateOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initiateForm, setInitiateForm] = useState({
    resignation_date: '',
    last_working_day: '',
    reason_category: '',
    reason_details: '',
    resignation_letter_url: '',
  });

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data: exitRequests = [], isLoading, refetch } = useExitRequests(filters);
  const { data: exitRequestDetail, isLoading: detailLoading } = useExitRequest(selectedExit);
  const mutations = useExitMutation();

  // Check admin status
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setIsAdmin(userData.role === 'admin' || userData.role === 'hr');
  }, []);

  // Filter by search query
  const filteredExits = exitRequests.filter((exit) => {
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
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      await mutations.createExitRequest.mutateAsync({
        full_name: userData.full_name || 'Employee',
        resignation_date: initiateForm.resignation_date,
        last_working_day: initiateForm.last_working_day,
        reason_category: initiateForm.reason_category,
        reason_details: initiateForm.reason_details,
        resignation_letter_url: initiateForm.resignation_letter_url,
      });

      toast({
        title: 'Success',
        description: 'Exit request submitted successfully',
      });
      setIsInitiateOpen(false);
      setInitiateForm({
        resignation_date: '',
        last_working_day: '',
        reason_category: '',
        reason_details: '',
        resignation_letter_url: '',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit exit request',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (id: string, role: 'manager' | 'hr') => {
    try {
      await mutations.approveExitRequest.mutateAsync({ id, data: { role } });
      toast({
        title: 'Success',
        description: `Exit request ${role === 'manager' ? 'manager' : 'HR'} approved`,
      });
      // Refresh the list
      refetch();
      // Close the dialog
      setIsDetailOpen(false);
      // Clear selected exit to force refresh when reopened
      setSelectedExit(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: ExitStatus): string => {
    switch (status) {
      case 'initiated':
        return 'bg-yellow-100 text-yellow-800';
      case 'manager_approved':
        return 'bg-blue-100 text-blue-800';
      case 'hr_approved':
        return 'bg-purple-100 text-purple-800';
      case 'clearance_pending':
        return 'bg-orange-100 text-orange-800';
      case 'clearance_completed':
        return 'bg-green-100 text-green-800';
      case 'settlement_pending':
        return 'bg-indigo-100 text-indigo-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exit Formalities</h1>
          <p className="text-gray-500 mt-1">Manage employee exit workflow and clearance</p>
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
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
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

      {/* Exit Detail Dialog */}
      {selectedExit && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Exit Request Details</DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : exitRequestDetail ? (
              <div className="space-y-6">
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
                        <Label className="text-xs text-gray-500">Reporting Manager</Label>
                        <p className="text-sm font-medium">
                          {exitRequestDetail.exit_request.manager_name || 'N/A'}
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
                        <Label className="text-xs text-gray-500">Reason Category</Label>
                        <p className="text-sm font-medium">
                          {exitRequestDetail.exit_request.reason_category || 'N/A'}
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
                    {exitRequestDetail.exit_request.reason_details && (
                      <div>
                        <Label className="text-xs text-gray-500">Reason Details</Label>
                        <p className="text-sm text-gray-700 mt-1">
                          {exitRequestDetail.exit_request.reason_details}
                        </p>
                      </div>
                    )}
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
                        {exitRequestDetail.clearance.map((item) => (
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
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.status === 'approved'
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

                {/* Activity Log */}
                {exitRequestDetail.activity_log && exitRequestDetail.activity_log.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Activity Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {exitRequestDetail.activity_log.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.action.replace('_', ' ')}</p>
                              <p className="text-xs text-gray-500">
                                {activity.performed_by_name} •{' '}
                                {format(new Date(activity.created_at), 'MMM dd, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* Admin/HR Actions */}
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
                    {isAdmin && exitRequestDetail.exit_request.status === 'manager_approved' && (
                      <Button
                        onClick={() => handleApprove(exitRequestDetail.exit_request.id, 'hr')}
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
                            Approve as HR
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
                    {/* Delete button - Admin/HR only */}
                    {isAdmin && (
                      <Button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this exit request? This action cannot be undone.')) {
                            mutations.deleteExitRequest.mutate(exitRequestDetail.exit_request.id, {
                              onSuccess: () => {
                                toast({
                                  title: 'Success',
                                  description: 'Exit request deleted successfully',
                                });
                                setIsDetailOpen(false);
                                setSelectedExit(null);
                                refetch();
                              },
                              onError: (error: any) => {
                                toast({
                                  title: 'Error',
                                  description: error.message || 'Failed to delete exit request',
                                  variant: 'destructive',
                                });
                              },
                            });
                          }
                        }}
                        variant="destructive"
                        disabled={mutations.deleteExitRequest.isPending}
                      >
                        {mutations.deleteExitRequest.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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

