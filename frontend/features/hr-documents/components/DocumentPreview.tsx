import { FileText, Eye, User, Building, Mail, Phone, Calendar, MapPin, DollarSign, Briefcase, Download } from "lucide-react";
import { UploadedTemplate, EmployeeData } from "../types";
import { useMemo, useEffect, useState } from "react";
import { mergeDocxWithData } from "../lib/docxMerge";
import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
  template: UploadedTemplate | null;
  employeeData: EmployeeData;
  onDownloadPdf?: () => void;
  onDownloadDocx?: () => void;
}

const fieldIcons: Record<string, React.ReactNode> = {
  employee_name: <User className="h-3.5 w-3.5" />,
  employee_id: <Briefcase className="h-3.5 w-3.5" />,
  designation: <Briefcase className="h-3.5 w-3.5" />,
  department: <Building className="h-3.5 w-3.5" />,
  date_of_joining: <Calendar className="h-3.5 w-3.5" />,
  date_of_leaving: <Calendar className="h-3.5 w-3.5" />,
  salary: <DollarSign className="h-3.5 w-3.5" />,
  address: <MapPin className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
  manager_name: <User className="h-3.5 w-3.5" />,
  company_name: <Building className="h-3.5 w-3.5" />,
};

const fieldLabels: Record<string, string> = {
  employee_name: "Employee Name",
  employee_id: "Employee ID",
  designation: "Designation",
  department: "Department",
  date_of_joining: "Date of Joining",
  date_of_leaving: "Date of Leaving",
  salary: "Salary",
  address: "Address",
  email: "Email",
  phone: "Phone",
  manager_name: "Manager Name",
  company_name: "Company Name",
};

const DocumentPreview = ({ template, employeeData, onDownloadPdf, onDownloadDocx }: DocumentPreviewProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Create merged DOCX blob URL for preview
  useEffect(() => {
    if (!template?.content || template.type !== 'docx') {
      setMergedBlobUrl(null);
      setIsReady(false);
      return;
    }

    setIsProcessing(true);
    setIsReady(false);

    const timeoutId = setTimeout(async () => {
      try {
        const merged = await mergeDocxWithData(template.content, employeeData);
        const blob = new Blob([merged], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        const url = URL.createObjectURL(blob);
        setMergedBlobUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setIsReady(true);
      } catch (error) {
        console.error('Error creating merged preview:', error);
        setIsReady(true);
      } finally {
        setIsProcessing(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [template?.content, template?.type, employeeData]);

  // Handle PDF blob URL
  useEffect(() => {
    if (template?.type === 'pdf' && template.file) {
      const url = URL.createObjectURL(template.file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
    }
  }, [template?.type, template?.file]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mergedBlobUrl) URL.revokeObjectURL(mergedBlobUrl);
    };
  }, []);

  const filledFields = useMemo(() => {
    return Object.entries(employeeData).filter(([_, value]) => {
      if (value == null) return false;
      if (typeof value === 'object') return false;
      return String(value).trim() !== '';
    }).map(([key, value]) => [key, String(value)] as [string, string]);
  }, [employeeData]);

  const handleDocxDownload = () => {
    if (onDownloadDocx) {
      onDownloadDocx();
    }
  };

  const DataSummaryPanel = () => (
    <div className="bg-accent/50 border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <h4 className="font-semibold text-sm text-foreground">Data to Merge</h4>
        <span className="text-xs text-muted-foreground ml-auto">
          {filledFields.length} field{filledFields.length !== 1 ? 's' : ''} filled
        </span>
      </div>

      {filledFields.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No data entered yet. Fill in the employee form.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filledFields.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-sm bg-background rounded-md px-2.5 py-1.5">
              <span className="text-muted-foreground">{fieldIcons[key]}</span>
              <div className="min-w-0 flex-1">
                <span className="text-muted-foreground text-xs block truncate">{fieldLabels[key]}</span>
                <span className="text-foreground font-medium truncate block">{value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-[400px] border border-dashed border-border rounded-lg">
        <div className="text-center p-8">
          <div className="p-4 rounded-full bg-muted inline-block mb-4">
            <Eye className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Document Preview</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Upload a template to see a live preview of the merged document
          </p>
        </div>
      </div>
    );
  }

  if (template.type === 'pdf') {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{template.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">PDF Preview</span>
        </div>
        <div className="p-4">
          <DataSummaryPanel />
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-[500px] rounded-lg"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{template.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {isProcessing ? 'Processing...' : 'Document Ready'}
        </span>
      </div>
      <div className="p-4">
        <DataSummaryPanel />

        <div className="bg-card min-h-[400px] border border-border rounded-lg shadow-sm overflow-hidden">
          {isProcessing ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Processing document...</span>
              </div>
            </div>
          ) : isReady || mergedBlobUrl ? (
            <div className="flex flex-col h-full">
              <div className="bg-accent/50 border-b border-border px-4 py-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      📄 Document with merged data is ready
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      Download with all headers, footers, and formatting preserved.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDocxDownload}
                      disabled={!onDownloadDocx}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      DOCX
                    </Button>
                    {onDownloadPdf && (
                      <Button
                        size="sm"
                        onClick={onDownloadPdf}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 flex flex-col items-center justify-center bg-muted/30">
                <div className="text-center max-w-md">
                  <div className="p-4 rounded-full bg-primary/10 inline-block mb-4">
                    <FileText className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your employee data has been merged into the template. The document preserves all original formatting.
                  </p>

                  {filledFields.length > 0 && (
                    <div className="bg-background border border-border rounded-lg p-4 text-left">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Merged Fields
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {filledFields.map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                          >
                            {fieldIcons[key]}
                            {fieldLabels[key]}: <span className="font-medium">{value}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-4">
                    💡 DOCX preserves perfect formatting. PDF may have minor differences with complex headers/footers.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-sm text-muted-foreground">Upload a template to preview</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
