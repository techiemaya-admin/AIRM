/**
 * Integrated Joining Form Page
 * Combines:
 * 1. New Hiring - 3-stage candidate recruitment process
 * 2. Joining Forms - Existing employee onboarding forms
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, FileText, Users } from "lucide-react";
import RecruitmentPage from "../recruitment/page";
import JoiningFormList from "./JoiningFormList";
import Profiles from "../profiles/page";
import { useQuery } from "@tanstack/react-query";
import { getAllCandidates } from "@sdk/recruitmentService";
import { getAllJoiningForms } from "@sdk/joiningFormService";
import { useProfiles } from "../profiles/hooks/useprofiles";
import { Badge } from "@/components/ui/badge";

const IntegratedJoiningPage = () => {
  const [activeTab, setActiveTab] = useState("new-hiring");

  // Fetch data for counts
  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: getAllCandidates,
  });

  const { data: joiningForms = [] } = useQuery({
    queryKey: ["joining-forms"],
    queryFn: getAllJoiningForms,
  });

  const { data: profiles = [] } = useProfiles();

  const counts = {
    hiring: candidates.length,
    forms: profiles.length,
    profiles: profiles.length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs for New Hiring vs Joining Forms */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="px-3 sm:px-6 pt-4 border-b bg-white">
          <TabsList className="flex w-full max-w-4xl h-auto min-h-16 bg-transparent p-0 gap-2 sm:gap-6 border-none overflow-x-auto whitespace-nowrap custom-scrollbar justify-start">
            <TabsTrigger
              value="new-hiring"
              className="shrink-0 flex-none sm:flex-1 flex flex-col items-start justify-center px-3 sm:px-4 py-2 h-full gap-1 tracking-tight border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50/50 rounded-none transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-gray-700 whitespace-nowrap">NEW HIRING</span>
                <Badge variant="secondary" className="ml-1 sm:ml-auto bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-bold text-xs">
                  {counts.hiring}
                </Badge>
              </div>
              <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Candidates in pipeline</span>
            </TabsTrigger>

            <TabsTrigger
              value="joining-forms"
              className="shrink-0 flex-none sm:flex-1 flex flex-col items-start justify-center px-3 sm:px-4 py-2 h-full gap-1 tracking-tight border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50/50 rounded-none transition-all"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-gray-700 whitespace-nowrap">JOINING FORMS</span>
                <Badge variant="secondary" className="ml-1 sm:ml-auto bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-bold text-xs">
                  {counts.forms}
                </Badge>
              </div>
              <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Onboarding documents</span>
            </TabsTrigger>

            <TabsTrigger
              value="profiles"
              className="shrink-0 flex-none sm:flex-1 flex flex-col items-start justify-center px-3 sm:px-4 py-2 h-full gap-1 tracking-tight border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50/50 rounded-none transition-all"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-gray-700 whitespace-nowrap">PROFILES</span>
                <Badge variant="secondary" className="ml-1 sm:ml-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold text-xs">
                  {counts.profiles}
                </Badge>
              </div>
              <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Active employees</span>
            </TabsTrigger>
          </TabsList>
          <p className="text-sm text-gray-500 mt-2 pb-3">
            {activeTab === "new-hiring"
              ? "Manage 3-stage candidate hiring: Interview → Background Verification → Onboarding"
              : activeTab === "joining-forms"
                ? "Manage employee onboarding documentation and forms"
                : "View all employee profiles and manage data"
            }
          </p>
        </div>

        <TabsContent value="new-hiring" className="flex-1 m-0 overflow-auto">
          <RecruitmentPage />
        </TabsContent>

        <TabsContent value="joining-forms" className="flex-1 m-0 overflow-auto">
          <JoiningFormList />
        </TabsContent>

        <TabsContent value="profiles" className="flex-1 m-0 overflow-auto bg-white">
          <Profiles hideHeader noPadding />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegratedJoiningPage;
