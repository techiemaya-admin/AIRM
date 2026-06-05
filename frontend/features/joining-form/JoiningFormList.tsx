/**
 * Joining Form List Page
 * List all employees and their onboarding status
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, FileText, CheckCircle, Clock, AlertCircle,
  Eye, Edit, MoreHorizontal, CalendarDays, Loader2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfiles, useProfileMutation } from "../profiles/hooks/useprofiles";

const JoiningFormList = () => {
  const navigate = useNavigate();
  const { data: profiles = [], isLoading: loading } = useProfiles();
  const { updateProfile } = useProfileMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit Join Date dialog state
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; full_name: string; join_date: string | null } | null>(null);
  const [newJoinDate, setNewJoinDate] = useState("");

  const forms = profiles.map(p => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    employee_id: p.employee_id || null,
    department: p.department || null,
    designation: p.job_title || null,
    join_date: p.join_date || null,
    onboarding_status: p.onboarding_status || 'pending',
    created_at: p.created_at
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredForms = forms.filter(form => {
    let matchesSearch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matchesSearch =
        (form.full_name || "").toLowerCase().includes(query) ||
        (form.email || "").toLowerCase().includes(query) ||
        (form.employee_id || "").toLowerCase().includes(query) ||
        (form.department || "").toLowerCase().includes(query);
    }

    const matchesStatus = statusFilter === "all" || form.onboarding_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: forms.length,
    completed: forms.filter(f => f.onboarding_status === "completed").length,
    pending: forms.filter(f => f.onboarding_status !== "completed").length
  };

  const handleOpenEditDate = (form: typeof forms[0]) => {
    setSelectedEmployee({
      id: form.id,
      full_name: form.full_name || "Employee",
      join_date: form.join_date,
    });
    setNewJoinDate(form.join_date ? form.join_date.split("T")[0] : "");
    setEditDateOpen(true);
  };

  const handleSaveJoinDate = async () => {
    if (!selectedEmployee) return;
    if (!newJoinDate) {
      toast({ title: "Error", description: "Please select a join date.", variant: "destructive" });
      return;
    }
    try {
      await updateProfile.mutateAsync({
        id: selectedEmployee.id,
        data: { join_date: newJoinDate } as any,
      });
      toast({ title: "Success", description: `Join date updated for ${selectedEmployee.full_name}.` });
      setEditDateOpen(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update join date.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Joining Forms</h1>
          <p className="text-gray-500">Manage employee onboarding forms</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, employee ID, or department..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                onClick={() => setStatusFilter("pending")}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                onClick={() => setStatusFilter("completed")}
              >
                Completed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="flex-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No joining forms found
                  </TableCell>
                </TableRow>
              ) : (
                filteredForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{form.full_name || "N/A"}</p>
                        <p className="text-sm text-gray-500">{form.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{form.employee_id || "-"}</TableCell>
                    <TableCell>{form.department || "-"}</TableCell>
                    <TableCell>{form.designation || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{form.join_date ? format(new Date(form.join_date), "dd MMM yyyy") : "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {form.created_at ? format(new Date(form.created_at), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(form.onboarding_status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/joining-form/${form.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/joining-form/${form.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Form
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenEditDate(form)}>
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Edit Join Date
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Join Date Dialog */}
      <Dialog open={editDateOpen} onOpenChange={setEditDateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Edit Join Date
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-sm text-gray-500">Employee</p>
                <p className="font-semibold text-gray-900">{selectedEmployee.full_name}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_join_date">Join Date</Label>
                <Input
                  id="edit_join_date"
                  type="date"
                  value={newJoinDate}
                  onChange={(e) => setNewJoinDate(e.target.value)}
                  className="w-full"
                />
                {selectedEmployee.join_date && (
                  <p className="text-xs text-gray-400">
                    Current: {format(new Date(selectedEmployee.join_date), "dd MMMM yyyy")}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveJoinDate}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Save Date
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JoiningFormList;
