import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileCheck,
  FileX,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { getEmployeeDocuments, downloadDocument, getDocumentPreviewUrl } from '@sdk/documentService';
import { EmployeeDocument, DOCUMENT_CATEGORIES, DOCUMENT_TYPES } from '../types';
import { toast } from 'sonner';

interface DocumentListProps {
  profileId: string;
  onDocumentUpdate?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  profileId,
  onDocumentUpdate
}) => {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [profileId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const documents = await getEmployeeDocuments(profileId);
      setDocuments(documents);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document: EmployeeDocument) => {
    try {
      const blob = await downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('image')) return <Eye className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('word') || fileType.includes('doc')) return <FileCheck className="h-5 w-5 text-blue-600" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const getCategoryName = (category: string) => {
    return DOCUMENT_CATEGORIES[category as keyof typeof DOCUMENT_CATEGORIES] || category;
  };

  const getTypeName = (category: string, type: string) => {
    const types = DOCUMENT_TYPES[category as keyof typeof DOCUMENT_TYPES];
    return types?.find(t => t === type) || type;
  };

  // Group documents by category
  const groupedDocuments = documents.reduce((acc, doc) => {
    const category = doc.document_category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, EmployeeDocument[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No documents uploaded yet</p>
            <p className="text-xs text-gray-400 mt-1">Use the upload section above to add documents</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDocuments).map(([category, categoryDocs]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {getCategoryName(category)}
                </h3>
                <div className="grid gap-3">
                  {categoryDocs.map((document) => (
                    <div key={document.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getFileIcon(document.file_type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">{document.file_name}</h4>
                              {getStatusBadge(document.verification_status)}
                            </div>
                            <p className="text-xs text-gray-500 mb-1">
                              {getTypeName(document.document_category, document.document_type)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Uploaded {format(new Date(document.uploaded_at), 'MMM dd, yyyy')} by {document.uploaded_by}
                            </p>
                            {document.verified_at && (
                              <p className="text-xs text-gray-400">
                                {document.verification_status === 'approved' ? 'Approved' : 'Rejected'} {format(new Date(document.verified_at), 'MMM dd, yyyy')}
                                {document.verified_by && ` by ${document.verified_by}`}
                              </p>
                            )}
                            {document.remarks && (
                              <p className="text-xs text-gray-600 mt-1 italic">
                                Remarks: {document.remarks}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {(document.file_type.includes('image') || document.file_type.includes('pdf')) && (
                            <Dialog open={showPreview && selectedDocument?.id === document.id} onOpenChange={(open) => {
                              setShowPreview(open);
                              if (open) setSelectedDocument(document);
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Preview">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle>{document.file_name}</DialogTitle>
                                </DialogHeader>
                                <div className="flex justify-center">
                                  {document.file_type.includes('image') ? (
                                    <img
                                      src={getDocumentPreviewUrl(document.id)}
                                      alt={document.file_name}
                                      className="max-w-full max-h-[60vh] object-contain"
                                    />
                                  ) : (
                                    <iframe
                                      src={getDocumentPreviewUrl(document.id)}
                                      className="w-full h-[60vh]"
                                      title={document.file_name}
                                    />
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
