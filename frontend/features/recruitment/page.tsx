/**
 * Recruitment Page
 * 2-Stage Employee Onboarding Process
 * Stage 1: Technical Round & Interview
 * Stage 2: Final Onboarding (Store in Database)
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ClipboardCheck,
  Shield,
  UserCheck,
  MoreHorizontal,
  Eye,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Plus,
  FileText,
  Building,
  GraduationCap,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import * as recruitmentService from "@sdk/recruitmentService";
import { TableSkeleton } from "@/components/PageSkeletons";
import type { Candidate, CandidateSummary, CandidateInfo, InterviewRound, BackgroundVerification } from "./types";

import { useCandidates, useCandidate, useRecruitmentMutation } from "@/hooks/useRecruitment";

const RecruitmentPage = () => {
  // State for mail sending
  const [mailSending, setMailSending] = useState<string | null>(null);
  // State for selected verifications (bulk actions)
  const [selectedVerifications, setSelectedVerifications] = useState<string[]>([]);

  // Handler for sending interview round mail
  const handleSendInterviewMail = async (candidateId: string, roundId: string) => {
    setMailSending(roundId);
    try {
      await mutations.sendInterviewMail.mutateAsync({ candidateId, roundId });
      toast({ title: "Success", description: "Interview round mail sent successfully!" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to send interview round mail", variant: "destructive" });
    } finally {
      setMailSending(null);
    }
  };

  // Handler for sending verification mail (document upload link)
  const handleSendVerificationMail = async (candidateId: string, verificationId: string) => {
    setMailSending(verificationId);
    try {
      await mutations.sendVerificationMail.mutateAsync({ candidateId, verificationId });
      toast({ title: "Success", description: "Verification mail sent successfully!" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to send verification mail", variant: "destructive" });
    } finally {
      setMailSending(null);
    }
  };
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // const [loading, setLoading] = useState(true);
  // const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  // const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates();
  const { data: selectedCandidate, isLoading: candidateLoading } = useCandidate(id);
  const mutations = useRecruitmentMutation();

  const loading = candidatesLoading || candidateLoading ||
    mutations.createCandidate.isPending ||
    mutations.updateCandidate.isPending ||
    mutations.addInterviewRound.isPending ||
    mutations.updateInterviewRound.isPending ||
    mutations.deleteInterviewRound.isPending ||
    mutations.completeInterviewStage.isPending ||
    mutations.addVerification.isPending ||
    mutations.updateVerification.isPending ||
    mutations.completeVerificationStage.isPending ||
    mutations.completeOnboarding.isPending ||
    mutations.rejectCandidate.isPending ||
    mutations.deleteCandidate.isPending;

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Form states
  const [candidateForm, setCandidateForm] = useState<CandidateInfo>({
    full_name: "",
    email: "",
    phone: "",
    position_applied: "",
    department: "",
    experience_years: 0,
    current_company: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period: "",
    location: "",
    comments: "",
  });

  const [interviewForm, setInterviewForm] = useState<InterviewRound>({
    round_name: "",
    interviewer_name: "",
    interview_date: "",
    status: "scheduled",
    result: "pending",
    feedback: "",
    score: 0,
  });

  const [verificationForm, setVerificationForm] = useState<BackgroundVerification>({
    verification_type: "identity",
    verification_name: "",
    status: "pending",
    notes: "",
  });

  const [joiningDate, setJoiningDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Edit states
  const [showEditCandidateDialog, setShowEditCandidateDialog] = useState(false);
  const [showEditRoundDialog, setShowEditRoundDialog] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);

  const handleEditCandidate = () => {
    if (!selectedCandidate) return;
    setCandidateForm({
      full_name: selectedCandidate.candidate_info.full_name,
      email: selectedCandidate.candidate_info.email,
      phone: selectedCandidate.candidate_info.phone,
      position_applied: selectedCandidate.candidate_info.position_applied,
      department: selectedCandidate.candidate_info.department,
      experience_years: selectedCandidate.candidate_info.experience_years,
      current_company: selectedCandidate.candidate_info.current_company || "",
      current_ctc: selectedCandidate.candidate_info.current_ctc || "",
      expected_ctc: selectedCandidate.candidate_info.expected_ctc || "",
      notice_period: selectedCandidate.candidate_info.notice_period || "",
      location: selectedCandidate.candidate_info.location || "",
      comments: selectedCandidate.candidate_info.comments || "",
    } as CandidateInfo);
    setShowEditCandidateDialog(true);
  };

  const handleUpdateCandidate = async () => {
    if (!selectedCandidate || !candidateForm.full_name || !candidateForm.email) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      await mutations.updateCandidate.mutateAsync({ id: selectedCandidate.id, data: { candidate_info: candidateForm } });
      toast({ title: "Success", description: "Candidate updated successfully" });
      setShowEditCandidateDialog(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update candidate", variant: "destructive" });
    }
  };

  const handleEditRound = (round: InterviewRound) => {
    setEditingRoundId(round.id || null);
    setInterviewForm({
      round_name: round.round_name,
      interviewer_name: round.interviewer_name,
      interview_date: round.interview_date || "",
      status: round.status,
      result: round.result,
      feedback: round.feedback || "",
      score: round.score || 0,
    });
    setShowEditRoundDialog(true);
  };

  const handleUpdateRound = async () => {
    if (!selectedCandidate || !editingRoundId || !interviewForm.round_name || !interviewForm.interviewer_name) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      await mutations.updateInterviewRound.mutateAsync({ candidateId: selectedCandidate.id, roundId: editingRoundId, data: interviewForm });
      toast({ title: "Success", description: "Interview round updated" });
      setShowEditRoundDialog(false);
      setEditingRoundId(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update interview round", variant: "destructive" });
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!selectedCandidate) return;
    if (!confirm("Are you sure you want to delete this interview round?")) return;

    try {
      await mutations.deleteInterviewRound.mutateAsync({ candidateId: selectedCandidate.id, roundId });
      toast({ title: "Success", description: "Interview round deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete interview round", variant: "destructive" });
    }
  };

  // useEffect(() => {
  //   if (id) {
  //     loadCandidate(id);
  //   } else {
  //     loadCandidates();
  //   }
  // }, [id]);

  // const loadCandidates = async () => {
  //   setLoading(true);
  //   try {
  //     const data = await recruitmentService.getAllCandidates();
  //     setCandidates(data);
  //   } catch (error) {
  //     console.error("Failed to load candidates:", error);
  //     toast({ title: "Error", description: "Failed to load candidates", variant: "destructive" });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const loadCandidate = async (candidateId: string) => {
  //   setLoading(true);
  //   try {
  //     const data = await recruitmentService.getCandidate(candidateId);
  //     setSelectedCandidate(data);
  //   } catch (error) {
  //     console.error("Failed to load candidate:", error);
  //     toast({ title: "Error", description: "Failed to load candidate details", variant: "destructive" });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleCreateCandidate = async () => {
    if (!candidateForm.full_name || !candidateForm.email || !candidateForm.position_applied) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      await mutations.createCandidate.mutateAsync(candidateForm);
      toast({ title: "Success", description: "Candidate added successfully" });
      setShowAddDialog(false);
      setCandidateForm({
        full_name: "",
        email: "",
        phone: "",
        position_applied: "",
        department: "",
        experience_years: 0,
        current_company: "",
        current_ctc: "",
        expected_ctc: "",
        notice_period: "",
        location: "",
        comments: "",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add candidate", variant: "destructive" });
    }
  };

  const handleAddInterview = async () => {
    if (!selectedCandidate || !interviewForm.round_name || !interviewForm.interviewer_name) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      await mutations.addInterviewRound.mutateAsync({ candidateId: selectedCandidate.id, round: interviewForm });
      toast({ title: "Success", description: "Interview round added" });
      setShowInterviewDialog(false);
      setInterviewForm({
        round_name: "",
        interviewer_name: "",
        interview_date: "",
        status: "scheduled",
        result: "pending",
        feedback: "",
        score: 0,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add interview round", variant: "destructive" });
    }
  };

  const handleUpdateInterviewResult = async (roundId: string, result: 'passed' | 'failed', feedback: string) => {
    if (!selectedCandidate) return;

    try {
      await mutations.updateInterviewRound.mutateAsync({
        candidateId: selectedCandidate.id,
        roundId,
        data: {
          result,
          status: 'completed',
          feedback,
        }
      });
      toast({ title: "Success", description: "Interview result updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update result", variant: "destructive" });
    }
  };

  const handleCompleteInterviewStage = async (passed: boolean) => {
    if (!selectedCandidate) return;

    try {
      await mutations.completeInterviewStage.mutateAsync({ candidateId: selectedCandidate.id, passed });
      toast({
        title: passed ? "Interview Stage Passed" : "Candidate Rejected",
        description: passed ? "Moving to onboarding stage" : "Candidate did not pass interview"
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete stage", variant: "destructive" });
    }
  };

  const handleAddVerification = async () => {
    if (!selectedCandidate || !verificationForm.verification_name) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      await mutations.addVerification.mutateAsync({ candidateId: selectedCandidate.id, verification: verificationForm });
      toast({ title: "Success", description: "Verification added" });
      setShowVerificationDialog(false);
      setVerificationForm({
        verification_type: "identity",
        verification_name: "",
        status: "pending",
        notes: "",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add verification", variant: "destructive" });
    }
  };

  const handleUpdateVerificationStatus = async (verificationId: string, status: 'verified' | 'failed', notes: string) => {
    if (!selectedCandidate) return;

    try {
      await mutations.updateVerification.mutateAsync({
        candidateId: selectedCandidate.id,
        verificationId,
        data: {
          status,
          notes,
          verified_at: new Date().toISOString(),
        }
      });
      toast({ title: "Success", description: "Verification updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update verification", variant: "destructive" });
    }
  };

  const handleCompleteVerificationStage = async (passed: boolean) => {
    if (!selectedCandidate) return;

    try {
      await mutations.completeVerificationStage.mutateAsync({ candidateId: selectedCandidate.id, passed });
      toast({
        title: passed ? "Verification Passed" : "Candidate Rejected",
        description: passed ? "Ready for onboarding" : "Verification failed"
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete stage", variant: "destructive" });
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!selectedCandidate || !joiningDate) {
      toast({ title: "Error", description: "Please select joining date", variant: "destructive" });
      return;
    }

    try {
      await mutations.completeOnboarding.mutateAsync({
        candidateId: selectedCandidate.id,
        joiningDate,
        employeeData: {
          full_name: selectedCandidate.candidate_info.full_name,
          email: selectedCandidate.candidate_info.email,
          phone: selectedCandidate.candidate_info.phone,
          department: selectedCandidate.candidate_info.department,
          designation: selectedCandidate.candidate_info.position_applied,
        }
      });
      toast({
        title: "🎉 Employee Hired!",
        description: `${selectedCandidate.candidate_info.full_name} has been added to the system`
      });
      setShowOnboardDialog(false);
      navigate("/recruitment");
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete onboarding", variant: "destructive" });
    }
  };

  const handleRejectCandidate = async () => {
    if (!selectedCandidate || !rejectionReason) {
      toast({ title: "Error", description: "Please provide rejection reason", variant: "destructive" });
      return;
    }

    try {
      await mutations.rejectCandidate.mutateAsync({ candidateId: selectedCandidate.id, reason: rejectionReason });
      toast({ title: "Candidate Rejected", description: "Candidate has been rejected" });
      setShowRejectDialog(false);
      setRejectionReason("");
      navigate("/recruitment");
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject candidate", variant: "destructive" });
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'interview':
        return <ClipboardCheck className="h-5 w-5" />;
      case 'verification':
        return <Shield className="h-5 w-5" />;
      case 'onboarding':
        return <UserCheck className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
      case 'hired':
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'interview':
        return <Badge className="bg-purple-100 text-purple-800">Stage 1: Interview</Badge>;
      case 'onboarding':
        return <Badge className="bg-green-100 text-green-800">Stage 2: Onboarding</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.position_applied?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === "all" || c.current_stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const stats = {
    total: candidates.length,
    interview: candidates.filter(c => c.current_stage === 'interview').length,
    verification: candidates.filter(c => c.current_stage === 'verification').length,
    onboarding: candidates.filter(c => c.current_stage === 'onboarding').length,
    hired: candidates.filter(c => c.final_status === 'hired').length,
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col p-6 bg-gray-50 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-10 w-64 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} cols={4} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Candidate Detail View
  if (selectedCandidate) {
    return (
      <div className="h-full flex flex-col p-6 bg-gray-50">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/recruitment")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{selectedCandidate.candidate_info.full_name}</h1>
            <p className="text-gray-500">{selectedCandidate.candidate_info.position_applied} - {selectedCandidate.candidate_info.department}</p>
          </div>
          {selectedCandidate.final_status === 'pending' && (
            <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject Candidate
            </Button>
          )}
        </div>

        {/* Progress Stepper */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {/* Stage 1: Interview */}
              <div className={`flex-1 text-center ${selectedCandidate.current_stage === 'interview' ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${selectedCandidate.interview_status === 'passed' ? 'bg-green-500 text-white' :
                  selectedCandidate.interview_status === 'failed' ? 'bg-red-500 text-white' :
                    selectedCandidate.current_stage === 'interview' ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-500'
                  }`}>
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <p className="mt-2 font-medium">Step 1</p>
                <p className="text-sm text-gray-500">Technical & Interview</p>
                {getStatusBadge(selectedCandidate.interview_status)}
              </div>



              <ChevronRight className="h-6 w-6 text-gray-400" />

              {/* Stage 3: Onboarding */}
              <div className={`flex-1 text-center ${selectedCandidate.current_stage === 'onboarding' ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${selectedCandidate.final_status === 'hired' ? 'bg-green-500 text-white' :
                  selectedCandidate.current_stage === 'onboarding' ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                  <UserCheck className="h-6 w-6" />
                </div>
                <p className="mt-2 font-medium">Step 2</p>
                <p className="text-sm text-gray-500">Final Onboarding</p>
                {selectedCandidate.final_status === 'hired' ?
                  <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Hired</Badge> :
                  getStatusBadge(selectedCandidate.onboarding_status)
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Candidate Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Candidate Information
                </span>
                <Button size="sm" variant="ghost" onClick={handleEditCandidate}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium">{selectedCandidate.candidate_info.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium">{selectedCandidate.candidate_info.phone}</p>
                </div>
                <div>
                  <p className="text-gray-500">Experience</p>
                  <p className="font-medium">{selectedCandidate.candidate_info.experience_years} years</p>
                </div>
                <div>
                  <p className="text-gray-500">Current Company</p>
                  <p className="font-medium">{selectedCandidate.candidate_info.current_company || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Current CTC</p>
                  <p className="font-medium">{selectedCandidate.candidate_info.current_ctc || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Expected CTC</p>
                  <p className="font-medium">{selectedCandidate.candidate_info.expected_ctc || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Notice Period</p>
                  <p className="font-medium">{selectedCandidate.candidate_info.notice_period || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium">{selectedCandidate.candidate_info.location || '-'}</p>
                </div>
                {selectedCandidate.candidate_info.comments && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Comments</p>
                    <p className="font-medium">{selectedCandidate.candidate_info.comments}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stage 1: Interview Rounds */}
          {(selectedCandidate.current_stage === 'interview' || selectedCandidate.interview_status === 'passed') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Interview Rounds
                  </span>
                  {selectedCandidate.current_stage === 'interview' && (
                    <Button size="sm" onClick={() => setShowInterviewDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Round
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCandidate.interview_rounds?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No interview rounds added yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedCandidate.interview_rounds?.map((round, index) => (
                      <div key={round.id || index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{round.round_name}</p>
                            <p className="text-sm text-gray-500">Interviewer: {round.interviewer_name}</p>
                            {round.interview_date && (
                              <p className="text-sm text-gray-500">Date: {new Date(round.interview_date).toLocaleDateString()}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Edit/Delete Actions */}
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditRound(round)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteRound(round.id!)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            {round.result === 'pending' && selectedCandidate.current_stage === 'interview' ? (
                              <>
                                <Button size="sm" variant="outline" className="text-green-600"
                                  onClick={() => handleUpdateInterviewResult(round.id!, 'passed', '')}>
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600"
                                  onClick={() => handleUpdateInterviewResult(round.id!, 'failed', '')}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              getStatusBadge(round.result)
                            )}
                            {/* Always show Send Mail Button for each round */}
                            <Button size="sm" variant="secondary" title="Send Interview Mail"
                              onClick={() => handleSendInterviewMail(selectedCandidate.id, round.id!)}
                              disabled={mailSending === round.id}
                            >
                              {mailSending === round.id ? 'Sending...' : '📧 Send Mail'}
                            </Button>
                          </div>
                        </div>
                        {round.feedback && !round.feedback.startsWith('// (Cleanup)') && (
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">{round.feedback}</p>
                        )}
                      </div>
                    ))}


// (Cleanup) Remove misplaced code fragments from JSX. Ensure all imports are at the top, and hooks/handlers are inside the component but outside JSX.
                  </div>
                )}

                {selectedCandidate.current_stage === 'interview' && selectedCandidate.interview_rounds?.length > 0 && (
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleCompleteInterviewStage(true)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Pass Interview Stage
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleCompleteInterviewStage(false)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Fail Interview Stage
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage 3: Final Onboarding */}
          {selectedCandidate.current_stage === 'onboarding' && selectedCandidate.final_status !== 'hired' && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Final Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <p className="text-green-800 font-medium">🎉 Candidate has passed all stages!</p>
                  <p className="text-green-600 text-sm">Interview completed successfully.</p>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" onClick={() => setShowOnboardDialog(true)}>
                  <UserCheck className="h-5 w-5 mr-2" />
                  Complete Onboarding & Hire Employee
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Hired Status */}
          {selectedCandidate.final_status === 'hired' && (
            <Card className="lg:col-span-2 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-green-800">Employee Hired!</h3>
                  <p className="text-green-600">{selectedCandidate.candidate_info.full_name} has been successfully onboarded.</p>
                  {selectedCandidate.joining_date && (
                    <p className="text-green-600 mt-2">Joining Date: {new Date(selectedCandidate.joining_date).toLocaleDateString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogs */}
        {/* Add Interview Round Dialog */}
        <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Interview Round</DialogTitle>
              <DialogDescription>Schedule a new interview round for this candidate</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Round Name *</Label>
                <Input
                  placeholder="e.g., Technical Round 1, HR Round"
                  value={interviewForm.round_name}
                  onChange={(e) => setInterviewForm({ ...interviewForm, round_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Interviewer Name *</Label>
                <Input
                  placeholder="Interviewer name"
                  value={interviewForm.interviewer_name}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Interview Date</Label>
                <Input
                  type="datetime-local"
                  value={interviewForm.interview_date}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInterviewDialog(false)}>Cancel</Button>
              <Button onClick={handleAddInterview}>Add Round</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Verification Dialog */}
        <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Background Verification</DialogTitle>
              <DialogDescription>Add a verification check for this candidate</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Verification Type *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={verificationForm.verification_type}
                  onChange={(e) => setVerificationForm({ ...verificationForm, verification_type: e.target.value as any })}
                >
                  <option value="identity">Identity Verification</option>
                  <option value="education">Education Verification</option>
                  <option value="employment">Employment Verification</option>
                  <option value="criminal">Criminal Background Check</option>
                  <option value="reference">Reference Check</option>
                </select>
              </div>
              <div>
                <Label>Verification Name *</Label>
                <Input
                  placeholder="e.g., Aadhaar Card, Degree Certificate"
                  value={verificationForm.verification_name}
                  onChange={(e) => setVerificationForm({ ...verificationForm, verification_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes"
                  value={verificationForm.notes}
                  onChange={(e) => setVerificationForm({ ...verificationForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVerificationDialog(false)}>Cancel</Button>
              <Button onClick={handleAddVerification}>Add Verification</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Onboarding Dialog */}
        <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Onboarding</DialogTitle>
              <DialogDescription>Finalize the hiring process and add employee to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-medium">{selectedCandidate?.candidate_info.full_name}</p>
                <p className="text-sm text-gray-600">{selectedCandidate?.candidate_info.position_applied}</p>
                <p className="text-sm text-gray-600">{selectedCandidate?.candidate_info.email}</p>
              </div>
              <div>
                <Label>Joining Date *</Label>
                <Input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOnboardDialog(false)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleCompleteOnboarding}>
                <UserCheck className="h-4 w-4 mr-2" />
                Hire Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Candidate Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Candidate</DialogTitle>
              <DialogDescription>Please provide a reason for rejecting this candidate</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  placeholder="Enter the reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRejectCandidate}>Reject Candidate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Candidate Dialog */}
        <Dialog open={showEditCandidateDialog} onOpenChange={setShowEditCandidateDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Candidate Information</DialogTitle>
              <DialogDescription>Update candidate details</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={candidateForm.full_name} onChange={(e) => setCandidateForm({ ...candidateForm, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input value={candidateForm.email} onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={candidateForm.phone} onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })} />
              </div>
              <div>
                <Label>Position Applied *</Label>
                <Input value={candidateForm.position_applied} onChange={(e) => setCandidateForm({ ...candidateForm, position_applied: e.target.value })} />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={candidateForm.department} onChange={(e) => setCandidateForm({ ...candidateForm, department: e.target.value })} />
              </div>
              <div>
                <Label>Experience (Years)</Label>
                <Input type="number" value={candidateForm.experience_years} onChange={(e) => setCandidateForm({ ...candidateForm, experience_years: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Current Company</Label>
                <Input value={candidateForm.current_company} onChange={(e) => setCandidateForm({ ...candidateForm, current_company: e.target.value })} />
              </div>
              <div>
                <Label>Current CTC</Label>
                <Input value={candidateForm.current_ctc} onChange={(e) => setCandidateForm({ ...candidateForm, current_ctc: e.target.value })} />
              </div>
              <div>
                <Label>Expected CTC</Label>
                <Input value={candidateForm.expected_ctc} onChange={(e) => setCandidateForm({ ...candidateForm, expected_ctc: e.target.value })} />
              </div>
              <div>
                <Label>Notice Period</Label>
                <Input value={candidateForm.notice_period} onChange={(e) => setCandidateForm({ ...candidateForm, notice_period: e.target.value })} />
              </div>
              <div>
                <Label>Location *</Label>
                <Input value={candidateForm.location} onChange={(e) => setCandidateForm({ ...candidateForm, location: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Comments</Label>
                <Textarea value={candidateForm.comments} onChange={(e) => setCandidateForm({ ...candidateForm, comments: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditCandidateDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateCandidate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Interview Round Dialog */}
        <Dialog open={showEditRoundDialog} onOpenChange={setShowEditRoundDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Interview Round</DialogTitle>
              <DialogDescription>Update interview details and schedule</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Round Name *</Label>
                <Input
                  placeholder="e.g., Technical Round 1, HR Round"
                  value={interviewForm.round_name}
                  onChange={(e) => setInterviewForm({ ...interviewForm, round_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Interviewer Name *</Label>
                <Input
                  placeholder="Interviewer name"
                  value={interviewForm.interviewer_name}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Interview Date</Label>
                <Input
                  type="datetime-local"
                  value={interviewForm.interview_date}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditRoundDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateRound}>Update Round</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Candidate List View
  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
          <p className="text-gray-500">Manage candidate hiring process - 3 Stage Onboarding</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Candidate
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Candidates</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-purple-600">{stats.interview}</p>
            <p className="text-sm text-gray-500">Interview Stage</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-600">{stats.verification}</p>
            <p className="text-sm text-gray-500">Verification Stage</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{stats.onboarding}</p>
            <p className="text-sm text-gray-500">Ready to Hire</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{stats.hired}</p>
            <p className="text-sm text-gray-500">Hired</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search candidates..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-md bg-white"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="all">All Stages</option>
          <option value="interview">Stage 1: Interview</option>
          <option value="verification">Stage 2: Verification</option>
          <option value="onboarding">Stage 3: Onboarding</option>
        </select>
      </div>

      {/* Candidates Table */}
      <Card className="flex-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No candidates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((candidate) => (
                  <TableRow key={candidate.id} className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/recruitment/${candidate.id}`)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{candidate.full_name}</p>
                        <p className="text-sm text-gray-500">{candidate.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{candidate.position_applied}</TableCell>
                    <TableCell>{candidate.department || '-'}</TableCell>
                    <TableCell>{getStageBadge(candidate.current_stage)}</TableCell>
                    <TableCell>
                      {candidate.final_status === 'hired' ? (
                        <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Hired</Badge>
                      ) : candidate.final_status === 'rejected' ? (
                        <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                      ) : (
                        getStatusBadge(candidate.interview_status)
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {candidate.created_at ? format(new Date(candidate.created_at), "dd MMM yyyy") : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {candidate.updated_at ? format(new Date(candidate.updated_at), "dd MMM yyyy HH:mm") : (candidate.created_at ? format(new Date(candidate.created_at), "dd MMM yyyy HH:mm") : '-')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/recruitment/${candidate.id}`); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Candidate Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>Enter candidate details to start the hiring process</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                placeholder="Candidate's full name"
                value={candidateForm.full_name}
                onChange={(e) => setCandidateForm({ ...candidateForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={candidateForm.email}
                onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="Phone number"
                value={candidateForm.phone}
                onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Position Applied *</Label>
              <Input
                placeholder="e.g., Software Engineer"
                value={candidateForm.position_applied}
                onChange={(e) => setCandidateForm({ ...candidateForm, position_applied: e.target.value })}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                placeholder="e.g., Engineering"
                value={candidateForm.department}
                onChange={(e) => setCandidateForm({ ...candidateForm, department: e.target.value })}
              />
            </div>
            <div>
              <Label>Experience (Years)</Label>
              <Input
                type="number"
                min="0"
                value={candidateForm.experience_years}
                onChange={(e) => setCandidateForm({ ...candidateForm, experience_years: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Current Company</Label>
              <Input
                placeholder="Current employer"
                value={candidateForm.current_company}
                onChange={(e) => setCandidateForm({ ...candidateForm, current_company: e.target.value })}
              />
            </div>
            <div>
              <Label>Current CTC</Label>
              <Input
                placeholder="e.g., 8 LPA"
                value={candidateForm.current_ctc}
                onChange={(e) => setCandidateForm({ ...candidateForm, current_ctc: e.target.value })}
              />
            </div>
            <div>
              <Label>Expected CTC</Label>
              <Input
                placeholder="e.g., 12 LPA"
                value={candidateForm.expected_ctc}
                onChange={(e) => setCandidateForm({ ...candidateForm, expected_ctc: e.target.value })}
              />
            </div>
            <div>
              <Label>Notice Period</Label>
              <Input
                placeholder="e.g., 30 days"
                value={candidateForm.notice_period}
                onChange={(e) => setCandidateForm({ ...candidateForm, notice_period: e.target.value })}
              />
            </div>
            <div>
              <Label>Location *</Label>
              <Input
                placeholder="e.g., Bangalore"
                value={candidateForm.location}
                onChange={(e) => setCandidateForm({ ...candidateForm, location: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Comments</Label>
              <Textarea
                placeholder="Additional comments"
                value={candidateForm.comments}
                onChange={(e) => setCandidateForm({ ...candidateForm, comments: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCandidate}>Add Candidate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruitmentPage;
