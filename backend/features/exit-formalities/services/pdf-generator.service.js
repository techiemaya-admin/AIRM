/**
 * PDF Generator Service
 * Generates PDF documents for exit formalities
 * Uses jsPDF and html2pdf or similar libraries
 * NO Express objects, NO database queries
 */

// Note: This service provides the structure and data formatting
// Actual PDF generation should be done on frontend using jsPDF or backend using PDFKit/Puppeteer

/**
 * Generate Asset Handover PDF Data Structure
 */
export function generateAssetHandoverPDFData(assetData) {
  const {
    companyDetails,
    employeeDetails,
    assets,
    signatures,
    declaration,
    templateFormat
  } = assetData;

  const resolvedDeclaration = declaration && declaration.trim().length > 0
    ? declaration.trim()
    : 'I confirm that the above assets have been returned in the condition as stated above and acknowledge receipt of the same.';

  return {
    title: templateFormat?.title || 'Asset Handover & Recovery Acknowledgment',
    companyDetails: {
      name: companyDetails.name || 'Company Name',
      address: companyDetails.address || '',
      logo: companyDetails.logo || null
    },
    employeeDetails: {
      name: employeeDetails.name,
      employeeId: employeeDetails.employeeId || 'N/A',
      department: employeeDetails.department || 'N/A',
      lastWorkingDay: employeeDetails.lastWorkingDay
    },
    assets: assets.map(asset => ({
      assetName: asset.assetName,
      assetId: asset.assetId || 'N/A',
      conditionAtIssue: asset.conditionAtIssue || 'Good',
      conditionAtReturn: asset.conditionAtReturn || 'Good',
      status: asset.status || 'Returned',
      remarks: asset.remarks || '',
      assetCategory: asset.assetCategory || null,
      brand: asset.brand || null,
      model: asset.model || null,
      configuration: asset.configuration || null
    })),
    declaration: resolvedDeclaration,
    signatures: {
      employee: {
        name: employeeDetails.name,
        signature: signatures.employeeSignature || null,
        date: new Date().toISOString().split('T')[0]
      },
      admin: {
        name: signatures.adminName || 'Admin',
        signature: signatures.adminSignature || null,
        date: new Date().toISOString().split('T')[0]
      }
    },
    templateFormat: templateFormat || null,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate Final Settlement Statement PDF Data Structure
 */
export function generateFinalSettlementPDFData(settlementData) {
  const {
    companyDetails,
    employeeDetails,
    settlement,
    signatures
  } = settlementData;
  
  return {
    title: 'Final Settlement Statement',
    companyDetails: {
      name: companyDetails.name || 'Company Name',
      address: companyDetails.address || '',
      logo: companyDetails.logo || null
    },
    employeeDetails: {
      name: employeeDetails.name,
      employeeId: employeeDetails.employeeId || 'N/A',
      department: employeeDetails.department || 'N/A',
      dateOfJoining: employeeDetails.dateOfJoining,
      lastWorkingDay: employeeDetails.lastWorkingDay,
      designation: employeeDetails.designation || 'N/A'
    },
    earnings: [
      { component: 'Salary Payable', amount: settlement.earnings.salaryPayable },
      { component: 'Leave Encashment', amount: settlement.earnings.leaveEncashment },
      { component: 'Bonus / Incentives', amount: settlement.earnings.bonus },
      { component: 'Reimbursements', amount: settlement.earnings.reimbursements }
    ],
    totalEarnings: settlement.earnings.totalPayable,
    deductions: [
      { component: 'PF / ESI', amount: settlement.deductions.statutoryDeductions },
      { component: 'Notice Period Recovery', amount: settlement.deductions.noticeRecovery },
      { component: 'Asset Recovery', amount: settlement.deductions.assetRecovery },
      { component: 'Loan / Advance', amount: settlement.deductions.loans + settlement.deductions.advances },
      { component: 'Other Deductions', amount: settlement.deductions.pendingRecoveries }
    ],
    totalDeductions: settlement.deductions.totalRecoverable,
    netSettlement: settlement.netSettlement,
    settlementStatus: settlement.settlementStatus,
    declaration: 'This settlement is full and final. I acknowledge receipt of the above settlement amount and confirm that all dues have been settled.',
    signatures: {
      hr: {
        name: signatures.hrName || 'HR Manager',
        signature: signatures.hrSignature || null,
        date: new Date().toISOString().split('T')[0]
      },
      finance: {
        name: signatures.financeName || 'Finance Manager',
        signature: signatures.financeSignature || null,
        date: new Date().toISOString().split('T')[0]
      },
      employee: {
        name: employeeDetails.name,
        signature: signatures.employeeSignature || null,
        date: new Date().toISOString().split('T')[0]
      },
      authorized: {
        name: signatures.authorizedName || 'Authorized Signatory',
        signature: signatures.authorizedSignature || null,
        date: new Date().toISOString().split('T')[0]
      }
    },
    generatedAt: new Date().toISOString(),
    settlementId: settlement.settlementId || 'N/A'
  };
}

/**
 * Generate Experience Letter PDF Data Structure
 * TEMPLATE-LOCKED: Uses uploaded template format, NO hardcoded fallbacks
 */
export function generateExperienceLetterPDFData(experienceData) {
  const {
    companyDetails,
    employeeDetails,
    employmentDetails,
    signature,
    templateFormat
  } = experienceData;
  
  // Get title from template's detected layout, NOT hardcoded
  const letterFormat = templateFormat?.letterFormat || {};
  const layout = letterFormat.layout || 'paragraph';
  const hasToWhomsoever = letterFormat.hasToWhomsoever || false;
  
  // Determine title based on template layout
  let title = 'Experience Certificate'; // Default
  if (hasToWhomsoever) {
    title = 'TO WHOMSOEVER IT MAY CONCERN';
  } else if (layout === 'open_letter') {
    title = 'TO WHOMSOEVER IT MAY CONCERN';
  }
  // NEVER use "Service Certificate" unless explicitly in template
  
  return {
    title: title,
    companyDetails: {
      name: companyDetails.name || 'Company Name',
      address: companyDetails.address || '',
      logo: companyDetails.logo || null
    },
    employeeDetails: {
      name: employeeDetails.name,
      employeeId: employeeDetails.employeeId || 'N/A',
      designation: employeeDetails.designation || 'N/A'
    },
    employmentDetails: {
      dateOfJoining: employmentDetails.dateOfJoining,
      lastWorkingDay: employmentDetails.lastWorkingDay,
      role: employmentDetails.role || employeeDetails.designation,
      department: employmentDetails.department || 'N/A',
      projects: employmentDetails.projects || [],
      grossSalary: employmentDetails.grossSalary || null,
      reasonForLeaving: employmentDetails.reasonForLeaving || 'Resigned',
      gender: employmentDetails.gender || 'male'
    },
    content: `This is to certify that ${employeeDetails.name} (Employee ID: ${employeeDetails.employeeId || 'N/A'}) was employed with ${companyDetails.name} from ${new Date(employmentDetails.dateOfJoining).toLocaleDateString()} to ${new Date(employmentDetails.lastWorkingDay).toLocaleDateString()} as ${employmentDetails.role || employeeDetails.designation} in the ${employmentDetails.department || ''} department.

During the tenure, the employee worked on projects such as ${(employmentDetails.projects || []).map(p => p.name || p).join(', ') || 'various projects'} and demonstrated professionalism and dedication.

We wish them success in future endeavors.`,
    signature: {
      name: signature.name || 'HR Manager',
      designation: signature.designation || 'HR Manager',
      signature: signature.signature || null,
      date: new Date().toISOString().split('T')[0]
    },
    companySeal: signature.companySeal || null,
    generatedAt: new Date().toISOString(),
    // Include FULL template format settings - TEMPLATE-LOCKED mode
    templateFormat: templateFormat ? {
      useNumberedFormat: letterFormat.hasNumberedList === true, // Only true if explicitly detected
      refNumber: templateFormat.refNumber || null,
      layout: layout,
      // Pass full company info from template
      companyInfo: templateFormat.companyInfo || null,
      // Pass full signature block from template
      signatureBlock: templateFormat.signatureBlock || null,
      // Pass full letter format from template
      letterFormat: letterFormat,
      // Pass footer lines from template
      footerLines: templateFormat.footerLines || null,
      // Pass uploaded branding images
      logoImage: templateFormat.logoImage || null,
      signatureImage: templateFormat.signatureImage || null,
      // REPLICA MODE data
      templateImage: templateFormat.templateImage || null,
      documentStyle: templateFormat.documentStyle || null,
      visualLayout: templateFormat.visualLayout || null,
      textBlocks: templateFormat.textBlocks || null,
      content: templateFormat.content || null
    } : null
  };
}

/**
 * Generate Relieving Letter PDF Data Structure
 */
export function generateRelievingLetterPDFData(relievingData) {
  const {
    companyDetails,
    employeeDetails,
    exitDetails,
    signature
  } = relievingData;
  
  return {
    title: 'Relieving Letter',
    companyDetails: {
      name: companyDetails.name || 'Company Name',
      address: companyDetails.address || '',
      logo: companyDetails.logo || null
    },
    employeeDetails: {
      name: employeeDetails.name,
      employeeId: employeeDetails.employeeId || 'N/A',
      designation: employeeDetails.designation || 'N/A',
      department: employeeDetails.department || 'N/A'
    },
    exitDetails: {
      lastWorkingDay: exitDetails.lastWorkingDay,
      resignationDate: exitDetails.resignationDate || null,
      exitType: exitDetails.exitType || 'Resignation',
      allClearancesCompleted: exitDetails.allClearancesCompleted !== false
    },
    content: `This is to confirm that ${employeeDetails.name} (Employee ID: ${employeeDetails.employeeId || 'N/A'}) has been relieved from duties effective ${new Date(exitDetails.lastWorkingDay).toLocaleDateString()} after completing all exit formalities.

All dues and clearances have been settled. The employee has returned all company assets and completed all necessary formalities.

We wish them all the best in their future endeavors.`,
    signature: {
      name: signature.name || 'HR Manager',
      designation: signature.designation || 'HR Manager',
      signature: signature.signature || null,
      date: new Date().toISOString().split('T')[0]
    },
    companySeal: signature.companySeal || null,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Get settlement status text
 */
export function getSettlementStatusText(status) {
  const statusMap = {
    'company_pays_employee': 'Amount Payable to Employee',
    'employee_pays_company': 'Amount Recoverable from Employee',
    'fully_settled': 'Fully Settled (No Dues)'
  };
  return statusMap[status] || status;
}

