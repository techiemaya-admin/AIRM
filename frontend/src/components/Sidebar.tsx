import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Home,
  Users,
  Clock,
  Calendar,
  GitBranch,
  BarChart3,
  LogOut,
  Menu,
  FolderKanban,
  Briefcase,
  X,
} from 'lucide-react';
import { Button } from './ui/button';

interface SidebarProps {
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  onLogout,
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { icon: Home, label: 'Timesheet', path: '/', adminOnly: false },
    { icon: FolderKanban, label: 'Project Management', path: '/project-management', adminOnly: false },
    { icon: Briefcase, label: 'Resource Management', path: '/resource-management', adminOnly: true },
    { icon: Users, label: 'Employees', path: '/users', adminOnly: true },
    { icon: BarChart3, label: 'Monitoring', path: '/monitoring', adminOnly: true },
    { icon: Clock, label: 'Time Clock', path: '/time-clock', adminOnly: false },
    { icon: Calendar, label: 'Leave Calendar', path: '/leave-calendar', adminOnly: false },
    { icon: GitBranch, label: 'Git', path: '/git', adminOnly: false },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  const getUserInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const isItemActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/resource-management') {
      return (
        location.pathname.startsWith('/resource-management') ||
        location.pathname.startsWith('/profiles') ||
        location.pathname.startsWith('/joining-form') ||
        location.pathname.startsWith('/exit-formalities') ||
        location.pathname.startsWith('/hr-documents') ||
        location.pathname.startsWith('/payslips')
      );
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const renderNav = (showLabels: boolean, isMobile: boolean) => (
    <div className="bg-white border-r border-gray-200 h-full flex flex-col w-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2">
          {showLabels && (
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">TM</span>
              </div>
              <span className="font-semibold text-gray-900 truncate">TechieMaya</span>
            </div>
          )}
          {isMobile ? (
            <Button variant="ghost" size="sm" onClick={onMobileClose} className="p-2 ml-auto" aria-label="Close menu">
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className={`p-2 ${showLabels ? '' : 'mx-auto'}`}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                } ${showLabels ? '' : 'justify-center'}`}
                title={!showLabels ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {showLabels && <span className="text-sm font-medium text-left">{item.label}</span>}
              </button>
            );
          })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        {showLabels ? (
          <button
            onClick={() => handleNavigation('/employee')}
            className="w-full flex items-center space-x-3 mb-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{getUserInitial()}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || user?.email || 'Employee'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.role === 'admin' ? 'Admin' : 'Employee'}
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => handleNavigation('/employee')}
            className="w-full flex items-center justify-center py-2 mb-3"
            title="Profile"
          >
            <div className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{getUserInitial()}</span>
            </div>
          </button>
        )}

        <Button
          variant="ghost"
          onClick={onLogout}
          className={`w-full flex items-center gap-3 text-gray-700 hover:bg-red-50 hover:text-red-600 ${
            showLabels ? 'justify-start' : 'justify-center px-3'
          }`}
          title={!showLabels ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {showLabels && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block h-screen flex-shrink-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {renderNav(!collapsed, false)}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} aria-hidden />
          <aside className="relative z-10 h-full w-64 max-w-[85vw] shadow-xl">
            {renderNav(true, true)}
          </aside>
        </div>
      )}
    </>
  );
}
