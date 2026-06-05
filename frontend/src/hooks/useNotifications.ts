import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useNotifications = (unreadOnly?: boolean) => {
    return useQuery({
        queryKey: ['notifications', unreadOnly],
        queryFn: async () => {
            const response = await api.notifications.getAll(unreadOnly) as any;
            return response.notifications || response || [];
        },
        staleTime: 1000 * 60 * 1, // 1 minute
        gcTime: 1000 * 60 * 5,    // 5 minutes
        refetchOnWindowFocus: true,
    });
};

export const useUnreadNotificationsCount = () => {
    return useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: async () => {
            const response = await api.notifications.getUnreadCount() as any;
            return response.count !== undefined ? response.count : response;
        },
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 60, // Refetch every minute
    });
};

export const useNotificationMutation = () => {
    const queryClient = useQueryClient();

    const markReadMutation = useMutation({
        mutationFn: (id: string) => api.notifications.markRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => api.notifications.markAllRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    return {
        markRead: markReadMutation,
        markAllRead: markAllReadMutation,
    };
};
