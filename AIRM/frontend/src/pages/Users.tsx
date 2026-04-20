import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
import { Users as UsersIcon, Shield, User as UserIcon, RefreshCw, Plus } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const Users = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initUsers = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.id) {
          setCurrentUser(userData);

          // Check admin status from localStorage first (faster)
          const isAdminFromStorage = userData.role === 'admin';

          // Also try to get from API as fallback
          try {
            const currentUserResp = await api.auth.getMe() as any;
            const isAdminFromAPI = currentUserResp?.user?.role === 'admin' ||
              currentUserResp?.role === 'admin' ||
              currentUserResp?.data?.role === 'admin';
            setIsAdmin(isAdminFromStorage || isAdminFromAPI);
          } catch (apiError) {
            // If API fails, use localStorage value
            console.warn('Could not fetch user from API, using localStorage:', apiError);
            setIsAdmin(isAdminFromStorage);
          }

          await loadUsers();
        }
      } catch (error) {
        console.error('Error initializing users:', error);
        // Fallback: check localStorage role
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setIsAdmin(userData.role === 'admin');
      }
    };
    initUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.users.getWithRoles() as any;
      const usersData = response.users || response || [];

      if (usersData.length > 0) {
        const userProfiles = usersData.map((user: any) => ({
          id: user.user_id || user.id,
          email: user.email,
          role: user.role || 'employee',
          created_at: user.created_at,
        }));

        setUsers(userProfiles);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load employees",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Cannot Change Own Role",
        description: "You cannot change your own role",
        variant: "destructive",
      });
      return;
    }

    // Check if trying to remove the last admin
    if (currentRole === "admin") {
      const adminCount = users.filter(u => u.role === "admin").length;
      if (adminCount <= 1) {
        toast({
          title: "Cannot Remove Last Admin",
          description: "You must assign another admin before removing this admin role",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const newRole = currentRole === "admin" ? "employee" : "admin";

      await api.users.updateRole(userId, newRole);

      toast({
        title: "Role Updated",
        description: `Employee role changed to ${newRole}`,
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Access Denied. Admin privileges required.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6 mr-14 md:mr-24">
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                All Employees
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUsers}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Loading employees...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No employees found</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? (
                          <Shield className="h-4 w-4 text-purple-500" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-gray-500" />
                        )}
                        <h3 className="font-semibold">{user.email}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${user.role === "admin"
                            ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                            }`}
                        >
                          {user.role}
                        </span>
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Joined: {user.created_at && !isNaN(new Date(user.created_at).getTime())
                          ? new Date(user.created_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <Button
                      variant={user.role === "admin" ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleUserRole(user.id, user.role)}
                      disabled={loading || user.id === currentUser?.id}
                    >
                      {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Admin:</strong> Can create tasks, assign tasks to employees, and manage employee
              roles.
            </p>
            <p>
              <strong>Employee:</strong> Can only clock in/out to tasks assigned to them by admins.
            </p>
            <p className="text-muted-foreground mt-4">
              💡 Tip: Go to the Issues page to create and assign issues to employees.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;

