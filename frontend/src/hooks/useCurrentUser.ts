import { useQuery } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useCurrentUser = () => {
    return useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            try {
                const response = await api.auth.getMe() as any;
                const userData = response?.user || response;
                if (userData) {
                    localStorage.setItem('user', JSON.stringify(userData));
                }
                return userData;
            } catch (error) {
                console.error('Error fetching current user:', error);
                throw error;
            }
        },
        initialData: () => {
            try {
                const stored = localStorage.getItem('user');
                return stored ? JSON.parse(stored) : undefined;
            } catch {
                return undefined;
            }
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
        gcTime: 1000 * 60 * 15,   // 15 minutes
        retry: 1,
    });
};
