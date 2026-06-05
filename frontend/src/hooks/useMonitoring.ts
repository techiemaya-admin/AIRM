import { useQuery } from '@tanstack/react-query';
import { api } from '@sdk/api';

export const useMonitoring = (params?: { start_date?: string }) => {
    return useQuery({
        queryKey: ['monitoring', params],
        queryFn: async () => {
            // 🚀 All 3 calls in parallel — no more waterfall
            const [usersResponse, activeResponse, entriesResponse] = await Promise.all([
                api.users.getWithRoles().catch(() => ({ users: [] })),
                api.timesheets.getActive().catch(() => ({ entries: [] })),
                api.timesheets.getEntries(params).catch(() => ({ entries: [] }))
            ]) as any[];

            const usersData = usersResponse?.users || usersResponse || [];
            const userMap = new Map(usersData.map((u: any) => [u.user_id || u.id, u.email]));

            // Combine active entries with recent entries
            const activeEntries = activeResponse?.entries || [];
            const allEntries = entriesResponse?.entries || [];
            const combinedEntries = [...activeEntries, ...allEntries];

            // Remove duplicates by id
            const uniqueEntries = Array.from(
                new Map(combinedEntries.map((e: any) => [e.id, e])).values()
            );

            return uniqueEntries.map((entry: any) => ({
                ...entry,
                user_email: userMap.get(entry.user_id) || entry.user_email || "Unknown User",
                issue: entry.issue_id ? {
                    id: entry.issue_id,
                    title: entry.issue_title,
                    project_name: entry.issue_project
                } : (entry.issue || null),
            }));
        },
        staleTime: 1000 * 60 * 5,  // Cache 5 minutes
        refetchInterval: 1000 * 60, // Refetch every 60s (was 30s)
    });
};
