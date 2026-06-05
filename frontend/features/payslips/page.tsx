/**
 * Payslips Page - Employee Salary Management & Payslip Generation
 * Shows all employees with bank details, salary info, and per-employee actions
 * Also shows existing payslips list below the employee table
 * LAD Architecture: Uses SDK hooks only
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  usePayslips,
  usePayslip,
  usePayrollMutation,
  useEmployeesSalaryInfo,
  type EmployeeSalaryInfo
} from '../payroll-pf';
import type { Payslip } from '@/sdk/features/payroll-pf';
import { TableSkeleton } from '@/components/PageSkeletons';
import { generatePayslipPDF } from '../payroll-pf/utils/payslip-pdf-generator';
import {
  FileText,
  Download,
  Search,
  Calendar,
  RefreshCw,
  Plus,
  Lock,
  Edit,
  CheckCircle,
  Clock,
  DollarSign,
  Wand2,
  Save,
  X,
  Building2,
  CreditCard,
  User,
  ChevronDown,
  ChevronUp,
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

  // Payslip detail view
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Section toggle
  const [showPayslipsList, setShowPayslipsList] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);
    setIsAdmin(userData.role === 'admin' || userData.role === 'hr');
  }, []);

  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useEmployeesSalaryInfo();
  const { data: payslips = [], isLoading: payslipsLoading, refetch: refetchPayslips } = usePayslips({ upcoming_only: true });
  const { data: payslipDetail, isLoading: detailLoading } = usePayslip(selectedPayslip);
  const mutations = usePayrollMutation();

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      emp.employee_id?.toLowerCase().includes(query) ||
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
      toast({ title: 'Success', description: 'Salary updated successfully' });
      setEditingSalary(null);
      refetchEmployees();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update salary', variant: 'destructive' });
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
      toast({ title: 'Success', description: `Payslip generated for ${selectedEmployee.full_name}` });
      setIsGenerateOpen(false);
      setSelectedEmployee(null);
      refetchPayslips();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate payslip', variant: 'destructive' });
    }
  };

  const handleViewPayslip = (payslipId: string) => {
    setSelectedPayslip(payslipId);
    setIsDetailOpen(true);
  };

  const handleDownloadPayslip = (payslip: Payslip) => {
    try {
      generatePayslipPDF(payslip);
      toast({ title: 'Success', description: 'Payslip PDF downloaded' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'released': return 'bg-green-100 text-green-700';
      case 'locked': return 'bg-red-100 text-red-700';
      case 'generated': return 'bg-blue-100 text-blue-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'released': return <CheckCircle className="h-3 w-3" />;
      case 'locked': return <Lock className="h-3 w-3" />;
      case 'generated': return <FileText className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payslips</h2>
          <p className="text-gray-500 mt-1">
            Manage employee salaries, bank details, and generate payslips
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchEmployees(); refetchPayslips(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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

      {/* Employee Salary & Bank Details Table */}
      <div className="space-y-3">
        {employeesLoading ? (
          <TableSkeleton />
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No employees found</p>
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow border border-gray-200">
              <CardContent className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

                  {/* Employee Info - 3 cols */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {employee.full_name?.charAt(0)?.toUpperCase() || 'E'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{employee.full_name || 'Unknown'}</h3>
                        <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                        {employee.department && (
                          <span className="inline-flex items-center text-xs text-gray-400 mt-0.5">
                            <Building2 className="h-3 w-3 mr-1 flex-shrink-0" />
                            {employee.department}
                          </span>
                        )}
                        {employee.designation && (
                          <p className="text-xs text-gray-400">{employee.designation}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bank Details - 3 cols */}
                  <div className="lg:col-span-3 lg:border-l lg:pl-4">
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Bank Details
                    </p>
                    {employee.bank_name ? (
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{employee.bank_name}</p>
                        <p className="text-xs text-gray-600">A/C: {employee.account_number || 'N/A'}</p>
                        <p className="text-xs text-gray-600">IFSC: {employee.ifsc || 'N/A'}</p>
                        {employee.bank_branch && (
                          <p className="text-xs text-gray-500">Branch: {employee.bank_branch}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No bank details</p>
                    )}
                  </div>

                  {/* Salary Details - 4 cols */}
                  <div className="lg:col-span-4 lg:border-l lg:pl-4">
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Salary Breakdown
                    </p>
                    {editingSalary === employee.id ? (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-gray-500">Gross Salary (CTC)</Label>
                          <Input
                            type="number"
                            value={salaryForm}
                            onChange={(e) => setSalaryForm(parseFloat(e.target.value) || 0)}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-gray-50 rounded p-1.5">
                            <span className="text-gray-500">Basic (50%)</span>
                            <p className="font-semibold">₹{Math.round(salaryForm * 0.5).toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-1.5">
                            <span className="text-gray-500">HRA (45%)</span>
                            <p className="font-semibold">₹{Math.round(salaryForm * 0.45).toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-1.5">
                            <span className="text-gray-500">Other (5%)</span>
                            <p className="font-semibold">₹{Math.round(salaryForm * 0.05).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveSalary(employee.id)}
                            disabled={mutations.updateEmployeeSalary.isPending}>
                            <Save className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCancelEdit}>
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-blue-600">
                            Gross: ₹{(employee.gross_salary || 0).toLocaleString()}
                          </span>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEditSalary(employee)}>
                              <Edit className="h-3 w-3 text-gray-400 hover:text-blue-600" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Basic</span>
                            <p className="font-medium">₹{(employee.basic_salary || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">HRA</span>
                            <p className="font-medium">₹{(employee.hra || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Other</span>
                            <p className="font-medium">₹{(employee.other_allowances || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions - 2 cols */}
                  <div className="lg:col-span-2 lg:border-l lg:pl-4 flex items-center">
                    {isAdmin && (
                      <Button
                        size="sm"
                        onClick={() => handleGeneratePayslip(employee)}
                        disabled={mutations.generatePayslipForEmployee.isPending}
                        className="w-full text-xs"
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        Generate Payslip
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Existing Payslips Section */}
      <Card>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowPayslipsList(!showPayslipsList)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Generated Payslips ({payslips.length})
            </CardTitle>
            {showPayslipsList ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showPayslipsList && (
          <CardContent className="pt-0">
            {payslipsLoading ? (
              <TableSkeleton />
            ) : payslips.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No payslips generated yet</p>
            ) : (
              <div className="space-y-2">
                {payslips.map((payslip) => (
                  <div
                    key={payslip.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewPayslip(payslip.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                        {payslip.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{payslip.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {monthNames[(payslip.month || 1) - 1]} {payslip.year}
                          <span className="ml-2">
                            <DollarSign className="h-3 w-3 inline" />
                            ₹{(payslip.net_pay || 0).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); handleDownloadPayslip(payslip); }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(payslip.status)}`}>
                        {getStatusIcon(payslip.status)}
                        <span className="ml-1">{(payslip.status || 'DRAFT').toUpperCase()}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Generate Payslip Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Payslip from Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">
              Generate payslip for <strong>{selectedEmployee?.full_name}</strong> based on attendance records.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month</Label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full p-2 border rounded mt-1 text-sm"
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
                      <p className="font-semibold">₹{(selectedEmployee.gross_salary || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Basic</span>
                      <p className="font-semibold">₹{(selectedEmployee.basic_salary || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">HRA</span>
                      <p className="font-semibold">₹{(selectedEmployee.hra || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Other</span>
                      <p className="font-semibold">₹{(selectedEmployee.other_allowances || 0).toLocaleString()}</p>
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
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmGenerate} disabled={mutations.generatePayslipForEmployee.isPending}>
              {mutations.generatePayslipForEmployee.isPending ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Calendar className="h-4 w-4 mr-2" /> Generate Payslip</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : payslipDetail?.payslip ? (
            <div className="space-y-4 text-sm">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Employee Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Employee Name</span>
                      <p className="font-medium">{payslipDetail.payslip.full_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Period</span>
                      <p className="font-medium">{monthNames[(payslipDetail.payslip.month || 1) - 1]} {payslipDetail.payslip.year}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Payslip ID</span>
                      <p className="font-medium text-xs">{payslipDetail.payslip.payslip_id || payslipDetail.payslip.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="font-medium">{(payslipDetail.payslip.status || 'draft').toUpperCase()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Summary */}
              {((payslipDetail.payslip as any).paid_days != null || (payslipDetail.payslip as any).lop_days > 0) && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Attendance Summary</h4>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="text-center">
                        <span className="text-gray-600">Paid Days</span>
                        <p className="font-bold text-lg text-blue-700">{(payslipDetail.payslip as any).paid_days || 0}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-600">LOP Days</span>
                        <p className="font-bold text-lg text-red-600">{(payslipDetail.payslip as any).lop_days || 0}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-600">Working Days</span>
                        <p className="font-bold text-lg text-gray-700">
                          {((payslipDetail.payslip as any).paid_days || 0) + ((payslipDetail.payslip as any).lop_days || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Earnings</h4>
                  <div className="space-y-1 text-xs">
                    {(payslipDetail.payslip as any).base_salary > 0 && (
                      <div className="flex justify-between font-semibold text-blue-700 pb-1 mb-1 border-b border-dashed">
                        <span>Gross Salary (CTC/Month)</span>
                        <span>₹{((payslipDetail.payslip as any).base_salary || 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between"><span>Basic Pay (prorated)</span><span>₹{(payslipDetail.payslip.basic_pay || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>HRA (prorated)</span><span>₹{(payslipDetail.payslip.hra || 0).toLocaleString()}</span></div>
                    {(payslipDetail.payslip.other_earnings || 0) > 0 && (
                      <div className="flex justify-between"><span>Other Allowances (prorated)</span><span>₹{(payslipDetail.payslip.other_earnings || 0).toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total Earnings</span><span>₹{(payslipDetail.payslip.total_earnings || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Deductions</h4>
                  <div className="space-y-1 text-xs">
                    {(payslipDetail.payslip.professional_tax || 0) > 0 && (
                      <div className="flex justify-between"><span>Professional Tax</span><span>₹{(payslipDetail.payslip.professional_tax || 0).toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total Deductions</span><span>₹{(payslipDetail.payslip.total_deductions || 0).toLocaleString()}</span>
                    </div>
                    {((payslipDetail.payslip as any).lop_days || 0) > 0 && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        * LOP of {(payslipDetail.payslip as any).lop_days} days (₹{((payslipDetail.payslip as any).lop_deduction || 0).toLocaleString()}) is already reflected in prorated earnings above.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Net Pay</span>
                    <span className="font-bold text-lg text-green-700">₹{(payslipDetail.payslip.net_pay || 0).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-center py-6 text-gray-500">Payslip not found</p>
          )}
          <DialogFooter>
            {payslipDetail?.payslip && (
              <Button size="sm" variant="outline" onClick={() => handleDownloadPayslip(payslipDetail.payslip)}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payslips;
