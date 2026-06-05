import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadedTemplate } from '../types';
import { useToast } from '@/hooks/use-toast';

interface TemplateUploadProps {
  onTemplateUpload: (template: UploadedTemplate) => void;
  currentTemplate: UploadedTemplate | null;
  onRemoveTemplate: () => void;
}

const TemplateUpload = ({ onTemplateUpload, currentTemplate, onRemoveTemplate }: TemplateUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    const fileName = file.name.toLowerCase();
    
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.pdf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a .docx or .pdf file',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const content = await file.arrayBuffer();
      const template: UploadedTemplate = {
        name: file.name,
        type: fileName.endsWith('.pdf') ? 'pdf' : 'docx',
        content,
        file,
      };
      
      onTemplateUpload(template);
      toast({
        title: 'Template uploaded',
        description: `${file.name} is ready for merging`,
      });
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not read the file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onTemplateUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  if (currentTemplate) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{currentTemplate.name}</p>
              <p className="text-xs text-muted-foreground uppercase">{currentTemplate.type} template</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <Button variant="ghost" size="sm" onClick={onRemoveTemplate}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById('template-input')?.click()}
    >
      <input
        id="template-input"
        type="file"
        accept=".docx,.pdf"
        className="hidden"
        onChange={handleInputChange}
      />
      
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 rounded-full bg-muted">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">
            {isLoading ? 'Uploading...' : 'Drop your template here'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse (.docx, .pdf)
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplateUpload;
