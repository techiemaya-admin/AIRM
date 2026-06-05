import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@sdk/api';

export interface IssueFilters {
    status?: string;
    assignee?: string;
    project?: string;
    search?: string;
}

export const useIssues = (filters: IssueFilters = {}) => {
    return useQuery({
        queryKey: ['issues', filters],
        queryFn: async () => {
            const params: any = {};
            if (filters.status && filters.status !== 'all') params.status = filters.status;
            if (filters.assignee && filters.assignee !== 'all') params.assignee = filters.assignee;
            if (filters.project && filters.project !== 'all') params.project = filters.project;
            if (filters.search) params.search = filters.search;

            const response = await api.issues.getAll(params) as any;
            const issuesData = response.issues || response || [];

            return issuesData.map((issue: any) => ({
                ...issue,
                assignees: issue.assignees || [],
                labels: issue.labels || []
            }));
        },
        staleTime: 1000 * 60 * 2, // 2 minutes stale time
        gcTime: 1000 * 60 * 10,   // 10 minutes cache time
        retry: 1,
    });
};

export const useIssueDetails = (id: string | undefined) => {
    return useQuery({
        queryKey: ['issue', id],
        queryFn: async () => {
            if (!id) throw new Error('Issue ID is required');
            const response = await api.issues.getById(id) as any;
            const issueData = response.issue || response;

            return {
                ...issueData,
                comments: (issueData.comments || []).map((c: any) => ({
                    ...c,
                    user_email: c.email || c.user_email || 'Unknown'
                })),
                activities: (issueData.activity || issueData.activities || []).map((a: any) => ({
                    ...a,
                    user_email: a.email || a.user_email || 'Unknown'
                })),
                labels: issueData.labels || [],
                assignees: (issueData.assignees || []).map((a: any) => ({
                    user_id: a.user_id,
                    email: a.email || 'Unknown'
                }))
            };
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 1, // 1 minute
        gcTime: 1000 * 60 * 5,    // 5 minutes
        retry: 1,
    });
};

export const useIssueMutation = () => {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data: any) => api.issues.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.issues.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.issues.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });

    const addCommentMutation = useMutation({
        mutationFn: ({ id, comment }: { id: string; comment: string }) =>
            api.issues.addComment(id, comment),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    const logTimeMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.issues.logTime(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    const updateActivityMutation = useMutation({
        mutationFn: ({ id, activityId, data }: { id: string; activityId: string; data: any }) =>
            api.issues.updateActivity(id, activityId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    const addLabelMutation = useMutation({
        mutationFn: ({ id, labelId }: { id: string; labelId: string }) =>
            api.issues.addLabel(id, labelId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    const removeLabelMutation = useMutation({
        mutationFn: ({ id, labelId }: { id: string; labelId: string }) =>
            api.issues.removeLabel(id, labelId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    const assignUserMutation = useMutation({
        mutationFn: ({ id, userId }: { id: string; userId: string }) =>
            api.issues.assignUser(id, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    const assignUsersMutation = useMutation({
        mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) =>
            api.issues.assignUsers(id, userIds),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    const unassignUserMutation = useMutation({
        mutationFn: ({ id, userId }: { id: string; userId: string }) =>
            api.issues.unassignUser(id, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.id] });
        },
    });

    return {
        create: createMutation,
        update: updateMutation,
        delete: deleteMutation,
        addComment: addCommentMutation,
        logTime: logTimeMutation,
        updateActivity: updateActivityMutation,
        addLabel: addLabelMutation,
        removeLabel: removeLabelMutation,
        assignUser: assignUserMutation,
        assignUsers: assignUsersMutation,
        unassignUser: unassignUserMutation,
    };
};
