/**
 * PDF Generator Utilities
 * Generates PDFs for exit formalities documents
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  SettlementPDFData,
  AssetHandoverPDFData,
  ExperienceLetterPDFData,
  RelievingLetterPDFData,
} from '../types';

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate Asset Handover PDF
 */
export function generateAssetHandoverPDF(pdfData: AssetHandoverPDFData, filename?: string): void {
  const doc = new jsPDF('portrait');

  if (pdfData.templateFormat) {
    generateTemplateDrivenAssetHandover(doc, pdfData, pdfData.templateFormat);
  } else {
    generateDefaultAssetHandover(doc, pdfData);
  }

  doc.save(filename || `asset_handover_${new Date().toISOString().split('T')[0]}.pdf`);
}

function generateTemplateDrivenAssetHandover(
  doc: jsPDF,
  pdfData: AssetHandoverPDFData,
  templateFormat: NonNullable<AssetHandoverPDFData['templateFormat']>
): void {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Optional background replica
  if (templateFormat.templateImage) {
    try {
      doc.addImage(templateFormat.templateImage, 'PNG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.warn('[PDF Generator] Failed to apply asset handover template image:', error);
    }
  }

  const companyName = templateFormat.companyInfo?.fullName
    || templateFormat.companyInfo?.name
    || pdfData.companyDetails.name;
  const companyAddress = templateFormat.companyInfo?.address || pdfData.companyDetails.address;
  const titleText = templateFormat.title || pdfData.title || 'Asset Handover Form';

  const logoSource = templateFormat.logoImage || pdfData.companyDetails.logo || null;
  if (logoSource) {
    try {
      doc.addImage(logoSource, 'PNG', 20, 16, 28, 12);
    } catch (error) {
      console.warn('[PDF Generator] Could not add asset handover logo image:', error);
    }
  }

  let yPos = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(companyName, pageWidth / 2, yPos, { align: 'center' });

  if (companyAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const addressLines = doc.splitTextToSize(companyAddress, pageWidth - 40);
    yPos += 6;
    doc.text(addressLines, pageWidth / 2, yPos, { align: 'center' });
    yPos += addressLines.length * 5;
  }

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(titleText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  const infoLabels = templateFormat.employeeFieldLabels?.length
    ? templateFormat.employeeFieldLabels
    : ['Name', 'EMP ID', 'Department', 'Last Working Day'];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  infoLabels.forEach(label => {
    const value = resolveEmployeeFieldValue(label, pdfData, companyAddress);
    const line = `${label.replace(/:$/, '')}: ${value}`;
    doc.text(line, 20, yPos);
    yPos += 6;
  });

  yPos += 6;

  const instructions = (templateFormat.instructions && templateFormat.instructions.length > 0)
    ? templateFormat.instructions
    : getDefaultAssetInstructions();

  instructions.forEach((paragraph, index) => {
    if (index === 0 && /^dear/i.test(paragraph)) {
      doc.setFont('helvetica', 'bold');
      doc.text(paragraph, 20, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
      return;
    }
    const lines = doc.splitTextToSize(paragraph, pageWidth - 40);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 5 + 3;
  });

  yPos += 6;

  const headers = templateFormat.tableHeaders && templateFormat.tableHeaders.length > 0
    ? templateFormat.tableHeaders
    : getDefaultAssetTableHeaders();

  const tableBody = pdfData.assets.map((asset, index) =>
    mapAssetRowForHeaders(headers, asset, index, templateFormat)
  );

  autoTable(doc, {
    startY: yPos,
    head: [headers],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [45, 55, 72], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9, cellPadding: 2 },
    styles: { overflow: 'linebreak', font: 'helvetica' },
    columnStyles: buildAssetColumnStyles(headers)
  });

  const autoTableResult = (doc as any).lastAutoTable;
  yPos = autoTableResult?.finalY ? autoTableResult.finalY + 10 : yPos + 40;

  const acknowledgement = templateFormat.acknowledgement || pdfData.declaration;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const acknowledgementLines = doc.splitTextToSize(acknowledgement, pageWidth - 40);
  doc.text(acknowledgementLines, 20, yPos);
  yPos += acknowledgementLines.length * 5 + 12;

  renderAssetSignatures(doc, pdfData, templateFormat, yPos, pageHeight);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(
    `Generated on ${new Date(pdfData.generatedAt).toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
}

function generateDefaultAssetHandover(doc: jsPDF, pdfData: AssetHandoverPDFData): void {
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
  doc.text(`Last Working Day: ${new Date(pdfData.employeeDetails.lastWorkingDay).toLocaleDateString()}`, 14, yPos);

  // Assets Table
  yPos += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Asset List', 14, yPos);

  yPos += 8;
  const assetsData = pdfData.assets.map(asset => [
    asset.assetName,
    asset.assetId,
    asset.conditionAtIssue,
    asset.conditionAtReturn,
    asset.status,
    asset.remarks || '',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Asset Name', 'Asset ID', 'Condition at Issue', 'Condition at Return', 'Status', 'Remarks']],
    body: assetsData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 35 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Declaration
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

  doc.text(`Admin: ${pdfData.signatures.admin.name}`, 105, yPos);
  doc.text(`Date: ${pdfData.signatures.admin.date}`, 105, yPos + 6);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Generated on ${new Date(pdfData.generatedAt).toLocaleString()}`,
    105,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );
}

function resolveEmployeeFieldValue(
  label: string,
  pdfData: AssetHandoverPDFData,
  companyAddress?: string
): string {
  const normalized = label.toLowerCase();

  if (normalized.includes('name')) {
    return pdfData.employeeDetails.name;
  }
  if (normalized.includes('emp')) {
    return pdfData.employeeDetails.employeeId;
  }
  if (normalized.includes('designation')) {
    return pdfData.employeeDetails.department || '';
  }
  if (normalized.includes('department')) {
    return pdfData.employeeDetails.department || '';
  }
  if (normalized.includes('client')) {
    return pdfData.employeeDetails.department || '';
  }
  if (normalized.includes('location')) {
    if (companyAddress) {
      return companyAddress.split(/\n|,/)[0]?.trim() || companyAddress;
    }
    return '';
  }
  if (normalized.includes('last') || normalized.includes('working')) {
    return new Date(pdfData.employeeDetails.lastWorkingDay).toLocaleDateString();
  }
  return '';
}

function getDefaultAssetInstructions(): string[] {
  return [
    'Dear Employee,',
    'The below mentioned assets are being handed over to you to enable you to perform your duties efficiently. These are for official use only and should not be used for any personal purpose.',
    'You are expected to protect the asset and maintain confidentiality of the data stored on it. Any data loss or leakage would be your responsibility and you may be required to compensate the company.',
    'On being released from the company, you are required to purge all client related data from the asset and hand it over to the company representative within 24 hours.',
    'While the assets are in your custody, the company retains the right to collect a security deposit and this document must be signed and returned to acknowledge receipt.'
  ];
}

function getDefaultAssetTableHeaders(): string[] {
  return ['Sr No', 'Item', 'Brand', 'Model', 'Serial No', 'Configuration', 'Status'];
}

function mapAssetRowForHeaders(
  headers: string[],
  asset: AssetHandoverPDFData['assets'][number],
  index: number,
  templateFormat: NonNullable<AssetHandoverPDFData['templateFormat']>
): string[] {
  return headers.map(header => {
    const normalized = header.toLowerCase();

    if (/\b(sr|s\.\s*no|sno|#)\b/.test(normalized)) {
      return String(index + 1);
    }
    if (/item|asset\s*name/.test(normalized)) {
      return asset.assetName || '-';
    }
    if (/brand/.test(normalized)) {
      return asset.brand || asset.assetCategory || '-';
    }
    if (/model/.test(normalized)) {
      return asset.model || '-';
    }
    if (/serial|asset\s*id/.test(normalized)) {
      return asset.assetId || '-';
    }
    if (/config/.test(normalized)) {
      return asset.configuration || asset.remarks || '-';
    }
    if (/condition/.test(normalized) && /issue/.test(normalized)) {
      return asset.conditionAtIssue || '-';
    }
    if (/condition/.test(normalized) && /return/.test(normalized)) {
      return asset.conditionAtReturn || '-';
    }
    if (/status/.test(normalized)) {
      return asset.status || '-';
    }
    if (/remark|comment/.test(normalized)) {
      return asset.remarks || '-';
    }
    if (/received/.test(normalized)) {
      const signatory = templateFormat.signatureBlock?.signatoryName?.split(/\n+/).pop();
      return signatory ? `Received by ${signatory}` : '-';
    }
    return asset.remarks || '-';
  });
}

function buildAssetColumnStyles(headers: string[]): Record<number, Partial<{ cellWidth: number; halign: 'left' | 'center' | 'right'; }>> {
  const styles: Record<number, Partial<{ cellWidth: number; halign: 'left' | 'center' | 'right'; }>> = {};

  headers.forEach((header, idx) => {
    const normalized = header.toLowerCase();
    if (/\b(sr|s\.\s*no|sno|#)\b/.test(normalized)) {
      styles[idx] = { cellWidth: 15, halign: 'center' };
    } else if (/item|asset\s*name/.test(normalized)) {
      styles[idx] = { cellWidth: 40 };
    } else if (/brand|model/.test(normalized)) {
      styles[idx] = { cellWidth: 30 };
    } else if (/serial|asset\s*id/.test(normalized)) {
      styles[idx] = { cellWidth: 35 };
    } else if (/config/.test(normalized)) {
      styles[idx] = { cellWidth: 35 };
    } else if (/condition/.test(normalized)) {
      styles[idx] = { cellWidth: 30 };
    } else if (/status/.test(normalized)) {
      styles[idx] = { cellWidth: 25, halign: 'center' };
    } else if (/remark|comment/.test(normalized)) {
      styles[idx] = { cellWidth: 40 };
    }
  });

  return styles;
}

function renderAssetSignatures(
  doc: jsPDF,
  pdfData: AssetHandoverPDFData,
  templateFormat: NonNullable<AssetHandoverPDFData['templateFormat']>,
  currentY: number,
  pageHeight: number
): void {
  const signatureY = Math.min(pageHeight - 60, currentY + 10);
  const rightColumnX = doc.internal.pageSize.width / 2 + 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const employeeLabel = templateFormat.signatureBlock?.employeeLabel || 'Employee Signature';
  doc.text(employeeLabel, 20, signatureY);
  doc.text(pdfData.signatures.employee.name, 20, signatureY + 6);
  doc.text(`Date: ${pdfData.signatures.employee.date}`, 20, signatureY + 12);

  if (pdfData.signatures.employee.signature) {
    try {
      doc.addImage(pdfData.signatures.employee.signature, 'PNG', 20, signatureY - 18, 35, 12);
    } catch (error) {
      console.warn('[PDF Generator] Could not add employee signature image:', error);
    }
  }

  const adminLabel = templateFormat.signatureBlock?.adminLabel || 'Authorized Signatory';
  const adminName = templateFormat.signatureBlock?.signatoryName?.split(/\n+/).pop()
    || pdfData.signatures.admin.name;
  const adminTitle = templateFormat.signatureBlock?.signatoryTitle || '';

  if (templateFormat.signatureImage || pdfData.signatures.admin.signature) {
    try {
      const imageSource = templateFormat.signatureImage || pdfData.signatures.admin.signature;
      if (imageSource) {
        doc.addImage(imageSource, 'PNG', rightColumnX, signatureY - 18, 35, 12);
      }
    } catch (error) {
      console.warn('[PDF Generator] Could not add admin signature image:', error);
    }
  }

  doc.text(adminLabel, rightColumnX, signatureY);
  doc.text(adminName, rightColumnX, signatureY + 6);
  if (adminTitle) {
    doc.text(adminTitle, rightColumnX, signatureY + 12);
  }
  doc.text(`Date: ${pdfData.signatures.admin.date}`, rightColumnX, signatureY + 18);
}

/**
 * Generate Experience Letter PDF
 * 
 * TEMPLATE-LOCKED MODE: When a template is uploaded, NEVER use generic fallback.
 * The uploaded template's layout MUST be preserved.
 */
export function generateExperienceLetterPDF(pdfData: ExperienceLetterPDFData, filename?: string): void {
  const doc = new jsPDF('portrait');

  const templateFormat = pdfData.templateFormat;

  console.log('[PDF Generator] ========================================');
  console.log('[PDF Generator] Template format received:', templateFormat ? 'YES' : 'NO');

  // If NO template data at all, use standard format
  if (!templateFormat) {
    console.log('[PDF Generator] ❌ NO TEMPLATE - Using standard format');
    generateStandardExperienceLetter(doc, pdfData);
    doc.save(filename || `experience_letter_${new Date().toISOString().split('T')[0]}.pdf`);
    return;
  }

  // TEMPLATE-LOCKED MODE: Template exists, detect and use correct layout
  const letterFormat = templateFormat.letterFormat || {};
  const layout = (letterFormat as any).layout || 'paragraph';
  const templateContent = (templateFormat as any).content as string | undefined;
  const hasToWhomsoever = (letterFormat as any).hasToWhomsoever || (typeof templateContent === 'string' && /to\s+whom/i.test(templateContent));
  const hasParagraphStyle = (letterFormat as any).hasParagraphStyle || !(letterFormat as any).hasNumberedList;

  console.log('[PDF Generator] Layout type:', layout);
  console.log('[PDF Generator] hasToWhomsoever:', hasToWhomsoever);
  console.log('[PDF Generator] hasParagraphStyle:', hasParagraphStyle);
  console.log('[PDF Generator] hasNumberedList:', letterFormat.hasNumberedList);

  // REPLICA MODE: Use template image as background
  const templateImage = (templateFormat as any).templateImage;
  if (templateImage) {
    console.log('[PDF Generator] 🎯 REPLICA MODE: Using template image as background');
    generateReplicaModeExperienceLetter(doc, pdfData, templateFormat);
    doc.save(filename || `experience_letter_${new Date().toISOString().split('T')[0]}.pdf`);
    return;
  }

  // LAYOUT-LOCKED MODE: Generate based on detected layout
  if (hasToWhomsoever || layout === 'open_letter') {
    console.log('[PDF Generator] ✅ Using OPEN LETTER style (TO WHOMSOEVER IT MAY CONCERN)');
    generateOpenLetterStyleExperienceLetter(doc, pdfData, templateFormat);
  } else if (layout === 'paragraph' || layout === 'formal_letter' || hasParagraphStyle) {
    console.log('[PDF Generator] ✅ Using PARAGRAPH style');
    generateParagraphStyleExperienceLetter(doc, pdfData, templateFormat);
  } else if (layout === 'table' || (typeof templateContent === 'string' && templateContent.toLowerCase().includes('infosys'))) {
    console.log('[PDF Generator] ✅ Using TABLE style');
    generateInfosysStyleExperienceLetter(doc, pdfData, templateFormat);
  } else if (layout === 'numbered_list' && letterFormat.hasNumberedList === true) {
    // ONLY use numbered list if EXPLICITLY detected with high confidence
    console.log('[PDF Generator] ✅ Using NUMBERED LIST style');
    generateDynamicTemplateExperienceLetter(doc, pdfData, templateFormat);
  } else {
    // DEFAULT: Use paragraph style, NOT numbered list
    console.log('[PDF Generator] ✅ DEFAULT: Using PARAGRAPH style');
    generateParagraphStyleExperienceLetter(doc, pdfData, templateFormat);
  }

  doc.save(filename || `experience_letter_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * REPLICA MODE: Generate PDF using original template image as background
 * Only replaces variable text fields while preserving EXACT layout
 */
function generateReplicaModeExperienceLetter(
  doc: jsPDF,
  pdfData: ExperienceLetterPDFData,
  templateFormat: NonNullable<ExperienceLetterPDFData['templateFormat']>
): void {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  console.log('[PDF REPLICA] Starting REPLICA MODE generation');

  // Add the template image as background
  const templateImage = (templateFormat as any).templateImage;
  try {
    doc.addImage(templateImage, 'PNG', 0, 0, pageWidth, pageHeight);
    console.log('[PDF REPLICA] Added template image as background');
  } catch (error) {
    console.error('[PDF REPLICA] Failed to add template image:', error);
    // Fallback to paragraph style if image fails
    generateParagraphStyleExperienceLetter(doc, pdfData, templateFormat);
    return;
  }

  // Create a white overlay for variable field areas and add new text
  // This is a simplified approach - for production, you'd use exact bounding boxes
  const textBlocks = Array.isArray((templateFormat as any).textBlocks) ? (templateFormat as any).textBlocks : [];
  const employeeName = pdfData.employeeDetails.name;
  const employeeId = pdfData.employeeDetails.employeeId;

  // Find and replace variable fields based on detected positions
  for (const block of textBlocks) {
    if (block.isVariable && block.bbox) {
      // Convert image coordinates to PDF coordinates
      let imgWidth = 800;
      let imgHeight = 1100;
      if (templateFormat.layout && typeof templateFormat.layout === 'object') {
        const layoutObj = templateFormat.layout as any;
        if ('imageWidth' in layoutObj && typeof layoutObj.imageWidth === 'number') {
          imgWidth = layoutObj.imageWidth;
        }
        if ('imageHeight' in layoutObj && typeof layoutObj.imageHeight === 'number') {
          imgHeight = layoutObj.imageHeight;
        }
      }

      const pdfX = (block.bbox.x0 / imgWidth) * pageWidth;
      const pdfY = (block.bbox.y0 / imgHeight) * pageHeight;
      const blockWidth = ((block.bbox.x1 - block.bbox.x0) / imgWidth) * pageWidth;
      const blockHeight = ((block.bbox.y1 - block.bbox.y0) / imgHeight) * pageHeight;

      // Draw white rectangle to cover original text
      doc.setFillColor(255, 255, 255);
      doc.rect(pdfX - 2, pdfY - 2, blockWidth + 4, blockHeight + 4, 'F');

      // Determine replacement text
      let replacementText = block.text;
      if (/\b(mr|ms|mrs)\.?\s+[a-z]+/i.test(block.text)) {
        replacementText = employeeName;
      } else if (/\d{4,}/.test(block.text) && block.text.length < 10) {
        replacementText = employeeId || block.text;
      }

      // Add replacement text
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(replacementText, pdfX, pdfY + blockHeight * 0.7);
    }
  }

  console.log('[PDF REPLICA] Completed REPLICA MODE generation');
}

/**
 * Generate Experience Letter in OPEN LETTER style
 * Format: Logo, Address, Date, "TO WHOMSOEVER IT MAY CONCERN", Paragraphs, Signature
 * Used for: Internship certificates, general experience letters
 */
function generateOpenLetterStyleExperienceLetter(
  doc: jsPDF,
  pdfData: ExperienceLetterPDFData,
  templateFormat: NonNullable<ExperienceLetterPDFData['templateFormat']>
): void {
  const pageWidth = doc.internal.pageSize.width;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;

  // Get company info
  const companyInfo = templateFormat.companyInfo || {};
  const signatureBlock = templateFormat.signatureBlock || {};
  const companyName = companyInfo.name || pdfData.companyDetails.name || 'Company';
  const companyAddress = companyInfo.address || pdfData.companyDetails.address || '';

  // Format dates
  const formatDate = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  let yPos = 25;

  // ========== COMPANY HEADER (Logo area - left aligned) ==========
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, leftMargin, yPos);

  // Company address (top-right)
  if (companyAddress) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const addressLines = companyAddress.split('\n');
    let addrY = 20;
    for (const line of addressLines) {
      doc.text(line, rightMargin, addrY, { align: 'right' });
      addrY += 4;
    }
  }

  // ========== DATE (Right aligned) ==========
  yPos += 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const currentDate = formatDate(pdfData.signature?.date || new Date());
  doc.text(currentDate, rightMargin, yPos, { align: 'right' });

  // ========== TO WHOMSOEVER IT MAY CONCERN (Centered, underlined) ==========
  yPos += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const heading = 'TO WHOMSOEVER IT MAY CONCERN';
  doc.text(heading, pageWidth / 2, yPos, { align: 'center' });

  // Underline
  const headingWidth = doc.getTextWidth(heading);
  doc.setLineWidth(0.5);
  doc.line((pageWidth - headingWidth) / 2, yPos + 1.5, (pageWidth + headingWidth) / 2, yPos + 1.5);

  // ========== BODY PARAGRAPHS (NOT bullet points) ==========
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const employeeName = pdfData.employeeDetails.name;
  const designation = pdfData.employeeDetails.designation || pdfData.employmentDetails.role || 'N/A';
  const department = pdfData.employmentDetails.department || 'N/A';
  const joiningDate = formatDate(pdfData.employmentDetails.dateOfJoining);
  const leavingDate = formatDate(pdfData.employmentDetails.lastWorkingDay);

  // First paragraph - Introduction
  const para1 = `This is to certify that ${employeeName} was employed with ${companyName} as ${designation} in the ${department} department from ${joiningDate} to ${leavingDate}.`;

  const para1Lines = doc.splitTextToSize(para1, pageWidth - 45);
  doc.text(para1Lines, leftMargin, yPos);
  yPos += para1Lines.length * 5 + 8;

  // Second paragraph - Performance
  const para2 = `During this period, we found ${employeeName} to be sincere, hardworking, and dedicated. Their conduct and performance were satisfactory throughout the tenure with the organization.`;

  const para2Lines = doc.splitTextToSize(para2, pageWidth - 45);
  doc.text(para2Lines, leftMargin, yPos);
  yPos += para2Lines.length * 5 + 8;

  // Third paragraph - Wishes
  const para3 = `We wish ${employeeName} all the best for future endeavors.`;

  const para3Lines = doc.splitTextToSize(para3, pageWidth - 45);
  doc.text(para3Lines, leftMargin, yPos);
  yPos += para3Lines.length * 5 + 20;

  // ========== SIGNATURE BLOCK (Left aligned) ==========
  doc.setFont('helvetica', 'bold');
  doc.text('For ' + companyName, leftMargin, yPos);

  yPos += 20;

  // Signatory name
  const sigName = signatureBlock.signatoryName || pdfData.signature?.name || 'HR Manager';
  doc.text(sigName, leftMargin, yPos);

  // Signatory title
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const sigTitle = signatureBlock.signatoryTitle || pdfData.signature?.designation || 'Human Resources';
  doc.text(sigTitle, leftMargin, yPos);

  console.log('[PDF OpenLetter] Generated Open Letter style experience letter');
}

/**
 * Generate Experience Letter in PARAGRAPH style (No bullet points or numbered lists)
 * Used for: Professional letters, formal correspondence
 */
function generateParagraphStyleExperienceLetter(
  doc: jsPDF,
  pdfData: ExperienceLetterPDFData,
  templateFormat: NonNullable<ExperienceLetterPDFData['templateFormat']>
): void {
  // Use the same logic as Open Letter style but without the "TO WHOMSOEVER" heading
  const pageWidth = doc.internal.pageSize.width;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;

  const companyInfo = templateFormat.companyInfo || {};
  const signatureBlock = templateFormat.signatureBlock || {};
  const companyName = companyInfo.name || pdfData.companyDetails.name || 'Company';
  const companyAddress = companyInfo.address || pdfData.companyDetails.address || '';

  const formatDate = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  let yPos = 25;

  // Company header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, leftMargin, yPos);

  if (companyAddress) {
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const addressLines = companyAddress.split('\n');
    for (const line of addressLines) {
      doc.text(line, leftMargin, yPos);
      yPos += 4;
    }
  }

  // Date
  yPos += 10;
  doc.setFontSize(10);
  doc.text(formatDate(pdfData.signature?.date || new Date()), leftMargin, yPos);

  // Subject line
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Subject: Experience Certificate', leftMargin, yPos);

  // Employee address
  yPos += 12;
  doc.setFont('helvetica', 'normal');
  const salutation = pdfData.employmentDetails.gender === 'female' ? 'Ms.' : 'Mr.';
  doc.text(`Dear ${salutation} ${pdfData.employeeDetails.name},`, leftMargin, yPos);

  // Body paragraphs
  yPos += 12;
  const employeeName = pdfData.employeeDetails.name;
  const designation = pdfData.employeeDetails.designation || pdfData.employmentDetails.role || 'N/A';
  const department = pdfData.employmentDetails.department || 'N/A';
  const joiningDate = formatDate(pdfData.employmentDetails.dateOfJoining);
  const leavingDate = formatDate(pdfData.employmentDetails.lastWorkingDay);

  const para1 = `This letter confirms that ${salutation} ${employeeName} was employed with ${companyName} from ${joiningDate} to ${leavingDate}, holding the position of ${designation} in the ${department} department.`;

  const para1Lines = doc.splitTextToSize(para1, pageWidth - 45);
  doc.text(para1Lines, leftMargin, yPos);
  yPos += para1Lines.length * 5 + 8;

  const para2 = `During their tenure, ${salutation} ${employeeName} demonstrated professionalism, dedication, and excellent performance. Their contributions to the team and organization were valuable and appreciated.`;

  const para2Lines = doc.splitTextToSize(para2, pageWidth - 45);
  doc.text(para2Lines, leftMargin, yPos);
  yPos += para2Lines.length * 5 + 8;

  const para3 = `We thank ${salutation} ${employeeName} for their service and wish them success in all future endeavors.`;

  const para3Lines = doc.splitTextToSize(para3, pageWidth - 45);
  doc.text(para3Lines, leftMargin, yPos);
  yPos += para3Lines.length * 5 + 20;

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.text('Yours sincerely,', leftMargin, yPos);
  yPos += 15;
  doc.text('For ' + companyName, leftMargin, yPos);
  yPos += 15;

  const sigName = signatureBlock.signatoryName || pdfData.signature?.name || 'HR Manager';
  doc.text(sigName, leftMargin, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const sigTitle = signatureBlock.signatoryTitle || pdfData.signature?.designation || 'Human Resources';
  doc.text(sigTitle, leftMargin, yPos);

  console.log('[PDF Paragraph] Generated Paragraph style experience letter');
}

/**
 * Generate Experience Letter in INFOSYS STYLE (Table format)
 * Format: Company header, reference number, employee info, resignation paragraph, TABLE, confidentiality, signature
 */
function generateInfosysStyleExperienceLetter(
  doc: jsPDF,
  pdfData: ExperienceLetterPDFData,
  templateFormat: NonNullable<ExperienceLetterPDFData['templateFormat']>
): void {
  const pageWidth = doc.internal.pageSize.width;
  const salutation = pdfData.employmentDetails.gender === 'female' ? 'Ms.' : 'Mr.';
  const firstName = pdfData.employeeDetails.name.split(' ')[0];
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;

  // Get company info from template
  const companyInfo = templateFormat.companyInfo || {};
  const signatureBlock = templateFormat.signatureBlock || {};

  // Clean company name (remove duplicate/OCR artifacts)
  let companyName = companyInfo.name || pdfData.companyDetails.name || 'Company';
  if (companyName.toLowerCase().includes('nfosys')) {
    companyName = 'Infosys Limited';
  }
  const companyAddress = companyInfo.address || pdfData.companyDetails.address || '';

  // Format date
  const formatDate = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  let yPos = 20;

  // ========== COMPANY HEADER (Infosys logo area) ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 153); // Infosys blue
  doc.text('Infosys', leftMargin, yPos);

  // Company full name
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Infosys Limited', leftMargin, yPos);

  // Registered office address
  yPos += 4;
  doc.setFontSize(8);
  doc.text('Regd. Office: Electronic City, Hosur Road', leftMargin, yPos);
  yPos += 4;
  doc.text('Bangalore 560 100, India.', leftMargin, yPos);
  yPos += 4;
  doc.text('Tel: 91 80 2852 0261 Fax: 91 80 2852 0362', leftMargin, yPos);
  yPos += 4;
  doc.text('www.infosys.com', leftMargin, yPos);

  // ========== REFERENCE NUMBER AND DATE (Right aligned) ==========
  yPos += 10;
  const refNumber = `HRD/RELVLTR/${new Date().getFullYear().toString().slice(-2)}/${pdfData.employeeDetails.employeeId || 'XXXXX'}`;
  const currentDate = formatDate(pdfData.signature?.date || new Date());

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${refNumber}`, rightMargin, yPos, { align: 'right' });
  yPos += 5;
  doc.text(currentDate, rightMargin, yPos, { align: 'right' });

  // ========== EMPLOYEE ADDRESS BLOCK ==========
  yPos += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${salutation} ${pdfData.employeeDetails.name}`, leftMargin, yPos);
  yPos += 5;
  doc.text(`Employee No. ${pdfData.employeeDetails.employeeId || 'N/A'}`, leftMargin, yPos);

  // ========== SALUTATION ==========
  yPos += 12;
  doc.setFont('helvetica', 'normal');
  doc.text(`Dear ${firstName},`, leftMargin, yPos);

  // ========== OPENING PARAGRAPH (Resignation acceptance) ==========
  yPos += 10;
  doc.setFontSize(10);
  const joiningDate = formatDate(pdfData.employmentDetails.dateOfJoining);
  const leavingDate = formatDate(pdfData.employmentDetails.lastWorkingDay);
  // Some data models may not have resignationDate, so fallback to lastWorkingDay
  const resignationDate = formatDate((pdfData.employmentDetails as any).resignationDate || pdfData.employmentDetails.lastWorkingDay);

  const openingPara = `With reference to your decision to resign from Infosys Limited ("Company" hereafter) and your resignation letter dated ${resignationDate}, we are in acceptance of the same and you are relieved of your duties and responsibilities from the closing hours of ${leavingDate}.`;

  const openingLines = doc.splitTextToSize(openingPara, pageWidth - 45);
  doc.text(openingLines, leftMargin, yPos);
  yPos += openingLines.length * 5 + 5;

  // ========== SERVICE RECORD HEADING ==========
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Your service record is as follows:', leftMargin, yPos);

  // ========== SERVICE RECORD TABLE ==========
  yPos += 8;

  // Table data
  const tableData = [
    ['Name', `${pdfData.employeeDetails.name}`],
    ['Last Role Designation', pdfData.employeeDetails.designation || pdfData.employmentDetails.role || 'N/A'],
    ['Last Role', pdfData.employmentDetails.department || pdfData.employmentDetails.role || 'N/A'],
    ['Date of Joining', joiningDate],
    ['Date of Leaving', leavingDate],
  ];

  // Use jspdf-autotable for the table
  autoTable(doc, {
    startY: yPos,
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'normal' },
      1: { cellWidth: 90, fontStyle: 'normal' },
    },
    margin: { left: leftMargin, right: leftMargin },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
  });

  // Get the final Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ========== CONFIDENTIALITY PARAGRAPH ==========
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const confidentialityPara = 'We draw your attention to your continuing obligation of confidentiality with respect to any proprietary and confidential information of the Company that you may have had access to during the course of your employment.';

  const confidentialityLines = doc.splitTextToSize(confidentialityPara, pageWidth - 45);
  doc.text(confidentialityLines, leftMargin, yPos);
  yPos += confidentialityLines.length * 5 + 8;

  // ========== CLOSING ==========
  doc.setFont('helvetica', 'normal');
  doc.text('Wishing you the best!', leftMargin, yPos);

  // ========== SIGNATURE BLOCK ==========
  yPos += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('For Infosys Limited', leftMargin, yPos);

  // Signature image or line
  yPos += 15;
  if (templateFormat.signatureImage) {
    try {
      doc.addImage(templateFormat.signatureImage, 'PNG', leftMargin, yPos - 10, 35, 15);
    } catch (e) {
      console.error('Error adding signature image:', e);
    }
  }

  // Signatory name
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  const sigName = signatureBlock.signatoryName?.replace('For Infosys Limited\n', '') || pdfData.signature?.name || 'HR Manager';
  doc.text(sigName, leftMargin, yPos);

  // Signatory title
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const sigTitle = signatureBlock.signatoryTitle || pdfData.signature?.designation || 'HR Department';
  doc.text(sigTitle, leftMargin, yPos);

  console.log('[PDF Infosys] Generated Infosys-style experience letter with TABLE format');
}

/**
 * Generate Experience Letter using DYNAMIC template format
 * Works with ANY company template (TCS, Infosys, Wipro, Accenture, etc.)
 */
function generateDynamicTemplateExperienceLetter(
  doc: jsPDF,
  pdfData: ExperienceLetterPDFData,
  templateFormat: NonNullable<ExperienceLetterPDFData['templateFormat']>
): void {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const salutation = pdfData.employmentDetails.gender === 'female' ? 'Ms.' : 'Mr.';
  const pronoun = pdfData.employmentDetails.gender === 'female' ? 'her' : 'his';
  const leftMargin = 25;
  const rightMargin = pageWidth - 25;
  const centerX = pageWidth / 2;

  // Get company info from template or fallback to pdfData
  const companyInfo = templateFormat.companyInfo || {};
  const signatureBlock = templateFormat.signatureBlock || {};
  const letterFormat = templateFormat.letterFormat || {};

  console.log('[PDF Dynamic] companyInfo:', JSON.stringify(companyInfo));
  console.log('[PDF Dynamic] signatureBlock:', JSON.stringify(signatureBlock));
  console.log('[PDF Dynamic] letterFormat:', JSON.stringify(letterFormat));
  console.log('[PDF Dynamic] Has logo image:', !!templateFormat.logoImage);
  console.log('[PDF Dynamic] Has signature image:', !!templateFormat.signatureImage);

  // Company name to display
  const companyName = companyInfo.name || pdfData.companyDetails.name || 'Company';
  const companyFullName = companyInfo.fullName || companyInfo.name || pdfData.companyDetails.name;
  const companyLegalName = companyInfo.legalName || companyFullName;

  // For numbered format, always show logo, signature, footer unless explicitly disabled
  const showLogo = letterFormat.hasLogo !== false;
  const showRefNumber = letterFormat.hasRefNumber !== false;
  const showSignature = letterFormat.hasSignature !== false;
  const showFooter = letterFormat.hasFooter !== false;

  let yPos = 20;

  // ========== LOGO / HEADER (Use uploaded image if available) ==========
  if (showLogo) {
    if (templateFormat.logoImage) {
      // Use uploaded logo image
      try {
        const logoWidth = 40;
        const logoHeight = 20;
        doc.addImage(templateFormat.logoImage, 'PNG', centerX - logoWidth / 2, yPos - 8, logoWidth, logoHeight);
        console.log('[PDF Dynamic] Added logo image');
      } catch (imgError) {
        console.error('[PDF Dynamic] Error adding logo image:', imgError);
        // Fallback to text logo
        doc.setDrawColor(0, 51, 102);
        doc.setFillColor(0, 51, 102);
        doc.rect(centerX - 18, yPos - 5, 36, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName.substring(0, 4).toUpperCase(), centerX, yPos + 6, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
    } else {
      // Draw text-based logo box
      doc.setDrawColor(0, 51, 102); // Dark blue
      doc.setFillColor(0, 51, 102);
      doc.rect(centerX - 18, yPos - 5, 36, 18, 'F');

      // Company short name inside logo box
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const logoText = companyInfo.logo || companyName.substring(0, 4).toUpperCase();
      doc.text(logoText, centerX, yPos + 6, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset to black
    }

    // Move down after logo (no company name text - just logo)
    yPos += 15;
  }

  // ========== REFERENCE NUMBER ==========
  if (showRefNumber) {
    yPos += 18;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Use the refNumber from template directly - it already contains the full reference
    let refNumber = templateFormat.refNumber || companyInfo.refNumberPrefix;
    if (!refNumber) {
      // Only build reference if not provided by template
      refNumber = `${companyName}/EMP/${pdfData.employeeDetails.employeeId || ''}`;
    }
    doc.text(refNumber, rightMargin, yPos, { align: 'right' });
  }

  // ========== TITLE (Blue color like original TCS format) ==========
  yPos += 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 153); // Exact blue color from TCS original (#003399)
  const title = letterFormat.title || 'SERVICE CERTIFICATE';
  doc.text(title, centerX, yPos, { align: 'center' });
  // Underline the title (also blue)
  const titleWidth = doc.getTextWidth(title);
  doc.setDrawColor(0, 51, 153); // Exact blue
  doc.setLineWidth(0.5);
  doc.line((pageWidth - titleWidth) / 2, yPos + 1.5, (pageWidth + titleWidth) / 2, yPos + 1.5);
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setDrawColor(0, 0, 0); // Reset draw color

  // ========== OPENING STATEMENT ==========
  yPos += 16;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const openingText = `This is to certify that ${salutation} ${pdfData.employeeDetails.name} was employed by us and ${pronoun} particulars of service are as under:`;
  const openingLines = doc.splitTextToSize(openingText, pageWidth - 50);
  doc.text(openingLines, leftMargin, yPos);

  yPos += openingLines.length * 5 + 10;

  // ========== NUMBERED LIST (Employee Details) ==========
  const colonX = 90; // Adjusted colon position for better alignment

  // Format salary with "Rs. XXX /-" format
  const formatSalary = (salary: number | undefined | null): string => {
    if (!salary) return 'N/A';
    return `Rs. ${salary.toLocaleString('en-IN')} /-`;
  };

  const details = [
    { label: 'Name', value: `${salutation} ${pdfData.employeeDetails.name}` },
    { label: 'Designation', value: pdfData.employeeDetails.designation || pdfData.employmentDetails.role || 'N/A' },
    { label: 'Department', value: pdfData.employmentDetails.department || 'N/A' },
    { label: 'Gross Annual Compensation', value: formatSalary(pdfData.employmentDetails.grossSalary) },
    { label: 'Date of Joining', value: formatDate(pdfData.employmentDetails.dateOfJoining) },
    { label: 'Date of Leaving', value: formatDate(pdfData.employmentDetails.lastWorkingDay) },
    { label: 'Reason for Leaving', value: pdfData.employmentDetails.reasonForLeaving || 'Resigned' },
  ];

  doc.setFontSize(10);
  details.forEach((detail, index) => {
    // Label with number (bold) - matching original TCS format
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${detail.label}`, leftMargin, yPos);

    // Colon and Value (normal)
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${detail.value}`, colonX, yPos);

    yPos += 8;
  });

  // ========== DATE LINE ==========
  yPos += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dated: ${formatDate(pdfData.signature.date)}`, leftMargin, yPos);

  // ========== SIGNATURE BLOCK (Use uploaded image if available) ==========
  if (showSignature) {
    const signatureX = rightMargin - 40;
    let sigY = yPos - 10; // Position signature above the dated line

    // Get signatory name from template or fallback
    const signatoryName = signatureBlock.signatoryName || pdfData.signature.name || 'HR Manager';
    const signatoryTitle = signatureBlock.signatoryTitle || pdfData.signature.designation || 'Human Resources';

    // Use uploaded signature image if available
    if (templateFormat.signatureImage) {
      try {
        // Reduce signature image size to better match original document
        const sigWidth = 42;
        const sigHeight = 22;
        doc.addImage(templateFormat.signatureImage, 'PNG', signatureX - 20, sigY - 12, sigWidth, sigHeight);
        console.log('[PDF Dynamic] Added signature image (reduced size)');
        sigY += 14;
      } catch (imgError) {
        console.error('[PDF Dynamic] Error adding signature image:', imgError);
        // Fallback to cursive text signature
        doc.setFontSize(16);
        doc.setFont('times', 'italic');
        doc.text(signatoryName, signatureX + 5, sigY, { align: 'center' });
        sigY += 12;
      }
    } else {
      // Cursive signature (simulated with italic text)
      doc.setFontSize(16);
      doc.setFont('times', 'italic');
      doc.text(signatoryName, signatureX + 5, sigY, { align: 'center' });
      sigY += 12;
    }

    // Signatory name (bold)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(signatoryName, signatureX + 5, sigY, { align: 'center' });

    // Signatory designation
    sigY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(signatoryTitle, signatureX + 5, sigY, { align: 'center' });
  }

  // ========== FOOTER (Always show for numbered format) ==========
  if (showFooter) {
    let footerY = pageHeight - 55;

    // If we have footer lines from template, use them
    if (templateFormat.footerLines && templateFormat.footerLines.length > 0) {
      templateFormat.footerLines.forEach((line, index) => {
        doc.setFont('helvetica', index === 0 ? 'bold' : 'normal');
        doc.setFontSize(index === 0 ? 11 : 8);
        doc.text(line, centerX, footerY, { align: 'center' });
        footerY += index === 0 ? 5 : 4;
      });
    } else {
      // Build footer from company info
      // Line 1: Company Full Name (first word in RED like original TCS, rest in black)
      doc.setFontSize(9);
      const fullNameUpper = companyFullName.toUpperCase();
      const words = fullNameUpper.split(' ');
      if (words.length > 1) {
        // First word in exact TCS RED color (RGB: 204, 0, 0 - #CC0000)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(204, 0, 0); // Exact TCS Red color
        const firstWord = words[0];
        const restWords = words.slice(1).join(' ');
        const firstWordWidth = doc.getTextWidth(firstWord);
        doc.setTextColor(0, 0, 0); // Black for rest
        const restWidth = doc.getTextWidth(restWords);
        const totalWidth = firstWordWidth + restWidth;
        const startX = centerX - totalWidth / 2;
        // Draw TATA in red
        doc.setTextColor(204, 0, 0);
        doc.text(firstWord, startX, footerY);
        // Draw rest in black (no space gap - words run together like original)
        doc.setTextColor(0, 0, 0);
        doc.text(restWords, startX + firstWordWidth, footerY);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text(fullNameUpper, centerX, footerY, { align: 'center' });
      }

      // Line 2: Legal Name
      if (companyLegalName && companyLegalName !== companyFullName) {
        footerY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(companyLegalName, centerX, footerY, { align: 'center' });
      } else {
        // Add default "Tata Consultancy Services Limited" line
        footerY += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Tata Consultancy Services Limited', centerX, footerY, { align: 'center' });
      }

      // Line 3: Address
      if (companyInfo.address) {
        footerY += 3;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const addressLine = [companyInfo.address, companyInfo.city, companyInfo.country].filter(Boolean).join(' ');
        doc.text(addressLine, centerX, footerY, { align: 'center' });
      }

      // Line 4: Contact details
      const contactParts: string[] = [];
      if (companyInfo.phone) contactParts.push(`Tel ${companyInfo.phone}`);
      if (companyInfo.fax) contactParts.push(`Fax ${companyInfo.fax}`);
      if (companyInfo.email) contactParts.push(`e-mail ${companyInfo.email}`);
      if (companyInfo.website) contactParts.push(`website ${companyInfo.website}`);

      if (contactParts.length > 0) {
        footerY += 3;
        doc.setFontSize(7);
        doc.text(contactParts.join('  '), centerX, footerY, { align: 'center' });
      }

      // Line 5: Registered Office
      if (companyInfo.registeredOffice) {
        footerY += 3;
        doc.setFontSize(7);
        doc.text(`Registered Office  ${companyInfo.registeredOffice}`, centerX, footerY, { align: 'center' });
      }

      // Line 6: CIN
      if (companyInfo.cin) {
        footerY += 3;
        doc.setFontSize(7);
        doc.text(`Corporate Identification No. (CIN): ${companyInfo.cin}`, centerX, footerY, { align: 'center' });
      }
    }
  }
}

/**
 * Generate Standard Experience Letter format (simple paragraph style)
 */
function generateStandardExperienceLetter(doc: jsPDF, pdfData: ExperienceLetterPDFData): void {
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfData.title, 105, 30, { align: 'center' });

  // Company Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfData.companyDetails.name, 105, 40, { align: 'center' });
  if (pdfData.companyDetails.address) {
    doc.text(pdfData.companyDetails.address, 105, 45, { align: 'center' });
  }

  // Content
  let yPos = 70;
  doc.setFontSize(11);
  const contentLines = doc.splitTextToSize(pdfData.content, 180);
  doc.text(contentLines, 14, yPos);

  yPos += contentLines.length * 6 + 20;

  // Signature
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Signed by:`, 14, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(pdfData.signature.name, 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(pdfData.signature.designation, 14, yPos);
  yPos += 5;
  doc.text(`Date: ${pdfData.signature.date}`, 14, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Generated on ${new Date(pdfData.generatedAt).toLocaleString()}`,
    105,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Generate Relieving Letter PDF
 */
export function generateRelievingLetterPDF(pdfData: RelievingLetterPDFData, filename?: string): void {
  const doc = new jsPDF('portrait');

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfData.title, 105, 30, { align: 'center' });

  // Company Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfData.companyDetails.name, 105, 40, { align: 'center' });
  if (pdfData.companyDetails.address) {
    doc.text(pdfData.companyDetails.address, 105, 45, { align: 'center' });
  }

  // Content
  let yPos = 70;
  doc.setFontSize(11);
  const contentLines = doc.splitTextToSize(pdfData.content, 180);
  doc.text(contentLines, 14, yPos);

  yPos += contentLines.length * 6 + 20;

  // Signature
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Signed by:`, 14, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(pdfData.signature.name, 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(pdfData.signature.designation, 14, yPos);
  yPos += 5;
  doc.text(`Date: ${pdfData.signature.date}`, 14, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Generated on ${new Date(pdfData.generatedAt).toLocaleString()}`,
    105,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );

  doc.save(filename || `relieving_letter_${new Date().toISOString().split('T')[0]}.pdf`);
}

