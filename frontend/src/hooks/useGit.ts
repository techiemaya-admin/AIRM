import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useGitCommits = () => {
    return useQuery({
        queryKey: ['git-commits'],
        queryFn: async () => {
            const response = await api.git.getCommits() as any;
            return response.commits || response || [];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
        gcTime: 1000 * 60 * 10,   // 10 minutes
    });
};

export const useGitIssues = () => {
    return useQuery({
        queryKey: ['git-issues'],
        queryFn: async () => {
            const response = await api.git.getIssues() as any;
            return response.issues || response || [];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
        gcTime: 1000 * 60 * 10,   // 10 minutes
    });
};

export const useGitUsers = () => {
    return useQuery({
        queryKey: ['git-users'],
        queryFn: async () => {
            const response = await api.git.getUsers() as any;
            return response.users || response || [];
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

export const useGitMutation = () => {
    const queryClient = useQueryClient();

    const syncUsersMutation = useMutation({
        mutationFn: () => api.git.syncUsers(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['git-users'] });
        },
    });

    const syncIssuesMutation = useMutation({
        mutationFn: () => api.git.syncIssues(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['git-issues'] });
        },
    });

    return {
        syncUsers: syncUsersMutation,
        syncIssues: syncIssuesMutation,
    };
};
