/**
 * Profiles Hooks
 * React hooks for profile operations
 * Uses React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllProfiles, getProfileById, updateProfile, deleteProfile, uploadBatchProfiles, uploadProfileFile } from '@sdk/profilesService';
import type {
  EmployeeProfile,
  GetProfileResponse,
  UpdateProfileRequest,
} from '../types';

/**
 * Hook to fetch all employee profiles
 */
export function useProfiles() {
  return useQuery<EmployeeProfile[]>({
    queryKey: ['profiles', 'all'],
    queryFn: async () => {
      try {
        const response = await getAllProfiles();
        console.log('[useProfiles] Response:', response);
        return response.profiles || [];
      } catch (error: any) {
        console.error('[useProfiles] Error fetching profiles:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch a single profile by ID
 */
export function useProfile(id: string | null) {
  return useQuery<EmployeeProfile | null>({
    queryKey: ['profile', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await getProfileById(id);
        console.log('[useProfile] Response:', response);
        return response.profile;
      } catch (error: any) {
        console.error('[useProfile] Error fetching profile:', error);
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

/**
 * Hook for profile mutations
 */
export function useProfileMutation() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileRequest }) =>
      updateProfile(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  const uploadBatch = useMutation({
    mutationFn: (file: File) => uploadBatchProfiles(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  const uploadSingle = useMutation({
    mutationFn: (file: File) => uploadProfileFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  return {
    updateProfile: updateMutation,
    deleteProfile: deleteMutation,
    uploadBatch,
    uploadSingle,
    mutateAsync: updateMutation.mutateAsync,
    isPending: updateMutation.isPending || deleteMutation.isPending || uploadBatch.isPending || uploadSingle.isPending,
  };
}

