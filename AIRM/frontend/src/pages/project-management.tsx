import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderKanban, Search } from 'lucide-react';
import Projects from '@features/projects';
import Issues from '@features/issues';
import { useProjects } from '@/hooks/useProjects';
import { useIssues } from '@/hooks/useIssues';

const tabs = [
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'issues', label: 'Issues', icon: Search },
];

export default function ProjectManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Local tab state only
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectName, setSelectedProjectName] = useState('all');

  // Fetch counts
  const { data: projects = [] } = useProjects();
  const { data: issues = [] } = useIssues({ project: selectedProjectName });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleProjectSelect = (projectName: string) => {
    setSelectedProjectName(projectName);
    setActiveTab('issues');
  };

  return (
    <div className="h-full flex flex-col px-6 py-4 bg-[#f6f8fa]/30">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center text-[#24292f]">
          <FolderKanban className="h-6 w-6 mr-2 text-blue-600" /> Project Management
        </h1>
      </div>
      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-[#d0d7de] mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tab.id === 'projects' ? (projects as any[]).length : (issues as any[]).length;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${activeTab === tab.id
                ? 'border-[#fd8c73] text-[#24292f]'
                : 'border-transparent text-[#656d76] hover:text-[#24292f] hover:border-[#d0d7de]'
                }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label} ({count})</span>
            </button>
          );
        })}
      </div>
      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-white rounded-xl border border-[#d0d7de] shadow-sm">
        {activeTab === 'projects' && <Projects onProjectSelect={handleProjectSelect} />}
        {activeTab === 'issues' && <Issues initialProject={selectedProjectName} />}
      </div>
    </div>
  );
}
