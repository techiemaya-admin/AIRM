import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePfDetails, usePfContributions, usePayrollMutation } from "@/sdk/features/payroll-pf";
import { toast } from "@/hooks/use-toast";
import { Wallet, Edit, RefreshCw, Save } from "lucide-react";
import { format } from "date-fns";

/**
 * PF Management Section Component
 */
export const PfManagementSection = ({ profileId, isAdmin }: { profileId: string; isAdmin: boolean }) => {
  const { data: pfDetails, isLoading: pfLoading } = usePfDetails(profileId);
  const { data: pfContributions = [], isLoading: contributionsLoading } = usePfContributions({ user_id: profileId });
  const mutations = usePayrollMutation();
  const [isEditPfOpen, setIsEditPfOpen] = useState(false);
  const [pfForm, setPfForm] = useState<{
    uan_number: string;
    pf_account_number: string;
    enrollment_date: string;
    status: string;
    employee_contribution_percent: number;
    employer_contribution_percent: number;
    pf_base_salary: string;
    notes: string;
  }>({
    uan_number: '',
    pf_account_number: '',
    enrollment_date: '',
    status: 'active',
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
          status: pfForm.status as 'active' | 'on_hold' | 'closed',
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
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                pfDetails.status === 'active' ? 'bg-green-100 text-green-800' :
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
            <Button variant="outline" onClick={() => setIsEditPfOpen(false)}>
              Cancel
            </Button>
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

