import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useLeaveRequests = () => {
    return useQuery({
        queryKey: ['leave-requests'],
        queryFn: async () => {
            const response = await api.leave.getAll() as any;
            return response.leave_requests || (Array.isArray(response) ? response : []);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useLeaveBalances = (userId?: string) => {
    return useQuery({
        queryKey: ['leave-balances', userId],
        queryFn: async () => {
            if (userId) {
                const response = await api.leaveCalendar.getBalancesForUser(userId) as any;
                return response.leave_balances || response.balances || (Array.isArray(response) ? response : []);
            }
            const response = await api.leaveCalendar.getBalances() as any;
            return response.leave_balances || response.balances || (Array.isArray(response) ? response : []);
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

export const useLeaveMutation = () => {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data: any) => api.leave.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, admin_notes }: { id: string, status: string, admin_notes?: string }) =>
            api.leave.updateStatus(id, status, admin_notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
        },
    });

    const updateBalanceMutation = useMutation({
        mutationFn: (data: any) => api.leaveCalendar.updateBalance(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
        },
    });

    return {
        create: createMutation,
        updateStatus: updateStatusMutation,
        updateBalance: updateBalanceMutation,
    };
};
