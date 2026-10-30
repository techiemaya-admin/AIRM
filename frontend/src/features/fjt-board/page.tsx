import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActiveBoardView } from './components/ActiveBoardView';
import { BacklogView } from './components/BacklogView';
import { TimelineView } from './components/TimelineView';
import { ReportsView } from './components/ReportsView';
import { LayoutDashboard, ListOrdered, Calendar, BarChart3 } from 'lucide-react';

export type FjtTab = 'board' | 'backlog' | 'timeline' | 'reports';

class FjtErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Task Board Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 m-6 bg-white border border-red-200 rounded-lg shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-2">Error Loading Task Board</h2>
          <p className="text-xs text-red-600 mb-4 max-w-md font-mono bg-red-50 p-3 rounded border border-red-100">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-[#0B1957] text-white text-xs font-semibold rounded-md hover:bg-[#071038] transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function FjtBoardPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL pathname
  const getActiveTabFromUrl = (): FjtTab => {
    if (location.pathname.includes('/backlog')) return 'backlog';
    if (location.pathname.includes('/timeline')) return 'timeline';
    if (location.pathname.includes('/reports')) return 'reports';
    return 'board';
  };

  const [activeTab, setActiveTab] = useState<FjtTab>(getActiveTabFromUrl());

  useEffect(() => {
    setActiveTab(getActiveTabFromUrl());
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/task-board' || location.pathname === '/task-board/') {
      navigate('/task-board/board', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tab: FjtTab) => {
    setActiveTab(tab);
    navigate(`/task-board/${tab}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-white">
      {/* Sub-Header Navigation Tabs */}
      <div className="border-b border-gray-200 px-6 bg-white flex items-center gap-1 z-10 flex-shrink-0">
        <button
          onClick={() => handleTabChange('board')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'board'
              ? 'border-[#0B1957] text-[#0B1957]'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Board
        </button>

        <button
          onClick={() => handleTabChange('backlog')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'backlog'
              ? 'border-[#0B1957] text-[#0B1957]'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <ListOrdered className="h-4 w-4" />
          Backlog
        </button>

        <button
          onClick={() => handleTabChange('timeline')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'timeline'
              ? 'border-[#0B1957] text-[#0B1957]'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Timeline
        </button>

        <button
          onClick={() => handleTabChange('reports')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-[#0B1957] text-[#0B1957]'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Reports
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <FjtErrorBoundary>
          {activeTab === 'board' && <ActiveBoardView />}
          {activeTab === 'backlog' && <BacklogView />}
          {activeTab === 'timeline' && <TimelineView />}
          {activeTab === 'reports' && <ReportsView />}
        </FjtErrorBoundary>
      </div>
    </div>
  );
}
