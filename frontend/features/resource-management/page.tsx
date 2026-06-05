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
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Resource Management</h1>
        <p className="text-gray-600 mt-1">
          Manage employee profiles, joining forms, exit formalities, payslips, and HR documents
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
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

