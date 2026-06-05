/**
 * PDF Documents Controller
 * Handle request/response for PDF document generation
 * Call services
 * NO database queries, NO business logic
 */

import * as pdfService from '../services/pdf-generator.service.js';
import * as exitModel from '../models/exit-formalities.pg.js';
import * as profileModel from '../../profiles/models/profiles.pg.js';

function parseAssetTemplateContent(template) {
  if (!template || !template.content) {
    return { instructions: [], acknowledgement: null };
  }

  const lines = template.content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const instructionsStart = lines.findIndex(line => /^dear\b/i.test(line));
  const assetDetailsIndex = lines.findIndex(line => /asset\s+details/i.test(line));

  const instructions = instructionsStart !== -1 && assetDetailsIndex !== -1 && assetDetailsIndex > instructionsStart
    ? lines.slice(instructionsStart, assetDetailsIndex)
    : [];

  const acknowledgementIndex = lines.findIndex(line => /you are requested/i.test(line));
  const acknowledgement = acknowledgementIndex !== -1
    ? lines.slice(acknowledgementIndex).join(' ')
    : null;

  return { instructions, acknowledgement };
}

function deriveAssetTableHeaders(template) {
  const defaultHeaders = ['Sr No', 'Item', 'Brand', 'Model', 'Serial No', 'Configuration', 'Status'];
  if (!template) {
    return defaultHeaders;
  }

  const structureHeadings = template.structure?.headings || [];
  const candidateHeaders = structureHeadings
    .map(heading => heading.text?.trim())
    .filter(Boolean)
    .filter(text => /(item|brand|serial|configuration|model|status)/i.test(text));

  if (candidateHeaders.length >= 3) {
    return candidateHeaders;
  }

  return defaultHeaders;
}

function deriveEmployeeFieldLabels(template) {
  if (!template) {
    return [];
  }

  const structureHeadings = template.structure?.headings || [];
  return structureHeadings
    .map(heading => heading.text?.replace(/:$/, '').trim())
    .filter(Boolean)
    .filter(text => /^(name|emp\s*id|designation|client|location|department)/i.test(text));
}

/**
 * Get settlement PDF data
 */
export async function getSettlementPDFData(req, res) {
  try {
    const { id: exit_request_id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    
    // Get exit request
    const exitRequest = await exitModel.getExitRequestById(exit_request_id);
    if (!exitRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Exit request not found'
      });
    }
    
    // Authorization: Employee can view own, HR/Admin can view all
    if (exitRequest.user_id !== userId && !isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this settlement'
      });
    }
    
    // Get settlement
    const settlement = await exitModel.getSettlement(exit_request_id);
    if (!settlement) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Settlement not found. Please calculate settlement first.'
      });
    }
    
    // Get employee profile
    const profile = await profileModel.getProfileById(exitRequest.user_id);
    
    // Prepare PDF data
    const pdfData = pdfService.generateFinalSettlementPDFData({
      companyDetails: {
        name: process.env.COMPANY_NAME || 'TechieMaya',
        address: process.env.COMPANY_ADDRESS || ''
      },
      employeeDetails: {
        name: exitRequest.full_name || profile?.full_name || 'N/A',
        employeeId: exitRequest.employee_id || profile?.employee_id || 'N/A',
        department: exitRequest.department || profile?.department || 'N/A',
        dateOfJoining: profile?.join_date || exitRequest.resignation_date,
        lastWorkingDay: exitRequest.last_working_day,
        designation: profile?.job_title || 'N/A'
      },
      settlement: {
        earnings: {
          salaryPayable: settlement.total_payable * 0.7, // Approximate breakdown
          leaveEncashment: settlement.total_payable * 0.2,
          bonus: settlement.total_payable * 0.05,
          reimbursements: settlement.total_payable * 0.05,
          totalPayable: settlement.total_payable
        },
        deductions: {
          statutoryDeductions: settlement.total_recoverable * 0.3,
          noticeRecovery: settlement.total_recoverable * 0.3,
          assetRecovery: settlement.total_recoverable * 0.2,
          loans: settlement.total_recoverable * 0.1,
          advances: settlement.total_recoverable * 0.1,
          pendingRecoveries: 0,
          totalRecoverable: settlement.total_recoverable
        },
        netSettlement: settlement.net_settlement_amount,
        settlementStatus: settlement.settlement_status,
        settlementId: settlement.id
      },
      signatures: {
        hrName: 'HR Manager',
        financeName: 'Finance Manager',
        authorizedName: 'Authorized Signatory'
      }
    });
    
    res.json({
      message: 'PDF data generated successfully',
      pdfData
    });
  } catch (error) {
    console.error('[exit-formalities] Get settlement PDF data error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF data',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get asset handover PDF data
 */
export async function getAssetHandoverPDFData(req, res) {
  try {
    const { id: exit_request_id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    
    // Get exit request
    const exitRequest = await exitModel.getExitRequestById(exit_request_id);
    if (!exitRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Exit request not found'
      });
    }
    
    // Authorization
    if (exitRequest.user_id !== userId && !isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this document'
      });
    }
    
    // Get asset recoveries
    const assetRecoveries = await exitModel.getAssetRecovery(exit_request_id);
    const assets = await exitModel.getEmployeeAssets(exitRequest.user_id);

    // Use APP_BASE_URL for internal backend calls (required)
    if (!process.env.APP_BASE_URL) {
      throw new Error('APP_BASE_URL environment variable is required');
    }
    const serviceBaseUrl = process.env.APP_BASE_URL;
    let companyName = process.env.COMPANY_NAME || 'TechieMaya';
    let companyAddress = process.env.COMPANY_ADDRESS || '';
    let adminName = 'Authorized Signatory';
    let declarationText = null;
    let templateFormat = null;
    let logoImage = null;
    let signatureImage = null;

    // Fetch branding assets for logos/signatures
    try {
      const brandingResponse = await fetch(`${serviceBaseUrl}/api/hr-documents/branding`);
      const brandingData = await brandingResponse.json();
      if (brandingData.success && brandingData.branding) {
        logoImage = brandingData.branding.logo?.dataUrl || null;
        signatureImage = brandingData.branding.signature?.dataUrl || null;
      }
    } catch (brandingError) {
      console.log('[exit-formalities] Could not fetch branding assets:', brandingError.message);
    }

    // Fetch template metadata to reproduce uploaded asset handover layout
    try {
      const templatesResponse = await fetch(`${serviceBaseUrl}/api/hr-documents/templates`);
      const templatesData = await templatesResponse.json();

      if (templatesData.success && Array.isArray(templatesData.templates) && templatesData.templates.length > 0) {
        const sortedTemplates = [...templatesData.templates].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );

        const assetTemplateMeta = sortedTemplates.find(t => t.documentType === 'asset_handover')
          || sortedTemplates.find(t => /asset/i.test(t.name || ''))
          || sortedTemplates.find(t => /asset/i.test(JSON.stringify(t.structure?.headings || [])))
          || sortedTemplates[0];

        if (assetTemplateMeta) {
          let templateDetails = assetTemplateMeta;

          if (assetTemplateMeta.id) {
            try {
              const detailResponse = await fetch(`${serviceBaseUrl}/api/hr-documents/templates/${assetTemplateMeta.id}`);
              const detailData = await detailResponse.json();
              if (detailData.success && detailData.template) {
                templateDetails = detailData.template;
              }
            } catch (detailError) {
              console.log('[exit-formalities] Could not fetch asset template detail:', detailError.message);
            }
          }

          const structure = templateDetails.structure || assetTemplateMeta.structure || {};
          const { instructions, acknowledgement } = parseAssetTemplateContent(templateDetails);
          const tableHeaders = deriveAssetTableHeaders(templateDetails);
          const employeeFieldLabels = deriveEmployeeFieldLabels(templateDetails);

          let signatureBlock = null;
          if (structure.signatureBlock) {
            const rawBlock = structure.signatureBlock;
            const signatoryLines = rawBlock.signatoryName
              ? rawBlock.signatoryName.split(/\n+/).map(line => line.trim()).filter(Boolean)
              : [];

            signatureBlock = {
              ...rawBlock,
              employeeLabel: rawBlock.employeeLabel || signatoryLines[0] || 'Employee Signature',
              adminLabel: rawBlock.adminLabel || (signatoryLines.length > 1 ? signatoryLines[signatoryLines.length - 1] : 'Authorized Signatory')
            };
          }

          templateFormat = {
            title: structure.sections?.find(section => /asset/i.test(section.heading || ''))?.heading || 'Asset Handover Form',
            companyInfo: structure.companyInfo || null,
            signatureBlock,
            letterFormat: structure.letterFormat || null,
            templateImage: templateDetails.templateImage || null,
            layout: templateDetails.layout || null,
            instructions,
            acknowledgement,
            tableHeaders,
            employeeFieldLabels,
            logoImage: logoImage,
            signatureImage: signatureImage
          };

          if (templateFormat.companyInfo?.fullName || templateFormat.companyInfo?.name) {
            companyName = templateFormat.companyInfo.fullName || templateFormat.companyInfo.name;
          }
          if (templateFormat.companyInfo?.address) {
            companyAddress = templateFormat.companyInfo.address;
          }
          if (signatureBlock?.adminLabel) {
            adminName = signatureBlock.adminLabel;
          } else if (signatureBlock?.signatoryName) {
            const signatoryLines = signatureBlock.signatoryName
              .split(/\n+/)
              .map(line => line.trim())
              .filter(Boolean);
            adminName = signatoryLines[signatoryLines.length - 1] || signatureBlock.signatoryName;
          }
          if (acknowledgement) {
            declarationText = acknowledgement;
          }
        }
      }
    } catch (templateError) {
      console.log('[exit-formalities] Could not fetch asset handover template:', templateError.message);
    }

    const pdfData = pdfService.generateAssetHandoverPDFData({
      companyDetails: {
        name: companyName,
        address: companyAddress,
        logo: logoImage
      },
      employeeDetails: {
        name: exitRequest.full_name || 'N/A',
        employeeId: exitRequest.employee_id || 'N/A',
        department: exitRequest.department || 'N/A',
        lastWorkingDay: exitRequest.last_working_day
      },
      assets: assetRecoveries.map(recovery => {
        const asset = assets.find(a => a.id === recovery.employee_asset_id);
        return {
          assetName: asset?.asset_name || recovery.asset_name || 'N/A',
          assetId: asset?.asset_id || recovery.asset_id || 'N/A',
          assetCategory: asset?.asset_category || recovery.asset_category || null,
          conditionAtIssue: asset?.condition_at_assignment || 'Good',
          conditionAtReturn: recovery.condition_on_return || 'Good',
          status: (recovery.recovery_status || 'returned').toUpperCase(),
          remarks: recovery.remarks || '',
          brand: asset?.asset_category || null,
          model: null,
          configuration: null
        };
      }),
      signatures: {
        adminName,
        adminSignature: signatureImage
      },
      declaration: declarationText,
      templateFormat
    });
    
    res.json({
      message: 'PDF data generated successfully',
      pdfData
    });
  } catch (error) {
    console.error('[exit-formalities] Get asset handover PDF data error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF data',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get experience letter PDF data
 */
export async function getExperienceLetterPDFData(req, res) {
  try {
    const { id: exit_request_id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    
    // Get exit request
    const exitRequest = await exitModel.getExitRequestById(exit_request_id);
    if (!exitRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Exit request not found'
      });
    }
    
    // Authorization
    if (exitRequest.user_id !== userId && !isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this document'
      });
    }
    
    // Get employee profile
    const profile = await profileModel.getProfileById(exitRequest.user_id);
    
    // Use APP_BASE_URL for internal backend calls (required)
    if (!process.env.APP_BASE_URL) {
      throw new Error('APP_BASE_URL environment variable is required');
    }
    const serviceBaseUrl = process.env.APP_BASE_URL;
    
    // Check for learned experience letter template - DYNAMIC for ANY company
    let templateFormat = {
      useNumberedFormat: false,
      refNumber: null,
      layout: 'standard',
      companyInfo: null,
      signatureBlock: null,
      letterFormat: null,
      footerLines: null,
      logoImage: null,
      signatureImage: null
    };
    
    // Default company and signature details
    let companyName = process.env.COMPANY_NAME || 'TechieMaya';
    let companyAddress = process.env.COMPANY_ADDRESS || 'India';
    let signatoryName = 'HR Manager';
    let signatoryTitle = 'HR Manager';
    
    // Fetch branding assets (logo and signature images)
    try {
      const brandingResponse = await fetch(`${serviceBaseUrl}/api/hr-documents/branding`);
      const brandingData = await brandingResponse.json();
      
      if (brandingData.success && brandingData.branding) {
        if (brandingData.branding.logo?.dataUrl) {
          templateFormat.logoImage = brandingData.branding.logo.dataUrl;
          console.log('[pdf-documents] Found uploaded logo image');
        }
        if (brandingData.branding.signature?.dataUrl) {
          templateFormat.signatureImage = brandingData.branding.signature.dataUrl;
          console.log('[pdf-documents] Found uploaded signature image');
        }
      }
    } catch (brandingError) {
      console.log('[pdf-documents] Could not fetch branding assets:', brandingError.message);
    }
    
    try {
      // ALWAYS fetch ALL templates and use the MOST RECENT one with company info
      // This ensures the latest uploaded template is always used
      let template = null;
      
      console.log('[pdf-documents] Fetching ALL templates to find the most recent one...');
      const allResponse = await fetch(`${serviceBaseUrl}/api/hr-documents/templates`);
      const allData = await allResponse.json();
      
      if (allData.success && allData.templates && allData.templates.length > 0) {
        // Sort by most recent first
        const sortedTemplates = allData.templates.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        console.log('[pdf-documents] Found', sortedTemplates.length, 'templates');
        console.log('[pdf-documents] Most recent template:', sortedTemplates[0]?.name, 'Created:', sortedTemplates[0]?.createdAt);
        
        // Find the most recent one with company info (has structure)
        template = sortedTemplates.find(t => 
          t.structure?.companyInfo?.name && 
          (t.structure?.letterFormat?.hasNumberedList || t.structure?.letterFormat?.layout === 'numbered_list')
        );
        
        // If no template with numbered list, find one with just company info
        if (!template) {
          template = sortedTemplates.find(t => t.structure?.companyInfo?.name);
        }
        
        // Last resort: use the most recent template
        if (!template) {
          template = sortedTemplates[0];
        }
      }
      
      if (template) {
        console.log('[pdf-documents] Using template:', template.name, 'Type:', template.documentType);
        console.log('[pdf-documents] Company Info:', JSON.stringify(template.structure?.companyInfo?.name));
        console.log('[pdf-documents] Template structure:', JSON.stringify(template.structure?.letterFormat));
        console.log('[pdf-documents] Company info:', JSON.stringify(template.structure?.companyInfo));
        
        // Check for numbered list format
        if (template.structure?.letterFormat?.hasNumberedList || template.structure?.letterFormat?.layout === 'numbered_list') {
          templateFormat.useNumberedFormat = true;
          templateFormat.layout = 'numbered_list';
          console.log('[pdf-documents] Using numbered list template format');
        }
        
        // Pass FULL company info from template (works for ANY company - TCS, Infosys, Wipro, etc.)
        if (template.structure?.companyInfo) {
          const ci = template.structure.companyInfo;
          templateFormat.companyInfo = {
            name: ci.name || ci.fullName,
            fullName: ci.fullName || ci.name,
            legalName: ci.legalName,
            logo: ci.logo,
            address: ci.address,
            city: ci.city,
            country: ci.country,
            phone: ci.phone,
            fax: ci.fax,
            email: ci.email,
            website: ci.website,
            cin: ci.cin,
            registeredOffice: ci.registeredOffice,
            refNumberPrefix: ci.refNumber
          };
          
          // Set for pdfData.companyDetails as well
          if (ci.name || ci.fullName) companyName = ci.fullName || ci.name;
          if (ci.address) companyAddress = ci.address;
        }
        
        // Pass FULL signature block from template
        if (template.structure?.signatureBlock) {
          const sig = template.structure.signatureBlock;
          templateFormat.signatureBlock = {
            signatoryName: sig.signatoryName,
            signatoryTitle: sig.signatoryTitle,
            hasSignatureImage: sig.hasSignatureImage
          };
          
          if (sig.signatoryName) signatoryName = sig.signatoryName;
          if (sig.signatoryTitle) signatoryTitle = sig.signatoryTitle;
        }
        
        // Pass FULL letter format from template
        if (template.structure?.letterFormat) {
          templateFormat.letterFormat = template.structure.letterFormat;
        }
        
        // Pass footer lines from layout if available
        if (template.layout?.footers && template.layout.footers.length > 0) {
          templateFormat.footerLines = template.layout.footers;
        }
        
        // Pass the raw content for template detection (e.g., to detect Infosys)
        if (template.content) {
          templateFormat.content = template.content;
        }
        
        // REPLICA MODE: Pass template image for exact layout replication
        if (template.templateImage) {
          templateFormat.templateImage = template.templateImage;
          templateFormat.replicaMode = true;
          console.log('[pdf-documents] REPLICA MODE: Template image available');
        }
        
        // REPLICA MODE: Pass document style detection
        if (template.documentStyle) {
          templateFormat.documentStyle = template.documentStyle;
          console.log('[pdf-documents] Document style:', JSON.stringify(template.documentStyle));
        }
        
        // REPLICA MODE: Pass visual layout data
        if (template.visualLayout) {
          templateFormat.visualLayout = template.visualLayout;
        }
        
        // REPLICA MODE: Pass text blocks with positions
        if (template.textBlocks) {
          templateFormat.textBlocks = template.textBlocks;
        }
        
        // Pass layout dimensions
        if (template.layout) {
          templateFormat.layout = {
            ...templateFormat.layout,
            imageWidth: template.layout.imageWidth,
            imageHeight: template.layout.imageHeight
          };
        }
        
        // Generate dynamic reference number using template's prefix
        const refPrefix = template.structure?.companyInfo?.refNumber || `${companyName}/EMP`;
        templateFormat.refNumber = `${refPrefix}/${exitRequest.employee_id || profile?.employee_id || Date.now()}`;
      }
    } catch (templateError) {
      console.log('[pdf-documents] Could not fetch template settings:', templateError.message);
    }
    
    // Prepare PDF data
    const pdfData = pdfService.generateExperienceLetterPDFData({
      companyDetails: {
        name: companyName,
        address: companyAddress
      },
      employeeDetails: {
        name: exitRequest.full_name || profile?.full_name || 'N/A',
        employeeId: exitRequest.employee_id || profile?.employee_id || 'N/A',
        designation: profile?.job_title || 'N/A'
      },
      employmentDetails: {
        dateOfJoining: profile?.join_date || exitRequest.resignation_date,
        lastWorkingDay: exitRequest.last_working_day,
        role: profile?.job_title || 'N/A',
        department: exitRequest.department || profile?.department || 'N/A',
        projects: profile?.project_history || [],
        grossSalary: profile?.salary || null,
        reasonForLeaving: exitRequest.exit_reason || exitRequest.reason || 'Resigned',
        gender: profile?.gender || 'male'
      },
      signature: {
        name: signatoryName,
        designation: signatoryTitle
      },
      templateFormat
    });
    
    res.json({
      message: 'PDF data generated successfully',
      pdfData
    });
  } catch (error) {
    console.error('[exit-formalities] Get experience letter PDF data error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF data',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Get relieving letter PDF data
 */
export async function getRelievingLetterPDFData(req, res) {
  try {
    const { id: exit_request_id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    const isHR = req.isHR;
    
    // Get exit request
    const exitRequest = await exitModel.getExitRequestById(exit_request_id);
    if (!exitRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Exit request not found'
      });
    }
    
    // Authorization
    if (exitRequest.user_id !== userId && !isAdmin && !isHR) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this document'
      });
    }
    
    // Get employee profile
    const profile = await profileModel.getProfileById(exitRequest.user_id);
    
    // Prepare PDF data
    const pdfData = pdfService.generateRelievingLetterPDFData({
      companyDetails: {
        name: process.env.COMPANY_NAME || 'TechieMaya',
        address: process.env.COMPANY_ADDRESS || ''
      },
      employeeDetails: {
        name: exitRequest.full_name || profile?.full_name || 'N/A',
        employeeId: exitRequest.employee_id || profile?.employee_id || 'N/A',
        designation: profile?.job_title || 'N/A',
        department: exitRequest.department || profile?.department || 'N/A'
      },
      exitDetails: {
        lastWorkingDay: exitRequest.last_working_day,
        resignationDate: exitRequest.resignation_date,
        exitType: exitRequest.exit_type || 'Resignation',
        allClearancesCompleted: exitRequest.status === 'completed'
      },
      signature: {
        name: 'HR Manager',
        designation: 'HR Manager'
      }
    });
    
    res.json({
      message: 'PDF data generated successfully',
      pdfData
    });
  } catch (error) {
    console.error('[exit-formalities] Get relieving letter PDF data error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF data',
      message: error.message || 'Internal server error'
    });
  }
}

