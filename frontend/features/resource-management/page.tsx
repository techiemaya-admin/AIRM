/**
 * Resource Management Page
 * Integrated view for Profiles, Exit Formalities, and Payslips
 * LAD Architecture: Uses feature components
 */

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserCircle, DoorOpen, Receipt, FileText, UserPlus } from "lucide-react";
import Profiles from "../profiles/page";
import ExitFormalities from "../exit-formalities/page";
import Payslips from "../payslips/page";
import HRDocumentsPage from "../hr-documents/page";
import IntegratedJoiningPage from "../joining-form/IntegratedJoiningPage";

const ResourceManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active activeTab based on URL
  const getInitialTab = () => {
    const path = location.pathname;
    if (path === "/profiles" || path.startsWith("/profiles/")) return "profiles";
    if (path === "/recruitment" || path.startsWith("/recruitment/")) return "joining-form";
    if (path === "/joining-form" || path.startsWith("/joining-form/")) return "joining-form";
    if (path === "/exit-formalities" || path.startsWith("/exit-formalities/")) return "exit-formalities";
    if (path === "/payslips" || path.startsWith("/payslips/")) return "payslips";
    if (path === "/hr-documents" || path.startsWith("/hr-documents/")) return "hr-documents";
    return "profiles"; // Default to profiles
  };

  const activeTab = getInitialTab();

  const handleTabChange = (tabId: string) => {
    // Navigate to the corresponding route
    if (tabId === "profiles") {
      navigate("/profiles");
    } else if (tabId === "joining-form") {
      navigate("/joining-form");
    } else if (tabId === "exit-formalities") {
      navigate("/exit-formalities");
    } else if (tabId === "payslips") {
      navigate("/payslips");
    } else if (tabId === "hr-documents") {
      navigate("/hr-documents");
    }
  };

  const tabs = [
    { id: "profiles", label: "Profiles", icon: UserCircle },
    { id: "joining-form", label: "Joining Form", icon: UserPlus },
    { id: "exit-formalities", label: "Exit Formalities", icon: DoorOpen },
    { id: "payslips", label: "Payslips", icon: Receipt },
    { id: "hr-documents", label: "HR Documents", icon: FileText },
  ];

  return (
    <div className="h-full min-w-0 w-full flex flex-col p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Resource Management</h1>
        <p className="text-gray-600 mt-1">
          Manage employee profiles, joining forms, exit formalities, payslips, and HR documents
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex min-w-0 overflow-x-auto whitespace-nowrap border-b mb-6 custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`shrink-0 min-w-0 px-3 sm:px-4 lg:px-6 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 text-left ${activeTab === tab.id
                ? "border-[#0B1957] text-[#0B1957]"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-w-0 flex-1 overflow-auto">
        {activeTab === "profiles" && <Profiles />}
        {activeTab === "joining-form" && <IntegratedJoiningPage />}
        {activeTab === "exit-formalities" && <ExitFormalities />}
        {activeTab === "payslips" && <Payslips />}
        {activeTab === "hr-documents" && <HRDocumentsPage />}
      </div>
    </div>
  );
};

export default ResourceManagement;

