/**
 * Document Generator Component
 * Generates PDF documents for exit formalities
 */

import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  useAssetHandoverPDFData,
  useExperienceLetterPDFData,
  useRelievingLetterPDFData,
} from '../hooks/use-settlement';
import {
  generateAssetHandoverPDF,
  generateExperienceLetterPDF,
  generateRelievingLetterPDF,
} from '../utils/pdf-generator';
import { Download, FileText, RefreshCw, Package, Award, LogOut } from 'lucide-react';

interface DocumentGeneratorProps {
  exitRequestId: string;
  employeeName?: string;
  employeeId?: string;
}

export function DocumentGenerator({ exitRequestId, employeeName, employeeId }: DocumentGeneratorProps) {
  const { data: assetHandoverPDF, isLoading: assetHandoverLoading, refetch: refetchAssetHandover } = useAssetHandoverPDFData(exitRequestId);
  const { data: experienceLetterPDF, isLoading: experienceLetterLoading, refetch: refetchExperienceLetter } = useExperienceLetterPDFData(exitRequestId);
  const { data: relievingLetterPDF, isLoading: relievingLetterLoading, refetch: refetchRelievingLetter } = useRelievingLetterPDFData(exitRequestId);

  const handleDownloadAssetHandover = async () => {
    try {
      // Fetch data if not already loaded
      let pdfData = assetHandoverPDF;
      if (!pdfData) {
        const result = await refetchAssetHandover();
        pdfData = result.data;
      }
      
      if (!pdfData) {
        toast({
          title: 'Error',
          description: 'Failed to fetch asset handover data',
          variant: 'destructive',
        });
        return;
      }
      
      generateAssetHandoverPDF(
        pdfData,
        `asset_handover_${employeeId || exitRequestId}_${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast({
        title: 'Downloaded',
        description: 'Asset Handover PDF downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadExperienceLetter = async () => {
    try {
      // Fetch data if not already loaded
      let pdfData = experienceLetterPDF;
      if (!pdfData) {
        const result = await refetchExperienceLetter();
        pdfData = result.data;
      }
      
      if (!pdfData) {
        toast({
          title: 'Error',
          description: 'Failed to fetch experience letter data',
          variant: 'destructive',
        });
        return;
      }
      
      generateExperienceLetterPDF(
        pdfData,
        `experience_letter_${employeeId || exitRequestId}_${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast({
        title: 'Downloaded',
        description: 'Experience Letter PDF downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadRelievingLetter = async () => {
    try {
      // Fetch data if not already loaded
      let pdfData = relievingLetterPDF;
      if (!pdfData) {
        const result = await refetchRelievingLetter();
        pdfData = result.data;
      }
      
      if (!pdfData) {
        toast({
          title: 'Error',
          description: 'Failed to fetch relieving letter data',
          variant: 'destructive',
        });
        return;
      }
      
      generateRelievingLetterPDF(
        pdfData,
        `relieving_letter_${employeeId || exitRequestId}_${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast({
        title: 'Downloaded',
        description: 'Relieving Letter PDF downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Button
        onClick={handleDownloadAssetHandover}
        disabled={assetHandoverLoading}
        variant="outline"
        className="flex flex-col items-center justify-center h-24 space-y-2"
      >
        {assetHandoverLoading ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-xs">Loading...</span>
          </>
        ) : (
          <>
            <Package className="h-5 w-5" />
            <span className="text-xs">Asset Handover</span>
          </>
        )}
      </Button>

      <Button
        onClick={handleDownloadExperienceLetter}
        disabled={experienceLetterLoading}
        variant="outline"
        className="flex flex-col items-center justify-center h-24 space-y-2"
      >
        {experienceLetterLoading ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-xs">Loading...</span>
          </>
        ) : (
          <>
            <Award className="h-5 w-5" />
            <span className="text-xs">Experience Letter</span>
          </>
        )}
      </Button>

      <Button
        onClick={handleDownloadRelievingLetter}
        disabled={relievingLetterLoading}
        variant="outline"
        className="flex flex-col items-center justify-center h-24 space-y-2"
      >
        {relievingLetterLoading ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-xs">Loading...</span>
          </>
        ) : (
          <>
            <LogOut className="h-5 w-5" />
            <span className="text-xs">Relieving Letter</span>
          </>
        )}
      </Button>
    </div>
  );
}

