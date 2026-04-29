import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as exitService from '@sdk/exit-formalitiesService';

export const useExitAssets = (userId?: string) => {
    return useQuery({
        queryKey: ['exit-assets', userId],
        queryFn: () => exitService.getEmployeeAssets(userId),
        enabled: !!userId,
    });
};

export const useExitAssetRecovery = (exitRequestId: string | null) => {
    return useQuery({
        queryKey: ['exit-asset-recovery', exitRequestId],
        queryFn: () => exitService.getAssetRecovery(exitRequestId!),
        enabled: !!exitRequestId,
    });
};

export const useExitDeprovisioning = (exitRequestId: string | null) => {
    return useQuery({
        queryKey: ['exit-deprovisioning', exitRequestId],
        queryFn: () => exitService.getAccessDeprovisioning(exitRequestId!),
        enabled: !!exitRequestId,
    });
};

export const useExitCompliance = (exitRequestId: string | null) => {
    return useQuery({
        queryKey: ['exit-compliance', exitRequestId],
        queryFn: () => exitService.getComplianceChecklist(exitRequestId!),
        enabled: !!exitRequestId,
    });
};

export const useExitSettlementDetails = (exitRequestId: string | null) => {
    return useQuery({
        queryKey: ['exit-settlement-details', exitRequestId],
        queryFn: () => exitService.getSettlement(exitRequestId!),
        enabled: !!exitRequestId,
    });
};

export const useExitDues = (exitRequestId: string | null) => {
    return useQuery({
        queryKey: ['exit-dues', exitRequestId],
        queryFn: async () => {
            const [payable, recoverable] = await Promise.all([
                exitService.getPayableDues(exitRequestId!),
                exitService.getRecoverableDues(exitRequestId!)
            ]);
            return { payable: payable.dues, recoverable: recoverable.dues };
        },
        enabled: !!exitRequestId,
    });
};

export const useExitFeatureMutation = () => {
    const queryClient = useQueryClient();

    const updateAssetRecovery = useMutation({
        mutationFn: ({ exitRequestId, data }: { exitRequestId: string, data: any }) =>
            exitService.updateAssetRecovery(exitRequestId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['exit-asset-recovery', variables.exitRequestId] });
        },
    });

    const updateDeprovisioning = useMutation({
        mutationFn: ({ exitRequestId, data }: { exitRequestId: string, data: any }) =>
            exitService.updateAccessDeprovisioning(exitRequestId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['exit-deprovisioning', variables.exitRequestId] });
        },
    });

    const updateCompliance = useMutation({
        mutationFn: ({ exitRequestId, data }: { exitRequestId: string, data: any }) =>
            exitService.updateComplianceItem(exitRequestId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['exit-compliance', variables.exitRequestId] });
        },
    });

    const autoRevokeAccess = useMutation({
        mutationFn: (exitRequestId: string) =>
            exitService.autoRevokeAccess(exitRequestId),
        onSuccess: (_, exitRequestId) => {
            queryClient.invalidateQueries({ queryKey: ['exit-deprovisioning', exitRequestId] });
        },
    });

    return {
        updateAssetRecovery,
        updateDeprovisioning,
        updateCompliance,
        autoRevokeAccess,
    };
};
