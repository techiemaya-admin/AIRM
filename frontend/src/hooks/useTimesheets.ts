import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useTimesheets = (params?: { week_start?: string; user_id?: string }) => {
    return useQuery({
        queryKey: ['timesheets', params],
        queryFn: async () => {
            const response = await api.timesheets.getTimesheets(params) as any;
            return response.timesheets || response || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 15,   // 15 minutes
    });
};

export const useTimesheetMutation = () => {
    const queryClient = useQueryClient();

    const clockInMutation = useMutation({
        mutationFn: (data: any) => api.timesheets.clockIn(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: (data?: { comment?: string }) => api.timesheets.clockOut(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
        },
    });

    const pauseMutation = useMutation({
        mutationFn: (data?: { reason?: string }) => api.timesheets.pause(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
        },
    });

    const resumeMutation = useMutation({
        mutationFn: () => api.timesheets.resume(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
        },
    });

    const saveMutation = useMutation({
        mutationFn: (data: { week_start: string; entries: any[] }) => api.timesheets.save(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        },
    });

    return {
        clockIn: clockInMutation,
        clockOut: clockOutMutation,
        pause: pauseMutation,
        resume: resumeMutation,
        save: saveMutation,
    };
};

export const useActiveTimesheet = () => {
    return useQuery({
        queryKey: ['active-timesheet'],
        queryFn: async () => {
            const response = await api.timesheets.getCurrent() as any;
            return response?.entry || null;
        },
        staleTime: 1000 * 60 * 1, // 1 minute
    });
};

export const useTimesheetEntries = (params?: any) => {
    return useQuery({
        queryKey: ['timesheet-entries', params],
        queryFn: async () => {
            const response = await api.timesheets.getEntries(params) as any;
            return response.entries || response || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
