import { useQuery } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useCurrentUser = () => {
    return useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            try {
                const response = await api.auth.getMe() as any;
                return response?.user || response;
            } catch (error) {
                console.error('Error fetching current user:', error);
                throw error;
            }
        },
        staleTime: Infinity, // Current user rarely changes during a session
        gcTime: 1000 * 60 * 60, // 1 hour
        retry: 1,
    });
};
