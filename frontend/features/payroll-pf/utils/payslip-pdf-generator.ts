/**
 * Payslip PDF Generator Utility
 * Generates PDF for payslips using jsPDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Payslip } from '../types';

/**
 * Format currency for display in PDF
 * Using Rs. instead of ₹ symbol for better PDF compatibility
 */
export function formatCurrency(amount: number): string {
  // Format number with Indian locale (comma separators)
  const formatted = amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return `Rs. ${formatted}`;
}

/**
 * Get month name from number
 */
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

/**
 * Generate Payslip PDF
 */
export function generatePayslipPDF(payslip: Payslip, filename?: string): void {
  const doc = new jsPDF('portrait');
  
  // Company Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const companyName = payslip.company_name || 'TechieMaya';
  doc.text(companyName, 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  if (payslip.company_address) {
    const addressLines = doc.splitTextToSize(payslip.company_address, 180);
    doc.text(addressLines, 105, 28, { align: 'center' });
  }
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 45, { align: 'center' });
  
  // Employee Information
  let yPos = 60;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 14, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${payslip.full_name || payslip.email || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Employee ID: ${payslip.employee_id || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Payslip ID: ${payslip.payslip_id || payslip.id}`, 14, yPos);
  yPos += 6;
  doc.text(`Period: ${getMonthName(payslip.month)} ${payslip.year}`, 14, yPos);
  if (payslip.issue_date) {
    yPos += 6;
    doc.text(`Issue Date: ${new Date(payslip.issue_date).toLocaleDateString()}`, 14, yPos);
  }
  
  // Earnings Table
  yPos += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings', 14, yPos);
  
  yPos += 8;
  const earningsData: any[] = [];
  if (Number(payslip.basic_pay) > 0) {
    earningsData.push(['Basic Pay', formatCurrency(Number(payslip.basic_pay))]);
  }
  if (Number(payslip.hra) > 0) {
    earningsData.push(['HRA', formatCurrency(Number(payslip.hra))]);
  }
  if (Number(payslip.special_allowance) > 0) {
    earningsData.push(['Special Allowance', formatCurrency(Number(payslip.special_allowance))]);
  }
  if (Number(payslip.bonus) > 0) {
    earningsData.push(['Bonus', formatCurrency(Number(payslip.bonus))]);
  }
  if (Number(payslip.incentives) > 0) {
    earningsData.push(['Incentives', formatCurrency(Number(payslip.incentives))]);
  }
  if (Number(payslip.other_earnings) > 0) {
    earningsData.push(['Other Earnings', formatCurrency(Number(payslip.other_earnings))]);
  }
  earningsData.push(['Total Earnings', formatCurrency(Number(payslip.total_earnings))]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Component', 'Amount']],
    body: earningsData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === earningsData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Deductions Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions', 14, yPos);
  
  yPos += 8;
  const deductionsData: any[] = [];
  if (Number(payslip.pf_employee) > 0) {
    deductionsData.push(['PF (Employee)', formatCurrency(Number(payslip.pf_employee))]);
  }
  if (Number(payslip.pf_employer) > 0) {
    deductionsData.push(['PF (Employer)', formatCurrency(Number(payslip.pf_employer))]);
  }
  if (Number(payslip.esi_employee) > 0) {
    deductionsData.push(['ESI (Employee)', formatCurrency(Number(payslip.esi_employee))]);
  }
  if (Number(payslip.esi_employer) > 0) {
    deductionsData.push(['ESI (Employer)', formatCurrency(Number(payslip.esi_employer))]);
  }
  if (Number(payslip.professional_tax) > 0) {
    deductionsData.push(['Professional Tax', formatCurrency(Number(payslip.professional_tax))]);
  }
  if (Number(payslip.tds) > 0) {
    deductionsData.push(['TDS', formatCurrency(Number(payslip.tds))]);
  }
  if (Number(payslip.other_deductions) > 0) {
    deductionsData.push(['Other Deductions', formatCurrency(Number(payslip.other_deductions))]);
  }
  deductionsData.push(['Total Deductions', formatCurrency(Number(payslip.total_deductions))]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Component', 'Amount']],
    body: deductionsData,
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === deductionsData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Net Pay
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Pay', 14, yPos);
  yPos += 8;
  doc.setFontSize(20);
  doc.text(formatCurrency(Number(payslip.net_pay)), 14, yPos);
  
  // Status and Footer
  yPos = doc.internal.pageSize.height - 40;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${payslip.status.toUpperCase()}`, 14, yPos);
  if (payslip.is_locked) {
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('LOCKED', 14, yPos);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    105,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );
  
  // Save PDF
  const defaultFilename = `payslip_${payslip.employee_id || payslip.id}_${getMonthName(payslip.month)}_${payslip.year}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename || defaultFilename);
}

