/**
 * Settlement Tab Component
 * Handles settlement calculation, preview, and PDF generation
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useSettlement, useCalculateSettlement, useSettlementPDFData } from '../hooks/useexit-formalities';
import type { ExitRequest } from '../types';
import {
  Calculator,
  Download,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FinalSettlement } from '../types';

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface SettlementTabProps {
  exitRequest: ExitRequest;
  isAdmin: boolean;
  onRefresh?: () => void;
}

export function SettlementTab({ exitRequest, isAdmin, onRefresh }: SettlementTabProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationForm, setCalculationForm] = useState({
    leaveBalance: 0,
    bonusAmount: 0,
    incentivesAmount: 0,
    reimbursements: 0,
    noticePeriodRequired: 30,
    noticePeriodServed: 0,
  });

  const { data: settlement, isLoading, refetch } = useSettlement(exitRequest.id);
  const calculateMutation = useCalculateSettlement();
  const settlementData = settlement as unknown as FinalSettlement | null;
  const { data: pdfData, isLoading: pdfLoading } = useSettlementPDFData(
    settlementData ? exitRequest.id : null
  );

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      await calculateMutation.mutateAsync({
        exitRequestId: exitRequest.id,
        data: calculationForm,
      });
      toast({
        title: 'Success',
        description: 'Settlement calculated successfully',
      });
      refetch();
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to calculate settlement',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };


  const handleDownloadSettlementPDF = () => {
    if (!pdfData) {
      toast({
        title: 'Error',
        description: 'PDF data not available. Please calculate settlement first.',
        variant: 'destructive',
      });
      return;
    }

    const doc = new jsPDF('portrait');

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfData.title, 105, 20, { align: 'center' });

    // Company Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(pdfData.companyDetails.name, 105, 30, { align: 'center' });
    if (pdfData.companyDetails.address) {
      doc.text(pdfData.companyDetails.address, 105, 35, { align: 'center' });
    }

    // Employee Details
    let yPos = 50;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Information', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${pdfData.employeeDetails.name}`, 14, yPos);
    yPos += 6;
    doc.text(`Employee ID: ${pdfData.employeeDetails.employeeId}`, 14, yPos);
    yPos += 6;
    doc.text(`Department: ${pdfData.employeeDetails.department}`, 14, yPos);
    yPos += 6;
    doc.text(`Date of Joining: ${new Date(pdfData.employeeDetails.dateOfJoining).toLocaleDateString()}`, 14, yPos);
    yPos += 6;
    doc.text(`Last Working Day: ${new Date(pdfData.employeeDetails.lastWorkingDay).toLocaleDateString()}`, 14, yPos);

    // Earnings Table
    yPos += 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Earnings', 14, yPos);

    yPos += 8;
    const earningsData = pdfData.earnings.map(earning => [
      earning.component,
      formatCurrency(earning.amount)
    ]);
    earningsData.push(['Total Earnings', formatCurrency(pdfData.totalEarnings)]);

    autoTable(doc, {
      startY: yPos,
      head: [['Component', 'Amount']],
      body: earningsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 60, halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Deductions Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Deductions', 14, yPos);

    yPos += 8;
    const deductionsData = pdfData.deductions.map(deduction => [
      deduction.component,
      formatCurrency(deduction.amount)
    ]);
    deductionsData.push(['Total Deductions', formatCurrency(pdfData.totalDeductions)]);

    autoTable(doc, {
      startY: yPos,
      head: [['Component', 'Amount']],
      body: deductionsData,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 60, halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Net Settlement
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const netAmount = pdfData.netSettlement;
    const statusText = netAmount > 0
      ? 'Amount Payable to Employee'
      : netAmount < 0
        ? 'Amount Recoverable from Employee'
        : 'Fully Settled (No Dues)';

    doc.text('Net Settlement', 14, yPos);
    yPos += 8;
    doc.setFontSize(16);
    doc.text(formatCurrency(Math.abs(netAmount)), 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(statusText, 14, yPos);

    // Declaration
    yPos += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const splitText = doc.splitTextToSize(pdfData.declaration, 180);
    doc.text(splitText, 14, yPos);

    // Signatures
    yPos = doc.internal.pageSize.height - 50;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Employee: ${pdfData.signatures.employee.name}`, 14, yPos);
    doc.text(`Date: ${pdfData.signatures.employee.date}`, 14, yPos + 6);

    doc.text(`HR: ${pdfData.signatures.hr.name}`, 105, yPos);
    doc.text(`Date: ${pdfData.signatures.hr.date}`, 105, yPos + 6);

    yPos += 20;
    doc.text(`Finance: ${pdfData.signatures.finance.name}`, 14, yPos);
    doc.text(`Date: ${pdfData.signatures.finance.date}`, 14, yPos + 6);

    doc.text(`Authorized: ${pdfData.signatures.authorized.name}`, 105, yPos);
    doc.text(`Date: ${pdfData.signatures.authorized.date}`, 105, yPos + 6);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Generated on ${new Date(pdfData.generatedAt).toLocaleString()}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );

    doc.save(`settlement_${exitRequest.employee_id || exitRequest.id}_${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: 'Downloaded',
      description: 'Settlement PDF downloaded successfully',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calculation Form (Admin/HR only) */}
      {isAdmin && !settlement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Calculate Final Settlement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leaveBalance">Leave Balance (Days)</Label>
                <Input
                  id="leaveBalance"
                  type="number"
                  value={calculationForm.leaveBalance}
                  onChange={(e) =>
                    setCalculationForm({
                      ...calculationForm,
                      leaveBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="bonusAmount">Bonus Amount (₹)</Label>
                <Input
                  id="bonusAmount"
                  type="number"
                  value={calculationForm.bonusAmount}
                  onChange={(e) =>
                    setCalculationForm({
                      ...calculationForm,
                      bonusAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="incentivesAmount">Incentives Amount (₹)</Label>
                <Input
                  id="incentivesAmount"
                  type="number"
                  value={calculationForm.incentivesAmount}
                  onChange={(e) =>
                    setCalculationForm({
                      ...calculationForm,
                      incentivesAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="reimbursements">Reimbursements (₹)</Label>
                <Input
                  id="reimbursements"
                  type="number"
                  value={calculationForm.reimbursements}
                  onChange={(e) =>
                    setCalculationForm({
                      ...calculationForm,
                      reimbursements: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="noticePeriodRequired">Notice Period Required (Days)</Label>
                <Input
                  id="noticePeriodRequired"
                  type="number"
                  value={calculationForm.noticePeriodRequired}
                  onChange={(e) =>
                    setCalculationForm({
                      ...calculationForm,
                      noticePeriodRequired: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="noticePeriodServed">Notice Period Served (Days)</Label>
                <Input
                  id="noticePeriodServed"
                  type="number"
                  value={calculationForm.noticePeriodServed}
                  onChange={(e) =>
                    setCalculationForm({
                      ...calculationForm,
                      noticePeriodServed: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <Button
              onClick={handleCalculate}
              disabled={isCalculating || calculateMutation.isPending}
              className="w-full"
            >
              {isCalculating || calculateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Settlement
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settlement Display */}
      {settlementData && (
        <>
          {/* Net Settlement Summary */}
          <Card className={settlementData.netSettlement > 0 ? 'bg-green-50 border-green-200' : settlementData.netSettlement < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-600">Net Settlement</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    {settlementData.netSettlement > 0 ? (
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    ) : settlementData.netSettlement < 0 ? (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    ) : (
                      <Minus className="h-6 w-6 text-gray-600" />
                    )}
                    <span className="text-3xl font-bold">
                      {formatCurrency(Math.abs(settlementData.netSettlement))}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {settlementData.settlementStatus === 'company_pays_employee'
                      ? 'Amount Payable to Employee'
                      : settlementData.settlementStatus === 'employee_pays_company'
                        ? 'Amount Recoverable from Employee'
                        : 'Fully Settled (No Dues)'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {settlementData.settlementStatus === 'company_pays_employee' ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : settlementData.settlementStatus === 'employee_pays_company' ? (
                    <XCircle className="h-8 w-8 text-red-600" />
                  ) : (
                    <CheckCircle className="h-8 w-8 text-gray-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Earnings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Salary Payable</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.earnings.salaryPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Leave Encashment</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.earnings.leaveEncashment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Bonus</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.earnings.bonus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Incentives</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.earnings.incentives)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Reimbursements</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.earnings.reimbursements)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Total Earnings</span>
                  <span>{formatCurrency(settlementData.earnings.totalPayable)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deductions Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span>Deductions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Notice Period Recovery</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.deductions.noticeRecovery)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Asset Recovery</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.deductions.assetRecovery)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Loans</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.deductions.loans)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Advances</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.deductions.advances)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Pending Recoveries</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.deductions.pendingRecoveries)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Statutory Deductions</span>
                  <span className="text-sm font-medium">{formatCurrency(settlementData.deductions.statutoryDeductions)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Total Deductions</span>
                  <span>{formatCurrency(settlementData.deductions.totalRecoverable)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Generate Documents</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleDownloadSettlementPDF}
                    disabled={pdfLoading}
                    variant="outline"
                    size="sm"
                  >
                    {pdfLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Settlement PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!settlement && !isAdmin && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Settlement not calculated yet</p>
            <p className="text-sm text-gray-400 mt-2">Please contact HR to calculate your final settlement</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

