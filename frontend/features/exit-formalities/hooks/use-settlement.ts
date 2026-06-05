/**
 * Settlement Hooks
 * React hooks for settlement PDF data operations
 * Uses React Query
 */

import { useQuery } from '@tanstack/react-query';
import {
  getAssetHandoverPDFData,
  getExperienceLetterPDFData,
  getRelievingLetterPDFData,
} from '@sdk/exit-formalitiesService';
import type {
  AssetHandoverPDFData,
  ExperienceLetterPDFData,
  RelievingLetterPDFData,
} from '../types';

/**
 * Hook to get asset handover PDF data
 */
export function useAssetHandoverPDFData(exitRequestId: string | null) {
  return useQuery<AssetHandoverPDFData>({
    queryKey: ['asset-handover-pdf', exitRequestId],
    queryFn: async () => {
      if (!exitRequestId) throw new Error('Exit request ID is required');
      const response = await getAssetHandoverPDFData(exitRequestId);
      return response.pdfData;
    },
    enabled: false, // Don't auto-fetch, only fetch on demand
    staleTime: 60000,
    retry: 1,
  });
}

/**
 * Hook to get experience letter PDF data
 */
export function useExperienceLetterPDFData(exitRequestId: string | null) {
  return useQuery<ExperienceLetterPDFData>({
    queryKey: ['experience-letter-pdf', exitRequestId],
    queryFn: async () => {
      if (!exitRequestId) throw new Error('Exit request ID is required');
      const response = await getExperienceLetterPDFData(exitRequestId);
      return response.pdfData;
    },
    enabled: false, // Don't auto-fetch, only fetch on demand
    staleTime: 60000,
    retry: 1,
  });
}

/**
 * Hook to get relieving letter PDF data
 */
export function useRelievingLetterPDFData(exitRequestId: string | null) {
  return useQuery<RelievingLetterPDFData>({
    queryKey: ['relieving-letter-pdf', exitRequestId],
    queryFn: async () => {
      if (!exitRequestId) throw new Error('Exit request ID is required');
      const response = await getRelievingLetterPDFData(exitRequestId);
      return response.pdfData;
    },
    enabled: false, // Don't auto-fetch, only fetch on demand
    staleTime: 60000,
    retry: 1,
  });
}

