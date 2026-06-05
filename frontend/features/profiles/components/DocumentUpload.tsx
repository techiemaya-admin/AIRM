import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { uploadDocument } from '@sdk/documentService';
import { DOCUMENT_CATEGORIES, DOCUMENT_TYPES } from '../types';
import { toast } from 'sonner';

interface DocumentUploadProps {
  employeeId: string;
  onUploadSuccess?: () => void;
}

interface UploadFile extends File {
  preview?: string;
  documentCategory?: string;
  documentType?: string;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  employeeId,
  onUploadSuccess
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      ...file,
      preview: URL.createObjectURL(file),
      uploadProgress: 0,
      uploadStatus: 'idle' as const
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const handleCategorySelect = (fileIndex: number, category: string) => {
    setFiles(prev => prev.map((file, index) =>
      index === fileIndex ? { ...file, documentCategory: category } : file
    ));
  };

  const handleTypeSelect = (fileIndex: number, type: string) => {
    setFiles(prev => prev.map((file, index) =>
      index === fileIndex ? { ...file, documentType: type } : file
    ));
  };

  const handleUpload = async (fileIndex: number) => {
    const file = files[fileIndex];
    if (!file.documentCategory || !file.documentType) {
      toast.error('Please select document category and type');
      return;
    }

    setFiles(prev => prev.map((f, index) =>
      index === fileIndex ? { ...f, uploadStatus: 'uploading' as const } : f
    ));

    try {
      await uploadDocument(employeeId, file.documentCategory, file.documentType, file);
      setFiles(prev => prev.map((f, index) =>
        index === fileIndex ? { ...f, uploadStatus: 'success' as const } : f
      ));
      toast.success('Document uploaded successfully');
      onUploadSuccess?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map((f, index) =>
        index === fileIndex ? {
          ...f,
          uploadStatus: 'error' as const,
          errorMessage: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
      toast.error('Failed to upload document');
    }
  };

  const removeFile = (fileIndex: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const file = newFiles[fileIndex];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      newFiles.splice(fileIndex, 1);
      return newFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-lg font-medium text-primary">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Selected Files</h3>
            {files.map((file, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.uploadStatus === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {file.uploadStatus === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={file.uploadStatus === 'uploading'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Category and Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between mt-1">
                          {file.documentCategory || 'Select Category'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {Object.values(DOCUMENT_CATEGORIES).map((category: string) => (
                          <DropdownMenuItem
                            key={category}
                            onClick={() => handleCategorySelect(index, category)}
                          >
                            {category}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Document Type</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between mt-1"
                          disabled={!file.documentCategory}
                        >
                          {file.documentType || 'Select Type'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {file.documentCategory && DOCUMENT_TYPES[file.documentCategory as keyof typeof DOCUMENT_TYPES]?.map(type => (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => handleTypeSelect(index, type)}
                          >
                            {type}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Upload Button */}
                <div className="flex items-center justify-between">
                  {file.uploadStatus === 'error' && file.errorMessage && (
                    <p className="text-sm text-red-600">{file.errorMessage}</p>
                  )}
                  <Button
                    onClick={() => handleUpload(index)}
                    disabled={!file.documentCategory || !file.documentType || file.uploadStatus === 'uploading' || file.uploadStatus === 'success'}
                    className="ml-auto"
                  >
                    {file.uploadStatus === 'uploading' ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
