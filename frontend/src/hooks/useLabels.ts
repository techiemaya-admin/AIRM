import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useLabels = () => {
    return useQuery({
        queryKey: ['labels'],
        queryFn: async () => {
            const response = await api.labels.getAll() as any;
            return response.labels || response || [];
        },
        staleTime: 1000 * 60 * 10, // 10 minutes stale time (labels rarely change)
        gcTime: 1000 * 60 * 30,    // 30 minutes cache time
        retry: 1,
    });
};

export const useLabelMutation = () => {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data: any) => api.labels.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.labels.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels'] });
        },
    });

    return {
        create: createMutation,
        delete: deleteMutation,
    };
};
