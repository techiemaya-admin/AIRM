import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Notifications } from './Notifications';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Clear auth tokens and user data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');

    // Redirect to auth page
    navigate('/auth');
  };

  const getHeaderTitle = (pathname: string) => {
    if (pathname === '/') return 'Timesheet';
    if (pathname.startsWith('/project-management') || pathname.startsWith('/projects')) return 'Project Dashboard';
    if (pathname.startsWith('/resource-management')) return 'Resource Management';
    if (pathname.startsWith('/profiles')) return 'Employee Profiles';
    if (pathname.startsWith('/users')) return 'Employee Management';
    if (pathname.startsWith('/monitoring')) return 'Employee Monitoring';
    if (pathname.startsWith('/time-clock')) return 'Time Clock';
    if (pathname.startsWith('/leave-calendar')) return 'Leave & Attendance';
    if (pathname.startsWith('/git')) return 'Git Integration';
    if (pathname.startsWith('/hr-documents')) return 'HR Documents';
    if (pathname.startsWith('/payslips')) return 'Employee Salary Management';
    if (pathname.startsWith('/recruitment')) return 'Recruitment';
    if (pathname.startsWith('/joining-form')) return 'New Joining Forms';
    if (pathname.startsWith('/exit-formalities')) return 'Exit Formalities';
    if (pathname.startsWith('/employee')) return 'My Profile';
    return '';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-20">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{getHeaderTitle(location.pathname)}</h1>
          <div className="flex items-center gap-4">
            <Notifications />
          </div>
        </header>
        {/* Page content scrolls here */}
        <main className="flex-1 overflow-auto bg-gray-50 relative">
          {children}
        </main>
      </div>
    </div>
  );
}