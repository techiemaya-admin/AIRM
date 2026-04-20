import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Notifications } from './Notifications';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear auth tokens and user data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');

    // Redirect to auth page
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating notifications bell */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
          <Notifications />
        </div>
        {/* Page content scrolls here */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}