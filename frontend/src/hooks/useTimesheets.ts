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
            queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: (data?: { comment?: string }) => api.timesheets.clockOut(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
            queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
        },
    });

    const pauseMutation = useMutation({
        mutationFn: (data?: { reason?: string }) => api.timesheets.pause(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
            queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
        },
    });

    const resumeMutation = useMutation({
        mutationFn: () => api.timesheets.resume(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-timesheet'] });
            queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
        },
    });

    const saveMutation = useMutation({
        mutationFn: (data: { week_start: string; entries: any[] }) => api.timesheets.save(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
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
            try {
                const response = await api.timesheets.getCurrent() as any;
                return response?.entry || null;
            } catch {
                return null;
            }
        },
        staleTime: 1000 * 60 * 1, // 1 minute
    });
};

export const useAllActiveTimesheets = () => {
    return useQuery({
        queryKey: ['all-active-timesheets'],
        queryFn: async () => {
            try {
                const response = await api.timesheets.getActive() as any;
                if (Array.isArray(response?.entries)) return response.entries;
                if (Array.isArray(response)) return response;
                return [];
            } catch {
                return [];
            }
        },
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 30, // 30 seconds live refresh
        retry: false,
    });
};

export const useTimesheetEntries = (params?: any) => {
    return useQuery({
        queryKey: ['timesheet-entries', params],
        queryFn: async () => {
            try {
                const response = await api.timesheets.getEntries(params) as any;
                if (Array.isArray(response?.entries)) return response.entries;
                if (Array.isArray(response)) return response;
                return [];
            } catch {
                return [];
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
    });
};
