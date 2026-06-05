import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  User, Briefcase, GraduationCap, Users, Heart,
  Plus, Trash2, Save, ArrowLeft, CheckCircle, ShieldCheck, FileText
} from "lucide-react";
import * as joiningFormService from "@sdk/joiningFormService";
import { FormSkeleton, TableSkeleton } from "@/components/PageSkeletons";
import type {
  EmployeeInfo,
  FamilyMember,
  AcademicInfo,
  PreviousEmployment,
  VerificationInfo,
  EmployerVerification
} from "../joining-form/types";
import { uploadDocument, getEmployeeDocuments, deleteDocument } from "@sdk/documentService";
import type { EmployeeDocument } from "../profiles/types";

const emptyEmployeeInfo: EmployeeInfo = {
  full_name: "",
  email: "",
  employee_id: "",
  date_of_birth: "",
  gender: "",
  join_date: "",
  designation: "",
  department: "",
  phone: "",
  personal_email: "",
  marital_status: "",
  uan_number: "",
  pf_number: "",
  current_address: "",
  permanent_address: "",
  languages_known: [],
  bank_name: "",
  bank_ifsc: "",
  bank_branch: "",
  bank_account_number: "",
  blood_group: "",
  height: "",
  weight: "",
  medical_history: ""
};

const emptyFamilyMember: FamilyMember = {
  member_type: "",
  member_name: "",
  contact: "",
  location: "",
  relation: ""
};

const emptyAcademicInfo: AcademicInfo = {
  qualification: "",
  specialization: "",
  institution_name: "",
  board_university: "",
  passout_year: new Date().getFullYear(),
  grade_percentage: ""
};

const emptyPreviousEmployment: PreviousEmployment = {
  employer_name: "",
  designation: "",
  duration_from: "",
  duration_to: "",
  salary: "",
  reason_for_leaving: ""
};

const emptyVerificationEmployer: EmployerVerification = {
  employer_name: "",
  designation: "",
  location: "",
  period_of_working: "",
  reason_for_leaving: "",
  supervisor_contact: "",
  hr_mail: "",
  hr_contact: ""
};

const emptyVerificationInfo: VerificationInfo = {
  name: "",
  father_name: "",
  designation: "",
  department: "",
  date_of_birth: "",
  pan_number: "",
  aadhar_number: "",
  gender: "",
  present_address: "",
  present_stay_period: "",
  present_contact: "",
  permanent_address: "",
  permanent_stay_period: "",
  permanent_contact: "",
  employers: [
    { ...emptyVerificationEmployer },
    { ...emptyVerificationEmployer },
    { ...emptyVerificationEmployer },
    { ...emptyVerificationEmployer }
  ]
};

// The main reusable joining form component
import { useNavigate } from "react-router-dom";
import { BasicInfoSection } from "./components/BasicInfoSection";
import { FamilySection } from "./components/FamilySection";
import { VerificationSection } from "./components/VerificationSection";
import { DocumentUploadSection } from "./components/DocumentUploadSection";
import { EducationSection } from "./components/EducationSection";
import { ExperienceSection } from "./components/ExperienceSection";
import { HealthSection } from "./components/HealthSection";

export default function JoiningForm({
  profileId,
  onComplete,
  onCancel,
  isModal
}: {
  profileId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("employee");

  // Form state
  const [profileIdState, setProfileId] = useState<string | undefined>(profileId);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>(emptyEmployeeInfo);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [academicInfo, setAcademicInfo] = useState<AcademicInfo[]>([]);
  const [previousEmployment, setPreviousEmployment] = useState<PreviousEmployment[]>([]);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo>(emptyVerificationInfo);
  const [uploadedDocuments, setUploadedDocuments] = useState<EmployeeDocument[]>([]);

  const handleUpdateEmployeeInfo = (field: keyof EmployeeInfo, value: any) => {
    setEmployeeInfo(prev => ({ ...prev, [field]: value }));
  };

  // KYC upload handler
  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string, type: string) => {
    if (!profileIdState) {
      toast({
        title: "Error",
        description: "Please save the basic information first before uploading documents.",
        variant: "destructive"
      });
      return;
    }

    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const doc = await uploadDocument(profileIdState, category, type, file);
        toast({
          title: "Success",
          description: `${type} uploaded successfully`,
        });

        // Refresh documents list
        const docs = await getEmployeeDocuments(profileIdState);
        setUploadedDocuments(docs);
      } catch (error) {
        console.error("Upload failed", error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload document. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // KYC document delete handler
  const handleDocumentDelete = async (doc: EmployeeDocument) => {
    if (!profileIdState) return;
    try {
      await deleteDocument(doc.id);
      toast({ title: "Deleted", description: `${doc.document_type} removed successfully` });
      // Refresh documents list
      const docs = await getEmployeeDocuments(profileIdState);
      setUploadedDocuments(docs);
    } catch (error) {
      console.error("Delete failed", error);
      toast({ title: "Delete Failed", description: "Failed to delete document. Please try again.", variant: "destructive" });
    }
  };

  // Load existing form data if editing
  useEffect(() => {
    if (profileIdState) {
      loadFormData(profileIdState);
    }
  }, [profileIdState]);

  const loadFormData = async (id: string) => {
    setLoading(true);
    try {
      const form = await joiningFormService.getJoiningFormById(id);
      if (form) {
        setEmployeeInfo(form.employee_info || emptyEmployeeInfo);
        setFamilyMembers(form.family_members || []);
        setAcademicInfo(form.academic_info || []);
        setPreviousEmployment(form.previous_employment || []);
        setVerificationInfo(form.verification_info || emptyVerificationInfo);

        // Load documents
        try {
          const docs = await getEmployeeDocuments(id);
          setUploadedDocuments(docs);
        } catch (docError) {
          console.error("Failed to load documents:", docError);
        }
      }
    } catch (error) {
      console.error("Failed to load form data:", error);
      toast({ title: "Error", description: "Failed to load form data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let id = profileIdState;
      if (!id) {
        // Create new joining form
        const res = await joiningFormService.createJoiningForm({
          employee_info: employeeInfo,
          family_members: familyMembers,
          academic_info: academicInfo,
          previous_employment: previousEmployment,
          verification_info: verificationInfo,
          onboarding_status: "in_progress"
        });
        id = res.id;
        setProfileId(id);
      } else {
        // Update existing
        await joiningFormService.saveJoiningForm(id, {
          employee_info: employeeInfo,
          family_members: familyMembers,
          academic_info: academicInfo,
          previous_employment: previousEmployment,
          verification_info: verificationInfo,
          onboarding_status: "in_progress"
        });
      }
      toast({ title: "Success", description: "Form saved successfully" });
    } catch (error) {
      console.error("Failed to save form:", error);
      toast({ title: "Error", description: "Failed to save form", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      let id = profileIdState;
      if (!id) {
        // Create new joining form with completed status
        const res = await joiningFormService.createJoiningForm({
          employee_info: employeeInfo,
          family_members: familyMembers,
          academic_info: academicInfo,
          previous_employment: previousEmployment,
          verification_info: verificationInfo,
          onboarding_status: "completed"
        });
        id = res.id;
        setProfileId(id);
      } else {
        // Update and complete
        await joiningFormService.saveJoiningForm(id, {
          employee_info: employeeInfo,
          family_members: familyMembers,
          academic_info: academicInfo,
          previous_employment: previousEmployment,
          verification_info: verificationInfo,
          onboarding_status: "completed"
        });
        await joiningFormService.completeOnboarding(id);
      }
      toast({ title: "Success", description: "Onboarding completed successfully" });
      if (onComplete) onComplete();
      else if (!isModal) navigate("/joining-form");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast({ title: "Error", description: "Failed to complete onboarding", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Family member handlers
  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { ...emptyFamilyMember }]);
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  // Academic info handlers
  const addAcademicInfo = () => {
    setAcademicInfo([...academicInfo, { ...emptyAcademicInfo }]);
  };

  const updateAcademicInfo = (index: number, field: keyof AcademicInfo, value: string | number) => {
    const updated = [...academicInfo];
    updated[index] = { ...updated[index], [field]: value };
    setAcademicInfo(updated);
  };

  const removeAcademicInfo = (index: number) => {
    setAcademicInfo(academicInfo.filter((_, i) => i !== index));
  };

  // Previous employment handlers
  const addPreviousEmployment = () => {
    setPreviousEmployment([...previousEmployment, { ...emptyPreviousEmployment }]);
  };

  const updatePreviousEmployment = (index: number, field: keyof PreviousEmployment, value: string) => {
    const updated = [...previousEmployment];
    updated[index] = { ...updated[index], [field]: value };
    setPreviousEmployment(updated);
  };

  const removePreviousEmployment = (index: number) => {
    setPreviousEmployment(previousEmployment.filter((_, i) => i !== index));
  };

  // Verification handlers
  const updateVerificationField = (field: keyof VerificationInfo, value: string) => {
    setVerificationInfo({ ...verificationInfo, [field]: value });
  };

  const updateVerificationEmployer = (
    index: number,
    field: keyof EmployerVerification,
    value: string
  ) => {
    const employers = [...verificationInfo.employers];
    employers[index] = { ...employers[index], [field]: value };
    setVerificationInfo({ ...verificationInfo, employers });
  };

  // ...existing code...

  if (loading) {
    return (
      <div className="h-full bg-white flex flex-col">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-10 w-40 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-8 w-full">
          <div className="flex gap-2 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <FormSkeleton sections={3} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Premium Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isModal && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/joining-form")} className="hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Onboarding Information</h1>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Employee: {employeeInfo.full_name || 'New Profile'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSave} disabled={saving} className="border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-6">
              <Save className="h-4 w-4 mr-2 text-gray-400" />
              Save Progress
            </Button>
            <Button onClick={handleComplete} disabled={saving} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20 transition-all border-none">
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalize Onboarding
            </Button>
            {isModal && onCancel && (
              <Button variant="ghost" onClick={onCancel} className="text-gray-400">Cancel</Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
            {/* Styled TabsList */}
            <div className="sticky top-0 bg-white pt-2 pb-6 z-10">
              <TabsList className="flex items-center justify-start h-auto p-1 bg-gray-50/50 border border-gray-100 rounded-2xl w-full max-w-fit gap-1 shadow-inner">
                {[
                  { value: "employee", label: "Basic Info", icon: User },
                  { value: "family", label: "Family", icon: Users },
                  { value: "academic", label: "Education", icon: GraduationCap },
                  { value: "employment", label: "Experience", icon: Briefcase },
                  { value: "health", label: "Health", icon: Heart },
                  { value: "verification", label: "Verification", icon: ShieldCheck },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-gray-500 font-bold transition-all border-none focus-visible:ring-0"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tabs Content Sections */}
            <div className="animate-in fade-in duration-500">


              {/* Employee Information Tab */}
              <TabsContent value="employee" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BasicInfoSection
                      employeeInfo={employeeInfo}
                      updateEmployeeInfo={handleUpdateEmployeeInfo}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Family Tab */}
              <TabsContent value="family" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Family Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FamilySection
                      familyMembers={familyMembers}
                      addFamilyMember={addFamilyMember}
                      updateFamilyMember={updateFamilyMember}
                      removeFamilyMember={removeFamilyMember}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Academic Tab */}
              <TabsContent value="academic" className="space-y-6">
                <Card className="border-none shadow-none bg-transparent">
                  <CardContent className="p-0">
                    <EducationSection
                      academicInfo={academicInfo}
                      addAcademicInfo={addAcademicInfo}
                      updateAcademicInfo={updateAcademicInfo}
                      removeAcademicInfo={removeAcademicInfo}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Experience Tab */}
              <TabsContent value="employment" className="space-y-6">
                <Card className="border-none shadow-none bg-transparent">
                  <CardContent className="p-0">
                    <ExperienceSection
                      previousEmployment={previousEmployment}
                      addPreviousEmployment={addPreviousEmployment}
                      updatePreviousEmployment={updatePreviousEmployment}
                      removePreviousEmployment={removePreviousEmployment}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Health Tab */}
              <TabsContent value="health" className="space-y-6">
                <Card className="border-none shadow-none bg-transparent">
                  <CardContent className="p-0">
                    <HealthSection
                      employeeInfo={employeeInfo}
                      updateEmployeeInfo={handleUpdateEmployeeInfo}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Verification Tab */}
              <TabsContent value="verification" className="space-y-6">
                <Card className="border-none shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-8">
                    <VerificationSection
                      verificationInfo={verificationInfo}
                      updateVerificationField={updateVerificationField}
                      updateVerificationEmployer={updateVerificationEmployer}
                    />

                    <div className="pt-8 border-t">
                      <DocumentUploadSection
                        handleKycUpload={handleKycUpload}
                        handleDocumentDelete={handleDocumentDelete}
                        uploadedDocuments={uploadedDocuments}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
