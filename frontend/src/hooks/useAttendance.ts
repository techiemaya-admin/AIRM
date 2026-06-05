import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useAttendance = (start_date: string, end_date: string) => {
    return useQuery({
        queryKey: ['attendance', start_date, end_date],
        queryFn: async () => {
            const response = await api.leaveCalendar.getAttendance(start_date, end_date) as any;
            return response.attendance_records || response.attendance || (Array.isArray(response) ? response : []);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useShifts = (start_date: string, end_date: string) => {
    return useQuery({
        queryKey: ['shifts', start_date, end_date],
        queryFn: async () => {
            const response = await api.leaveCalendar.getShifts(start_date, end_date) as any;
            return response.shift_roster || (Array.isArray(response) ? response : []);
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

export const useAttendanceMutation = () => {
    const queryClient = useQueryClient();

    const updateAttendanceMutation = useMutation({
        mutationFn: (data: any) => api.leaveCalendar.updateAttendance(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        },
    });

    const updateShiftMutation = useMutation({
        mutationFn: (data: any) => api.leaveCalendar.updateShift(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
    });

    return {
        updateAttendance: updateAttendanceMutation,
        updateShift: updateShiftMutation,
    };
};
