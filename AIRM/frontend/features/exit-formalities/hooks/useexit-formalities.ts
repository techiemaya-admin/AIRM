/**
 * Exit Formalities Hooks
 * React hooks for exit formalities operations
 * Uses React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllExitRequests,
  getExitRequestById,
  createExitRequest,
  updateExitRequest,
  approveExitRequest,
  updateClearance,
  completeExit,
  saveExitInterview,
  addExitDocument,
  deleteExitRequest,
  getSettlement,
  calculateSettlement,
  getSettlementPDFData,
  getAssetHandoverPDFData,
  getExperienceLetterPDFData,
  getRelievingLetterPDFData,
} from '@sdk/exit-formalitiesService';
import type {
  ExitRequest,
  GetExitRequestResponse,
  CreateExitRequestRequest,
  UpdateExitRequestRequest,
  ApproveExitRequestRequest,
  UpdateClearanceRequest,
  SaveExitInterviewRequest,
  AddExitDocumentRequest,
  FinalSettlement,
  ExitSettlement,
  SettlementPDFData,
  AssetHandoverPDFData,
  ExperienceLetterPDFData,
  RelievingLetterPDFData,
} from '../types';

// ==================== Exit Requests Hooks ====================

export interface UseExitRequestsFilters {
  status?: string;
  department?: string;
  manager_id?: string;
}

/**
 * Hook to fetch all exit requests
 */
export function useExitRequests(filters?: UseExitRequestsFilters) {
  return useQuery<ExitRequest[]>({
    queryKey: ['exit-requests', 'all', filters],
    queryFn: async () => {
      try {
        const response = await getAllExitRequests(filters);
        console.log('[useExitRequests] Response:', response);
        return response.exit_requests || [];
      } catch (error: any) {
        console.error('[useExitRequests] Error fetching exit requests:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch a single exit request by ID
 */
export function useExitRequest(id: string | null) {
  return useQuery<GetExitRequestResponse>({
    queryKey: ['exit-request', id],
    queryFn: async () => {
      if (!id) throw new Error('Exit request ID is required');
      try {
        const response = await getExitRequestById(id);
        console.log('[useExitRequest] Response:', response);
        return response;
      } catch (error: any) {
        console.error('[useExitRequest] Error fetching exit request:', error);
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

// ==================== Mutation Hooks ====================

/**
 * Hook for exit request mutations
 */
export function useExitMutation() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateExitRequestRequest) => createExitRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exit-requests'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExitRequestRequest }) =>
      updateExitRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['exit-request', variables.id] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveExitRequestRequest }) =>
      approveExitRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['exit-request', variables.id] });
    },
  });

  const clearanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClearanceRequest }) =>
      updateClearance(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exit-request', variables.id] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeExit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['exit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['exit-request', id] });
    },
  });

  const interviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveExitInterviewRequest }) =>
      saveExitInterview(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exit-request', variables.id] });
    },
  });

  const documentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddExitDocumentRequest }) =>
      addExitDocument(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exit-request', variables.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExitRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exit-requests'] });
    },
  });

  return {
    createExitRequest: createMutation,
    updateExitRequest: updateMutation,
    approveExitRequest: approveMutation,
    updateClearance: clearanceMutation,
    completeExit: completeMutation,
    saveExitInterview: interviewMutation,
    addExitDocument: documentMutation,
    deleteExitRequest: deleteMutation,
  };
}

// ==================== Settlement Hooks ====================

/**
 * Hook to get settlement
 */
export function useSettlement(exitRequestId: string | null) {
  return useQuery<ExitSettlement | null>({
    queryKey: ['settlement', exitRequestId],
    queryFn: async () => {
      if (!exitRequestId) return null;
      try {
        const response = await getSettlement(exitRequestId);
        return response.settlement;
      } catch (error: any) {
        console.error('[useSettlement] Error fetching settlement:', error);
        throw error;
      }
    },
    enabled: !!exitRequestId,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

/**
 * Hook to calculate settlement
 */
export function useCalculateSettlement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      exitRequestId,
      data,
    }: {
      exitRequestId: string;
      data?: {
        leaveBalance?: number;
        bonusAmount?: number;
        incentivesAmount?: number;
        reimbursements?: number;
        noticePeriodRequired?: number;
        noticePeriodServed?: number;
      };
    }) => {
      const response = await calculateSettlement(exitRequestId, data);
      return response.settlement;
    },
    onSuccess: (data, variables) => {
      // Invalidate settlement query
      queryClient.invalidateQueries({ queryKey: ['settlement', variables.exitRequestId] });
    },
  });
}

/**
 * Hook to get settlement PDF data
 */
export function useSettlementPDFData(exitRequestId: string | null) {
  return useQuery<SettlementPDFData>({
    queryKey: ['settlement-pdf', exitRequestId],
    queryFn: async () => {
      if (!exitRequestId) throw new Error('Exit request ID is required');
      const response = await getSettlementPDFData(exitRequestId);
      return response.pdfData;
    },
    enabled: !!exitRequestId,
    staleTime: 60000, // 1 minute
    retry: 1,
  });
}

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

