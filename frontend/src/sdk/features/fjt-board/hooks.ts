/**
 * FJT Board React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fjtBoardApi } from './api';
import { CreateFjtIssueInput, UpdateFjtIssueInput, FjtStatus, CreateFjtProjectInput } from './types';

const QUERY_KEY = ['fjt-board-data'];

export function useFjtBoardData() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fjtBoardApi.getBoardData(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateFjtIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFjtIssueInput) => fjtBoardApi.createIssue(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateFjtIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFjtIssueInput) => fjtBoardApi.updateIssue(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateFjtEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      epicId,
      ...input
    }: {
      epicId: string;
      epicName?: string;
      summary?: string;
      color?: string;
      status?: FjtStatus;
      startDate?: string;
      dueDate?: string;
    }) => fjtBoardApi.updateEpic(epicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useMoveFjtIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, status }: { issueId: string; status: FjtStatus }) =>
      fjtBoardApi.moveIssueStatus(issueId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useMoveFjtIssueSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, sprintId }: { issueId: string; sprintId: string | null }) =>
      fjtBoardApi.moveIssueSprint(issueId, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteFjtIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issueId: string) => fjtBoardApi.deleteIssue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useCreateFjtSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: string | {
      name: string;
      goal?: string;
      status?: 'active' | 'future' | 'closed';
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
      projectId?: string;
    }) => fjtBoardApi.createSprint(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateFjtSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprint: { id: string; name?: string; goal?: string; status?: 'active' | 'future' | 'closed'; startDate?: string; startTime?: string; endDate?: string; endTime?: string }) =>
      fjtBoardApi.updateSprint(sprint as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteFjtSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => fjtBoardApi.deleteSprint(sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useCreateFjtProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFjtProjectInput) =>
      fjtBoardApi.createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useSetCurrentFjtProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => fjtBoardApi.setCurrentProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useCompleteFjtSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => fjtBoardApi.completeSprint(sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useResetFjtBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fjtBoardApi.resetToDefault(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
