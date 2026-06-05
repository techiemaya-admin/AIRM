import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { Layout } from "./components/Layout";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { TableSkeleton } from "@/components/PageSkeletons";

// Lazy loaded feature pages - Optimizes bundle size and initial load time
const Timesheet = lazy(() => import("@features/timesheet"));
const SharedTimesheet = lazy(() => import("@features/timesheet").then(module => ({ default: module.SharedTimesheet })));
const Projects = lazy(() => import("@features/projects"));
const Issues = lazy(() => import("@features/issues").then(module => ({ default: module.default })));
const IssueDetail = lazy(() => import("@features/issues").then(module => ({ default: module.IssueDetail })));
const Profiles = lazy(() => import("@features/profiles"));
const ResourceManagement = lazy(() => import("@features/resource-management"));
const Users = lazy(() => import("@features/users"));
const Monitoring = lazy(() => import("@features/monitoring"));
const TimeClock = lazy(() => import("@features/time-clock"));
const LeaveCalendar = lazy(() => import("@features/leave-calendar"));
const Git = lazy(() => import("@features/git"));
const HRDocumentsPage = lazy(() => import("@features/hr-documents"));
const TemplatesPage = lazy(() => import("@features/hr-documents/templates-page"));
const JoiningFormPage = lazy(() => import("@features/joining-form/page"));
const RecruitmentPage = lazy(() => import("@features/recruitment/page"));
const ProjectManagementPage = lazy(() => import("./pages/project-management"));
const UploadDocsPage = lazy(() => import("@features/recruitment/pages/UploadDocsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// A premium loading state that appears during lazy loading
const PageLoader = () => (
  <div className="p-6 space-y-6 animate-in fade-in duration-500">
    <div className="flex items-center justify-between mb-8">
      <div className="h-10 w-64 bg-gray-100 animate-pulse rounded-lg" />
      <div className="h-10 w-32 bg-gray-100 animate-pulse rounded-lg" />
    </div>
    <TableSkeleton rows={8} cols={5} />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/verify" element={<Auth />} />

            <Route
              path="/"
              element={
                <AuthGuard>
                  <Layout>
                    <Timesheet />
                  </Layout>
                </AuthGuard>
              }
            />

            <Route path="/upload-docs/:candidateId/:verificationId" element={<UploadDocsPage />} />

            <Route
              path="/projects"
              element={
                <AuthGuard>
                  <Layout>
                    <Projects />
                  </Layout>
                </AuthGuard>
              }
            />

            <Route
              path="/project-management"
              element={
                <AuthGuard>
                  <Layout>
                    <ProjectManagementPage />
                  </Layout>
                </AuthGuard>
              }
            />

            <Route
              path="/projects/:id"
              element={
                <AuthGuard>
                  <Layout>
                    <Issues />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/issues"
              element={
                <AuthGuard>
                  <Layout>
                    <Issues />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/issues/:id"
              element={
                <AuthGuard>
                  <Layout>
                    <IssueDetail />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/users"
              element={
                <AuthGuard>
                  <Layout>
                    <Users />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/resource-management"
              element={
                <AuthGuard>
                  <Layout>
                    <ResourceManagement />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/recruitment"
              element={
                <AuthGuard>
                  <Layout>
                    <ResourceManagement />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/recruitment/:id"
              element={
                <AuthGuard>
                  <Layout>
                    <RecruitmentPage />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/joining-form"
              element={
                <AuthGuard>
                  <Layout>
                    <ResourceManagement />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/joining-form/:id"
              element={
                <AuthGuard>
                  <Layout>
                    <JoiningFormPage />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/profiles"
              element={
                <AuthGuard>
                  <Layout>
                    <ResourceManagement />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/employee"
              element={
                <AuthGuard>
                  <Layout>
                    <Profiles onlyCurrentUser />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/exit-formalities"
              element={
                <AuthGuard>
                  <Layout>
                    <ResourceManagement />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/payslips"
              element={
                <AuthGuard>
                  <Layout>
                    <ResourceManagement />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/time-clock"
              element={
                <AuthGuard>
                  <Layout>
                    <TimeClock />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/monitoring"
              element={
                <AuthGuard>
                  <Layout>
                    <Monitoring />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/leave-calendar"
              element={
                <AuthGuard>
                  <Layout>
                    <LeaveCalendar />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/git"
              element={
                <AuthGuard>
                  <Layout>
                    <Git />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/hr-documents"
              element={
                <AuthGuard>
                  <Layout>
                    <ResourceManagement />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/hr-templates"
              element={
                <AuthGuard>
                  <Layout>
                    <TemplatesPage />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/profiles/:id"
              element={
                <AuthGuard>
                  <Layout>
                    <ResourceManagement />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route path="/timesheet/:id" element={<SharedTimesheet />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
