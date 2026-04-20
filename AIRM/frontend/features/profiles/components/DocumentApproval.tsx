import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { getEmployeeDocuments, updateDocumentStatus, downloadDocument, getDocumentPreviewUrl } from '@sdk/documentService';
import { EmployeeDocument } from '../types';
import { toast } from 'sonner';

interface DocumentApprovalProps {
  onDocumentUpdate?: () => void;
}

export const DocumentApproval: React.FC<DocumentApprovalProps> = ({
  onDocumentUpdate
}) => {
  const [allDocuments, setAllDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [processingDocument, setProcessingDocument] = useState<string | null>(null);

  useEffect(() => {
    loadAllPendingDocuments();
  }, []);

  const loadAllPendingDocuments = async () => {
    try {
      setLoading(true);
      // Get all pending documents using the status endpoint
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      if (!apiBase) {
        throw new Error('VITE_API_BASE_URL environment variable is required');
      }
      const response = await fetch(`${apiBase}/api/profiles/documents/status/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setAllDocuments(data.documents || []);
    } catch (error: any) {
      console.error('Error loading pending documents:', error);
      // Silently fail - documents approval is optional
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (documentId: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingDocument(documentId);
      await updateDocumentStatus(documentId, status, approvalRemarks || undefined);
      toast.success(`Document ${status} successfully`);
      setShowApprovalDialog(false);
      setApprovalRemarks('');
      setSelectedDocument(null);
      loadAllPendingDocuments();
      onDocumentUpdate?.();
    } catch (error: any) {
      console.error('Error updating document status:', error);
      toast.error('Failed to update document status');
    } finally {
      setProcessingDocument(null);
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
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const pendingDocuments = allDocuments.filter(doc => doc.verification_status === 'pending');
  const approvedDocuments = allDocuments.filter(doc => doc.verification_status === 'approved');
  const rejectedDocuments = allDocuments.filter(doc => doc.verification_status === 'rejected');

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
          <AlertCircle className="h-5 w-5" />
          Document Approval Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved ({approvedDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected ({rejectedDocuments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingDocuments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No pending documents to review</p>
              </div>
            ) : (
              pendingDocuments.map((document) => (
                <div key={document.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getFileIcon(document.file_type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{document.file_name}</h4>
                          {getStatusBadge(document.verification_status)}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {document.document_category} • {document.document_type}
                        </p>
                        <p className="text-xs text-gray-400">
                          Uploaded {format(new Date(document.uploaded_at), 'MMM dd, yyyy')} by {document.uploaded_by}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        disabled={processingDocument === document.id}
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      {document.file_type.includes('image') || document.file_type.includes('pdf') ? (
                        <Dialog open={showPreview && selectedDocument?.id === document.id} onOpenChange={(open) => {
                          setShowPreview(open);
                          if (open) setSelectedDocument(document);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
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
                      ) : null}

                      <Dialog open={showApprovalDialog && selectedDocument?.id === document.id} onOpenChange={(open) => {
                        setShowApprovalDialog(open);
                        if (open) setSelectedDocument(document);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Review Document</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium">{document.file_name}</p>
                              <p className="text-xs text-gray-500">
                                {document.document_category} • {document.document_type}
                              </p>
                              <p className="text-xs text-gray-400">
                                Uploaded by {document.uploaded_by}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Remarks (optional)</label>
                              <Textarea
                                value={approvalRemarks}
                                onChange={(e) => setApprovalRemarks(e.target.value)}
                                placeholder="Add remarks for approval/rejection..."
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleStatusUpdate(document.id, 'approved')}
                                disabled={processingDocument === document.id}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleStatusUpdate(document.id, 'rejected')}
                                disabled={processingDocument === document.id}
                                className="flex-1"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedDocuments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No approved documents</p>
              </div>
            ) : (
              approvedDocuments.map((document) => (
                <div key={document.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getFileIcon(document.file_type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{document.file_name}</h4>
                          {getStatusBadge(document.verification_status)}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {document.document_category} • {document.document_type}
                        </p>
                        <p className="text-xs text-gray-400">
                          Approved {document.verified_at ? format(new Date(document.verified_at), 'MMM dd, yyyy') : 'N/A'}
                          {document.verified_by && ` by ${document.verified_by}`}
                        </p>
                        {document.remarks && (
                          <p className="text-xs text-gray-600 mt-1 italic">
                            Remarks: {document.remarks}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedDocuments.length === 0 ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No rejected documents</p>
              </div>
            ) : (
              rejectedDocuments.map((document) => (
                <div key={document.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getFileIcon(document.file_type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{document.file_name}</h4>
                          {getStatusBadge(document.verification_status)}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {document.document_category} • {document.document_type}
                        </p>
                        <p className="text-xs text-gray-400">
                          Rejected {document.verified_at ? format(new Date(document.verified_at), 'MMM dd, yyyy') : 'N/A'}
                          {document.verified_by && ` by ${document.verified_by}`}
                        </p>
                        {document.remarks && (
                          <p className="text-xs text-red-600 mt-1 italic">
                            Remarks: {document.remarks}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
