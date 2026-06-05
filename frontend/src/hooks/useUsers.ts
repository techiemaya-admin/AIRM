import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useUsers = (options: { includeExEmployees?: boolean } = {}) => {
    const { includeExEmployees = false } = options;
    return useQuery({
        queryKey: ['users', includeExEmployees],
        queryFn: async () => {
            const response = await api.users.getWithRoles() as any;
            const usersData = response.users || (Array.isArray(response) ? response : []);
            const filteredUsers = includeExEmployees 
                ? usersData 
                : usersData.filter((u: any) => u.role !== 'ex-employee');
                
            return filteredUsers.map((user: any) => ({
                id: user.user_id || user.id,
                user_id: user.user_id || user.id,
                email: user.email,
                role: user.role || 'employee',
                full_name: user.full_name || user.name || user.email,
                name: user.name || user.full_name || user.email,
                employee_id: user.employee_id || null,
                department: user.department || null,
                created_at: user.created_at,
            }));
        },
        staleTime: 1000 * 60 * 5, // 5 minutes stale time
        gcTime: 1000 * 60 * 15,   // 15 minutes cache time
        retry: 1,
    });
};

export const useUserMutation = () => {
    const queryClient = useQueryClient();

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) =>
            api.users.updateRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.users.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (userId: string) => api.users.delete(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    return {
        updateRole: updateRoleMutation,
        create: createMutation,
        delete: deleteMutation,
    };
};
