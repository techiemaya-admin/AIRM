import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NotificationPopup } from "./NotificationPopup";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token || (isError && !isLoading)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      navigate("/auth");
    }
  }, [user, isLoading, isError, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <NotificationPopup />
      {children}
    </>
  );
};
