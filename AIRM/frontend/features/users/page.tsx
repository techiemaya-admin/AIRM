import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUsers, useUserMutation } from "@/hooks/useUsers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@sdk/api";
import { useToast } from "@/hooks/use-toast";
import { Users as UsersIcon, Shield, User as UserIcon, RefreshCw, UserPlus, Trash2 } from "lucide-react";
import { TableSkeleton, CardSkeleton } from "@/components/PageSkeletons";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const Users = () => {
  const { toast } = useToast();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: usersData = [], isLoading: usersLoading, refetch: loadUsers } = useUsers();
  const userMutation = useUserMutation();

  const isAdmin = currentUser?.role === 'admin';
  const loading = userLoading || usersLoading;
  const users = usersData as UserProfile[];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("employee");
  const [addingUser, setAddingUser] = useState(false);

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

    try {
      const newRole = currentRole === "admin" ? "employee" : "admin";

      await userMutation.updateRole.mutateAsync({ userId, role: newRole });

      toast({
        title: "Role Updated",
        description: `Employee role changed to ${newRole}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setAddingUser(true);
    try {
      await userMutation.create.mutateAsync({
        email: newUserEmail,
        full_name: newUserName,
        role: newUserRole,
      });

      toast({
        title: "Employee Created",
        description: `Employee ${newUserEmail} has been created successfully`,
      });

      setShowAddDialog(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserRole("employee");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Cannot Delete",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${userEmail}?`)) {
      return;
    }

    try {
      await userMutation.delete.mutateAsync(userId);

      toast({
        title: "Employee Deleted",
        description: `Employee ${userEmail} has been deleted`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive",
      });
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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee account. They will receive a magic link to login.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={addingUser}>
                  {addingUser ? "Creating..." : "Create Employee"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                onClick={() => loadUsers()}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <TableSkeleton rows={5} cols={3} />
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
                          {user.role === "admin" ? "admin" : "employee"}
                        </span>
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={user.role === "admin" ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleUserRole(user.id, user.role)}
                        disabled={loading || user.id === currentUser?.id}
                      >
                        {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={loading}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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

