import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useProfiles } from "@/sdk/features/profiles";
import { logger } from "@/lib/logger";

const OUTPUT_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word (DOCX)' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'html', label: 'HTML' },
];

const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: 'payslip', label: 'Payslip' },
  { value: 'offer-letter', label: 'Offer Letter' },
  { value: 'appointment-letter', label: 'Appointment Letter' },
  { value: 'experience-letter', label: 'Experience Letter' },
  { value: 'relieving-letter', label: 'Relieving Letter' },
  { value: 'custom', label: 'Custom Document' },
];

interface EmployeeData {
  employeeName: string;
  employeeId: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  dateOfLeaving?: string;
  grossSalary: number;
  email?: string;
  phone?: string;
  address?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  pan?: string;
  uan?: string;
}

interface Template {
  id: string;
  name: string;
  documentType: string;
  format: string;
  createdAt: string;
}

const HRDocumentGenerator: React.FC = () => {
  // Use SDK hook to get profiles for auto-fill
  const { data: profiles = [] } = useProfiles();

  const [activeTab, setActiveTab] = useState<'generate' | 'templates' | 'upload'>('generate');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('payslip');
  const [outputFormat, setOutputFormat] = useState<string>('pdf');
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [employeeData, setEmployeeData] = useState<EmployeeData>({
    employeeName: '',
    employeeId: '',
    designation: '',
    department: '',
    dateOfJoining: '',
    grossSalary: 0,
  });

  const [salaryBreakup, setSalaryBreakup] = useState<any>(null);
  const [viewTemplateData, setViewTemplateData] = useState<any>(null);

  // Use VITE_API_BASE_URL (required) - no fallback to localhost
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase) {
    throw new Error('VITE_API_BASE_URL environment variable is required');
  }

  // Fetch templates when documentType or activeTab changes.
  // When viewing the Templates tab we want the full unfiltered list,
  // otherwise fetch templates scoped to the selected documentType.
  React.useEffect(() => {
    fetchTemplates();
  }, [documentType, activeTab]);

  // Auto-update preview when template or format changes
  React.useEffect(() => {
    if (employeeData.employeeName) {
      // Small debounce to avoid flashing
      const timer = setTimeout(() => {
        previewDocument();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedTemplate, outputFormat, documentType]);

  const fetchTemplates = async () => {
    try {
      let url = `${apiBase}/api/hr-documents/templates`;
      // Only request filtered list when not on the Templates tab
      if (activeTab !== 'templates' && documentType) {
        const params = new URLSearchParams();
        params.set('documentType', documentType);
        url = `${apiBase}/api/hr-documents/templates?${params.toString()}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        previewDocument(); 
        // Ask backend for active template id for this documentType (if any)
        try {
          const actResp = await fetch(`${apiBase}/api/hr-documents/templates/active?documentType=${encodeURIComponent(documentType)}`);
          const actJson = await actResp.json();
          // Prefer backend active template if provided, otherwise pick a sensible preferred template
          // Use functional state update to avoid overriding a user's explicit selection
          if (actJson && actJson.success && actJson.activeTemplateId) {
            setSelectedTemplate(() => actJson.activeTemplateId);
          } else {
            const preferred = data.templates.find((t: any) => t.documentType === documentType) ||
              data.templates.find((t: any) => t.documentType === 'custom');
            if (preferred) {
              setSelectedTemplate(prev => prev || preferred.id);
            }
          }
        } catch (e) {
          logger.warn('Failed to fetch active template id', e);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch templates:', error);
    }
  };

  // Template upload dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('template', file);
    formData.append('documentType', documentType);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

    setLoading(true);
    setUploadProgress(0);

    try {
      const response = await fetch(`${apiBase}/api/hr-documents/templates/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Template uploaded successfully!' });
        // Select the newly uploaded template and switch to Generate tab
        setSelectedTemplate(data.template.id);
        setDocumentType(data.template.documentType || documentType);
        // setActiveTab('generate'); // Stay on upload tab to show preview

        // Refresh template list (unfiltered) to ensure newly uploaded template appears
        try {
          logger.log('[hr-documents] upload response:', data);
          // Use VITE_API_BASE_URL (required) - no fallback to localhost
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase) {
    throw new Error('VITE_API_BASE_URL environment variable is required');
  }
          const resp = await fetch(`${apiBase}/api/hr-documents/templates`);
          const all = await resp.json();
          if (all.success) {
            setTemplates(all.templates);
          }
        } catch (e) {
          logger.warn('Failed to refresh templates after upload', e);
        }

        // small delay to ensure UI state updates propagated, then preview
        setTimeout(() => {
          try {
            previewDocument();
          } catch (e) { }
        }, 200);
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload template' });
    } finally {
      setUploadProgress(100);
    }
  }, [documentType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/html': ['.html'],
      'text/plain': ['.txt'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
  });

  // Calculate salary breakup
  const calculateSalary = async () => {
    if (!employeeData.grossSalary) return;

    try {
      // Use VITE_API_BASE_URL (required) - no fallback to localhost
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase) {
    throw new Error('VITE_API_BASE_URL environment variable is required');
  }
      const response = await fetch(`${apiBase}/api/hr-documents/calculate-salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grossSalary: employeeData.grossSalary }),
      });

      const data = await response.json();
      if (data.success) {
        setSalaryBreakup(data.salaryBreakup);
      }
    } catch (error) {
      logger.error('Failed to calculate salary:', error);
    }
  };

  // Preview document
  const previewDocument = async (overrideData?: any) => {
    setLoading(true);
    try {
      // Use override data if provided (and looks like employee data), otherwise use state
      const dataToPreview = (overrideData && overrideData.employeeName) ? overrideData : employeeData;

      // Use VITE_API_BASE_URL (required) - no fallback to localhost
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase) {
    throw new Error('VITE_API_BASE_URL environment variable is required');
  }
      const response = await fetch(`${apiBase}/api/hr-documents/generate/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate || undefined,
          documentType,
          employeeData: { ...dataToPreview, salaryBreakup },
        }),
      });

      const html = await response.text();
      setPreviewHtml(html);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate preview' });
    } finally {
      setLoading(false);
    }
  };

  // View template details / HTML
  const viewTemplate = async (id: string) => {
    try {
      const resp = await fetch(`${apiBase}/api/hr-documents/templates/${id}`);
      const data = await resp.json();

      if (data.success && data.template) {
        let template = data.template;

        // If template doesn't have a static preview (image/html), generate one dynamically
        if (!template.templateImage && !template.html && template.format !== 'image') {
          try {
            const previewResp = await fetch('/api/hr-documents/generate/preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                templateId: template.id,
                documentType: template.documentType,
                employeeData: {
                  employeeName: 'John Doe',
                  employeeId: 'EMP001',
                  designation: 'Software Engineer',
                  department: 'Engineering',
                  dateOfJoining: new Date().toISOString(),
                  grossSalary: 50000
                }
              }),
            });
            if (previewResp.ok) {
              template.html = await previewResp.text();
            }
          } catch (genErr) {
            logger.warn('Failed to generate dynamic preview for view:', genErr);
          }
        }

        setViewTemplateData(template);
        // switch to templates tab if not visible
        setActiveTab('templates');
      }
    } catch (e) {
      logger.error('Failed to fetch template for view', e);
    }
  };

  // Generate and download document
  const generateDocument = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/hr-documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate || undefined,
          documentType,
          outputFormat,
          employeeData: { ...employeeData, salaryBreakup },
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}_${employeeData.employeeId || 'document'}.${outputFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setMessage({ type: 'success', text: 'Document generated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate document' });
    } finally {
      setLoading(false);
    }
  };

  // Delete template
  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`${apiBase}/api/hr-documents/templates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Template deleted successfully!' });
        fetchTemplates();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete template' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HR Document Generator</h1>
          <p className="mt-2 text-gray-600">
            Generate professional HR documents using company templates
          </p>
        </div>

        {/* Alert Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['generate', 'templates', 'upload'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Employee Details</h2>

              <div className="space-y-4">
                {/* Document Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Use Default Template</option>
                    {templates
                      .filter((t) => t.documentType === documentType || t.documentType === 'custom')
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                  </select>
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100 flex items-center">
                    <span className="text-sm text-gray-600 mr-2">Active:</span>
                    <span className="text-sm font-semibold text-blue-700">
                      {selectedTemplate
                        ? templates.find(t => t.id === selectedTemplate)?.name
                        : 'System Default Template'}
                    </span>
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Output Format
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {OUTPUT_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>

                <hr className="my-4" />

                {/* Employee Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee Name * <span className="text-xs font-normal text-gray-500">(Type to search)</span>
                    </label>
                    <input
                      type="text"
                      list="employees-list"
                      value={employeeData.employeeName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const matchedProfile = profiles.find((p: any) => p.full_name === newName);

                        let newData = { ...employeeData, employeeName: newName };

                        if (matchedProfile) {
                          // Auto-fill details from profile
                          newData = {
                            ...newData,
                            employeeId: matchedProfile.employee_id || matchedProfile.id || '',
                            designation: matchedProfile.job_title || '',
                            department: matchedProfile.department || '',
                            dateOfJoining: matchedProfile.join_date ? new Date(matchedProfile.join_date).toISOString().split('T')[0] : '',
                            email: matchedProfile.email || '',
                          };

                          // Trigger preview automatically with new data
                          previewDocument(newData);
                        }

                        setEmployeeData(newData);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Start typing to select employee..."
                    />
                    <datalist id="employees-list">
                      {profiles.map((profile: any) => (
                        <option key={profile.id} value={profile.full_name}>
                          {profile.employee_id ? `(${profile.employee_id})` : ''} - {profile.job_title || 'No Title'}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      value={employeeData.employeeId}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, employeeId: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={employeeData.designation}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, designation: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Department
                    </label>
                    <input
                      type="text"
                      value={employeeData.department}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, department: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Joining
                    </label>
                    <input
                      type="date"
                      value={employeeData.dateOfJoining}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, dateOfJoining: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Leaving
                    </label>
                    <input
                      type="date"
                      value={employeeData.dateOfLeaving || ''}
                      onChange={(e) =>
                        setEmployeeData({ ...employeeData, dateOfLeaving: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Gross Salary (Monthly)
                    </label>
                    <div className="mt-1 flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={employeeData.grossSalary || ''}
                        onChange={(e) =>
                          setEmployeeData({
                            ...employeeData,
                            grossSalary: parseFloat(e.target.value) || 0,
                          })
                        }
                        onBlur={calculateSalary}
                        className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Salary Breakup Display */}
                {salaryBreakup && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Salary Breakup</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Basic: ₹{salaryBreakup.basic?.toFixed(2)}</div>
                      <div>HRA: ₹{salaryBreakup.hra?.toFixed(2)}</div>
                      <div>DA: ₹{salaryBreakup.da?.toFixed(2)}</div>
                      <div>PF: ₹{salaryBreakup.pf?.toFixed(2)}</div>
                      <div>ESI: ₹{salaryBreakup.esi?.toFixed(2)}</div>
                      <div className="font-semibold">
                        Net Pay: ₹{salaryBreakup.netPay?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={previewDocument}
                    disabled={loading}
                    className="flex-1 py-2 px-4 border border-[#1E3A8A] text-[#1E3A8A] rounded-md hover:bg-blue-50/30 disabled:opacity-50"
                  >
                    Preview
                  </button>
                  <button
                    onClick={generateDocument}
                    disabled={loading || !employeeData.employeeName}
                    className="flex-1 py-2 px-4 bg-[#1E3A8A] text-white rounded-md hover:bg-[#152a63] disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate & Download'}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[600px] border rounded"
                  title="Document Preview"
                />
              ) : (
                <div className="h-[600px] flex items-center justify-center text-gray-400 border rounded">
                  Click "Preview" to see document
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Saved Templates</h2>
            </div>
            <div className="p-6">
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No templates uploaded yet. Go to Upload tab to add templates.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-500">
                            {DOCUMENT_TYPES.find((t) => t.value === template.documentType)?.label ||
                              template.documentType}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Format: {template.format?.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <button
                            onClick={() => viewTemplate(template.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setDocumentType(template.documentType);
                          setActiveTab('generate');
                          setSelectedTemplate(template.id);
                        }}
                        className="mt-4 w-full py-2 text-sm text-[#1E3A8A] border border-[#1E3A8A] rounded hover:bg-blue-50/30"
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Template View Modal */}
        {viewTemplateData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-11/12 max-w-4xl h-4/5 rounded shadow-lg overflow-auto p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{viewTemplateData.name || 'Template Preview'}</h3>
                <button onClick={() => setViewTemplateData(null)} className="text-gray-600">Close</button>
              </div>
              <div className="h-[calc(100%-48px)]">
                {viewTemplateData.templateImage || (viewTemplateData.format === 'image' && viewTemplateData.content && viewTemplateData.content.startsWith('data:image')) ? (
                  <div className="flex justify-center bg-gray-100 p-4 min-h-full">
                    <img
                      src={viewTemplateData.templateImage || viewTemplateData.content}
                      alt="Template Preview"
                      className="max-w-full object-contain shadow-lg"
                    />
                  </div>
                ) : viewTemplateData.html ? (
                  <iframe title="template-preview" srcDoc={viewTemplateData.html} className="w-full h-full border" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">Visual preview not available in this view</p>
                    <p className="text-sm mt-2">Use the "Generate" tab to see a full document preview.</p>

                    <button
                      onClick={() => {
                        setSelectedTemplate(viewTemplateData.id);
                        setDocumentType(viewTemplateData.documentType);
                        setActiveTab('generate');
                        setViewTemplateData(null);
                      }}
                      className="mt-6 px-4 py-2 bg-[#1E3A8A] text-white rounded hover:bg-[#152a63]"
                    >
                      Try with Real Data
                    </button>

                    <details className="mt-8 text-xs text-left w-full max-w-lg border-t pt-4">
                      <summary className="cursor-pointer text-gray-400 hover:text-gray-600">View Technical Details (JSON)</summary>
                      <pre className="mt-2 bg-gray-50 p-2 rounded overflow-auto max-h-48">{JSON.stringify(viewTemplateData, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Upload Company Template</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type for this Template
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <input {...getInputProps()} />
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-4 text-lg text-gray-600">
                {isDragActive
                  ? 'Drop the template here...'
                  : 'Drag & drop your company template here'}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Supports: PDF, Word, Excel, HTML, Text, PNG, JPEG
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 bg-[#1E3A8A] text-white rounded-md hover:bg-[#152a63]"
              >
                Browse Files
              </button>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Existing Templates for {DOCUMENT_TYPES.find(t => t.value === documentType)?.label}
              </h3>

              {templates.filter(t => t.documentType === documentType).length === 0 ? (
                <p className="text-gray-500 italic">No templates found for this type.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates
                    .filter(t => t.documentType === documentType)
                    .map(template => (
                      <div key={template.id} className="border rounded-lg p-4 flex justify-between items-center bg-gray-50">
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-gray-500">
                            Uploaded: {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewTemplate(template.id)}
                            className="px-3 py-1 text-sm bg-[#1E3A8A]/10 text-[#1E3A8A] rounded hover:bg-[#1E3A8A]/20"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-800">Template Guidelines</h3>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>Upload your company's existing HR document format</li>
                <li>The system will learn the layout, branding, and structure</li>
                <li>Use placeholders like {'{{employeeName}}'} for dynamic fields</li>
                <li>Supported formats: PDF, Word, Excel, HTML, Images</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDocumentGenerator;
