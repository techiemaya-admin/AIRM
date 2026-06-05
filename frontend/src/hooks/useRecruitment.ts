import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as recruitmentService from '@sdk/recruitmentService';
import type { Candidate, CandidateInfo, InterviewRound, BackgroundVerification } from '../../features/recruitment/types';

export const useCandidates = () => {
    return useQuery({
        queryKey: ['candidates'],
        queryFn: recruitmentService.getAllCandidates,
    });
};

export const useCandidate = (id: string | undefined) => {
    return useQuery({
        queryKey: ['candidate', id],
        queryFn: () => recruitmentService.getCandidate(id!),
        enabled: !!id,
    });
};

export const useRecruitmentMutation = () => {
    const queryClient = useQueryClient();

    const createCandidate = useMutation({
        mutationFn: (data: CandidateInfo) => recruitmentService.createCandidate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
        },
    });

    const updateCandidate = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Candidate> }) =>
            recruitmentService.updateCandidate(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
        },
    });

    const addInterviewRound = useMutation({
        mutationFn: ({ candidateId, round }: { candidateId: string; round: InterviewRound }) =>
            recruitmentService.addInterviewRound(candidateId, round),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
        },
    });

    const updateInterviewRound = useMutation({
        mutationFn: ({ candidateId, roundId, data }: { candidateId: string; roundId: string; data: Partial<InterviewRound> }) =>
            recruitmentService.updateInterviewRound(candidateId, roundId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
        },
    });

    const deleteInterviewRound = useMutation({
        mutationFn: ({ candidateId, roundId }: { candidateId: string; roundId: string }) =>
            recruitmentService.deleteInterviewRound(candidateId, roundId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
        },
    });

    const completeInterviewStage = useMutation({
        mutationFn: ({ candidateId, passed, notes }: { candidateId: string; passed: boolean; notes?: string }) =>
            recruitmentService.completeInterviewStage(candidateId, passed, notes),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
        },
    });

    const addVerification = useMutation({
        mutationFn: ({ candidateId, verification }: { candidateId: string; verification: BackgroundVerification }) =>
            recruitmentService.addVerification(candidateId, verification),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
        },
    });

    const updateVerification = useMutation({
        mutationFn: ({ candidateId, verificationId, data }: { candidateId: string; verificationId: string; data: Partial<BackgroundVerification> }) =>
            recruitmentService.updateVerification(candidateId, verificationId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
        },
    });

    const completeVerificationStage = useMutation({
        mutationFn: ({ candidateId, passed, notes }: { candidateId: string; passed: boolean; notes?: string }) =>
            recruitmentService.completeVerificationStage(candidateId, passed, notes),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
        },
    });

    const completeOnboarding = useMutation({
        mutationFn: ({ candidateId, joiningDate, employeeData }: { candidateId: string; joiningDate: string; employeeData: any }) =>
            recruitmentService.completeOnboarding(candidateId, joiningDate, employeeData),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const rejectCandidate = useMutation({
        mutationFn: ({ candidateId, reason }: { candidateId: string; reason: string }) =>
            recruitmentService.rejectCandidate(candidateId, reason),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
        },
    });

    const deleteCandidate = useMutation({
        mutationFn: (id: string) => recruitmentService.deleteCandidate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
        },
    });

    const sendInterviewMail = useMutation({
        mutationFn: ({ candidateId, roundId }: { candidateId: string; roundId: string }) =>
            recruitmentService.sendInterviewRoundMail(candidateId, roundId),
    });

    const sendVerificationMail = useMutation({
        mutationFn: ({ candidateId, verificationId }: { candidateId: string; verificationId: string }) =>
            recruitmentService.sendVerificationMail(candidateId, verificationId),
    });

    return {
        createCandidate,
        updateCandidate,
        addInterviewRound,
        updateInterviewRound,
        deleteInterviewRound,
        completeInterviewStage,
        addVerification,
        updateVerification,
        completeVerificationStage,
        completeOnboarding,
        rejectCandidate,
        deleteCandidate,
        sendInterviewMail,
        sendVerificationMail,
    };
};
