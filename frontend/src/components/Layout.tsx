import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Notifications } from './Notifications';
import { Button } from './ui/button';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Close drawer on route change / resize to desktop
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between gap-3 px-3 sm:px-6 flex-shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2 flex-shrink-0"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight truncate">
              {getHeaderTitle(location.pathname)}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Notifications />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 relative min-w-0">
          <div className="min-w-0 w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
