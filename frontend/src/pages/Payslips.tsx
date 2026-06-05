/**
 * Payslips Page - Employee Salary Management & Payslip Generation
 * Shows all employees with bank details, salary info, and per-employee actions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  useEmployeesSalaryInfo,
  usePayrollMutation,
  type EmployeeSalaryInfo
} from '@/sdk/features/payroll-pf';
import {
  Search,
  DollarSign,
  Building2,
  CreditCard,
  Edit,
  Save,
  X,
  Wand2,
  RefreshCw,
  FileText,
  Calendar,
} from 'lucide-react';

const Payslips = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSalary, setEditingSalary] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState<number>(0);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSalaryInfo | null>(null);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);
    setIsAdmin(userData.role === 'admin' || userData.role === 'hr');
  }, []);

  const { data: employees = [], isLoading, refetch } = useEmployeesSalaryInfo();
  const mutations = usePayrollMutation();

  // Filter employees by search query
  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      emp.account_number?.toLowerCase().includes(query)
    );
  });

  const handleEditSalary = (employee: EmployeeSalaryInfo) => {
    setEditingSalary(employee.id);
    setSalaryForm(employee.pf_base_salary || 0);
  };

  const handleSaveSalary = async (employeeId: string) => {
    try {
      await mutations.updateEmployeeSalary.mutateAsync({
        userId: employeeId,
        pf_base_salary: salaryForm,
      });
      toast({
        title: 'Success',
        description: 'Salary updated successfully',
      });
      setEditingSalary(null);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update salary',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingSalary(null);
    setSalaryForm(0);
  };

  const handleGeneratePayslip = (employee: EmployeeSalaryInfo) => {
    setSelectedEmployee(employee);
    setIsGenerateOpen(true);
  };

  const handleConfirmGenerate = async () => {
    if (!selectedEmployee) return;

    try {
      await mutations.generatePayslipForEmployee.mutateAsync({
        employee_id: selectedEmployee.id,
        month,
        year,
      });
      toast({
        title: 'Success',
        description: `Payslip generated for ${selectedEmployee.full_name}`,
      });
      setIsGenerateOpen(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate payslip',
        variant: 'destructive',
      });
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Salary Management</h1>
          <p className="text-gray-500 mt-1">
            Manage employee salaries, bank details, and generate payslips
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, department, or account number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Loading employees...</p>
            </CardContent>
          </Card>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No employees found</p>
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Employee Info - 3 cols */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold text-lg">
                        {employee.full_name?.charAt(0) || 'E'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{employee.full_name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-500">{employee.email}</p>
                        {employee.department && (
                          <p className="text-xs text-gray-400 mt-1">
                            <Building2 className="h-3 w-3 inline mr-1" />
                            {employee.department}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bank Details - 3 cols */}
                  <div className="lg:col-span-3 border-l pl-6">
                    <Label className="text-xs text-gray-500 mb-2 block">
                      <CreditCard className="h-3 w-3 inline mr-1" />
                      Bank Details
                    </Label>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {employee.bank_name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600">
                        A/C: {employee.account_number || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600">
                        IFSC: {employee.ifsc || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Salary Details - 4 cols */}
                  <div className="lg:col-span-4 border-l pl-6">
                    <Label className="text-xs text-gray-500 mb-2 block">
                      <DollarSign className="h-3 w-3 inline mr-1" />
                      Salary Breakdown
                    </Label>
                    {editingSalary === employee.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Gross Salary</Label>
                          <Input
                            type="number"
                            value={salaryForm}
                            onChange={(e) => setSalaryForm(parseFloat(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Basic (50%)</span>
                            <p className="font-medium">₹{Math.round(salaryForm * 0.5).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">HRA (45%)</span>
                            <p className="font-medium">₹{Math.round(salaryForm * 0.45).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Other (5%)</span>
                            <p className="font-medium">₹{Math.round(salaryForm * 0.05).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveSalary(employee.id)}
                            disabled={mutations.updateEmployeeSalary.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-600">
                            ₹{employee.gross_salary.toLocaleString()}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditSalary(employee)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Basic</span>
                            <p className="font-medium">₹{employee.basic_salary.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">HRA</span>
                            <p className="font-medium">₹{employee.hra.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Other</span>
                            <p className="font-medium">₹{employee.other_allowances.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions - 2 cols */}
                  <div className="lg:col-span-2 border-l pl-6 flex items-center justify-center">
                    <Button
                      onClick={() => handleGeneratePayslip(employee)}
                      disabled={mutations.generatePayslipForEmployee.isPending}
                      className="w-full"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Payslip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Generate Payslip Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Payslip from Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">
              Generate payslip for <strong>{selectedEmployee?.full_name}</strong> based on attendance records for the selected period.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month</Label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full p-2 border rounded mt-1"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
            {selectedEmployee && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <Label className="text-xs text-gray-600 mb-2 block">Expected Salary Breakdown</Label>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Gross</span>
                      <p className="font-semibold">₹{selectedEmployee.gross_salary.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Basic</span>
                      <p className="font-semibold">₹{selectedEmployee.basic_salary.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">HRA</span>
                      <p className="font-semibold">₹{selectedEmployee.hra.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Other</span>
                      <p className="font-semibold">₹{selectedEmployee.other_allowances.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Actual payslip will be prorated based on attendance and LOP days
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmGenerate}
              disabled={mutations.generatePayslipForEmployee.isPending}
            >
              {mutations.generatePayslipForEmployee.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Payslip
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payslips;
