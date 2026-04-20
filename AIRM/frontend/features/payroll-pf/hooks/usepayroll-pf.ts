/**
 * Payroll & PF Hooks
 * React hooks for payroll and PF operations
 * Uses React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPayslips,
  getPayslipById,
  upsertPayslip,
  releasePayslip,
  lockPayslip,
  getPfDetails,
  upsertPfDetails,
  getPfContributions,
  createPfContribution,
  getPfDocuments,
  addPfDocument,
  generatePayslips,
  getEmployeesSalaryInfo,
  generatePayslipForEmployee,
  updateEmployeeSalary,
} from '@sdk/payroll-pfService';
import type {
  Payslip,
  PfDetails,
  PfContribution,
  UpsertPayslipRequest,
  UpsertPfDetailsRequest,
  CreatePfContributionRequest,
  AddPfDocumentRequest,
  GetPayslipResponse,
} from '../types';

// ==================== Payslips Hooks ====================

export interface UsePayslipsFilters {
  user_id?: string;
  month?: number;
  year?: number;
  status?: string;
  department?: string;
  upcoming_only?: boolean;
}

/**
 * Hook to fetch payslips
 */
export function usePayslips(filters?: UsePayslipsFilters) {
  return useQuery<Payslip[]>({
    queryKey: ['payslips', 'all', filters],
    queryFn: async () => {
      try {
        const response = await getPayslips(filters);
        console.log('[usePayslips] Response:', response);
        return response.payslips || [];
      } catch (error: any) {
        console.error('[usePayslips] Error fetching payslips:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch a single payslip by ID
 */
export function usePayslip(id: string | null) {
  return useQuery<GetPayslipResponse>({
    queryKey: ['payslip', id],
    queryFn: async () => {
      if (!id) throw new Error('Payslip ID is required');
      try {
        const response = await getPayslipById(id);
        console.log('[usePayslip] Response:', response);
        return response;
      } catch (error: any) {
        console.error('[usePayslip] Error fetching payslip:', error);
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

// ==================== PF Details Hooks ====================

/**
 * Hook to fetch PF details for a user
 */
export function usePfDetails(userId?: string) {
  return useQuery<PfDetails | null>({
    queryKey: ['pf-details', userId || 'self'],
    queryFn: async () => {
      try {
        const response = await getPfDetails(userId);
        console.log('[usePfDetails] Response:', response);
        return response.pf_details;
      } catch (error: any) {
        console.error('[usePfDetails] Error fetching PF details:', error);
        throw error;
      }
    },
    staleTime: 60000, // 1 minute
    retry: 1,
  });
}

// ==================== PF Contributions Hooks ====================

export interface UsePfContributionsFilters {
  user_id?: string;
  month?: number;
  year?: number;
}

/**
 * Hook to fetch PF contributions
 */
export function usePfContributions(filters?: UsePfContributionsFilters) {
  return useQuery<PfContribution[]>({
    queryKey: ['pf-contributions', 'all', filters],
    queryFn: async () => {
      try {
        const response = await getPfContributions(filters);
        console.log('[usePfContributions] Response:', response);
        return response.contributions || [];
      } catch (error: any) {
        console.error('[usePfContributions] Error fetching PF contributions:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

// ==================== Mutation Hooks ====================

/**
 * Hook for payroll mutations
 */
export function usePayrollMutation() {
  const queryClient = useQueryClient();

  const payslipMutation = useMutation({
    mutationFn: (data: UpsertPayslipRequest) => upsertPayslip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => releasePayslip(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip', id] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => lockPayslip(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip', id] });
    },
  });

  const pfDetailsMutation = useMutation({
    mutationFn: ({ data, userId }: { data: UpsertPfDetailsRequest; userId?: string }) =>
      upsertPfDetails(data, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pf-details', variables.userId || 'self'] });
    },
  });

  const pfContributionMutation = useMutation({
    mutationFn: (data: CreatePfContributionRequest) => createPfContribution(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pf-contributions'] });
    },
  });

  const pfDocumentMutation = useMutation({
    mutationFn: (data: AddPfDocumentRequest) => addPfDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pf-documents'] });
    },
  });

  const generatePayslipsMutation = useMutation({
    mutationFn: (data: { month: number; year: number }) => generatePayslips(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });

  const generatePayslipForEmployeeMutation = useMutation({
    mutationFn: (data: { employee_id: string; month: number; year: number }) =>
      generatePayslipForEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['employees-salary-info'] });
    },
  });

  const updateEmployeeSalaryMutation = useMutation({
    mutationFn: (data: { userId: string; pf_base_salary: number }) =>
      updateEmployeeSalary(data.userId, data.pf_base_salary),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees-salary-info'] });
      queryClient.invalidateQueries({ queryKey: ['pf-details', variables.userId] });
    },
  });

  return {
    upsertPayslip: payslipMutation,
    releasePayslip: releaseMutation,
    lockPayslip: lockMutation,
    generatePayslips: generatePayslipsMutation,
    generatePayslipForEmployee: generatePayslipForEmployeeMutation,
    updateEmployeeSalary: updateEmployeeSalaryMutation,
    upsertPfDetails: pfDetailsMutation,
    createPfContribution: pfContributionMutation,
    addPfDocument: pfDocumentMutation,
  };
}

// ==================== Employee Salary Info Hook ====================

export interface EmployeeSalaryInfo {
  id: string;
  full_name: string;
  email: string;
  employee_id?: string;
  department?: string;
  designation?: string;
  phone?: string;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  bank_branch?: string;
  pf_base_salary?: number;
  uan_number?: string;
  pf_account_number?: string;
  pf_status?: string;
  pf_details_id?: string;
  gross_salary: number;
  basic_salary: number;
  hra: number;
  other_allowances: number;
}

/**
 * Hook to fetch all employees with salary and bank details
 */
export function useEmployeesSalaryInfo() {
  return useQuery<EmployeeSalaryInfo[]>({
    queryKey: ['employees-salary-info'],
    queryFn: async () => {
      try {
        const response = await getEmployeesSalaryInfo();
        console.log('[useEmployeesSalaryInfo] Response:', response);
        return response.employees || [];
      } catch (error: any) {
        console.error('[useEmployeesSalaryInfo] Error fetching employees salary info:', error);
        throw error;
      }
    },
    staleTime: 60000, // 1 minute
    retry: 1,
  });
}
