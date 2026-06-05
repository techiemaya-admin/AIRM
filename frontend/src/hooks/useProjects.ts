import { useQuery } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useProjects = () => {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await api.projects.getAll() as any;
            return response.projects || response || [];
        },
        staleTime: 1000 * 60 * 10, // Projects don't change often
        gcTime: 1000 * 60 * 30,    // Longer cache time
        retry: 1,
    });
};
