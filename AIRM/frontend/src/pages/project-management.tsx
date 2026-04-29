import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderKanban, Search, Github, Layout } from 'lucide-react';
import Projects from '@features/projects';
import Issues from '@features/issues';
import Git from '@features/git';
import { useProjects } from '@/hooks/useProjects';
import { useIssues } from '@/hooks/useIssues';

const tabs = [
  { id: 'all', label: 'Repositories', icon: FolderKanban },
  { id: 'projects', label: 'Projects', icon: Layout },
];

export default function ProjectManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Local tab state only
  const [activeTab, setActiveTab] = useState('all');
  const [selectedProjectName, setSelectedProjectName] = useState('all');

  // Fetch counts
  const { data: projects = [] } = useProjects();
  const projectsOnlyCount = projects.filter((p: any) => !p.is_unlinked).length;

  const [selectedProjectRepo, setSelectedProjectRepo] = useState<string | null>(null);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleProjectSelect = (projectName: string) => {
    setSelectedProjectName(projectName);
    const proj = projects.find((p: any) => p.name === projectName);
    if (proj) setSelectedProjectRepo(proj.repo_name || proj.name);
    setActiveTab('projects'); 
  };

  return (
    <div className="h-full flex flex-col px-6 py-4 bg-[#f6f8fa]/30">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center text-[#24292f]">
          <FolderKanban className="h-6 w-6 mr-2 text-blue-600" /> Project Dashboard
        </h1>
      </div>
      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-[#d0d7de] mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          let count = tab.id === 'all' ? projects.length : projectsOnlyCount;

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
        {activeTab === 'all' && <Projects onProjectSelect={handleProjectSelect} />}
        {activeTab === 'projects' && <Projects onProjectSelect={handleProjectSelect} onlyProjects={true} />}
      </div>
    </div>
  );
}
