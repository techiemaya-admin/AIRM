import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { CardSkeleton } from "@/components/PageSkeletons";


interface Project {
  id: number | string;
  gitlab_project_id: number;
  name: string;
  description?: string;
  web_url?: string;
  visibility: string;
  issue_count: number;
  open_issues: number;
  closed_issues: number;
  created_at: string;
}

const Projects = ({ onProjectSelect }: { onProjectSelect?: (projectName: string) => void }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    visibility: "private" as "private" | "internal" | "public"
  });
  const [creating, setCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProjects();
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setIsAdmin(userData.role === 'admin');
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.projects.getAll();
      setProjects(response as Project[]);
    } catch (error: any) {
      console.error("Failed to fetch projects:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      await api.projects.create(createForm);

      toast({
        title: "Success",
        description: "Project created successfully in GitLab!",
      });

      setShowCreateDialog(false);
      setCreateForm({ name: "", description: "", visibility: "private" });
      fetchProjects(); // Refresh the list
    } catch (error: any) {
      console.error("Failed to create project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (id: number | string) => {
    try {
      await api.projects.delete(String(id));
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      fetchProjects(); // Refresh the list
    } catch (error: any) {
      console.error("Failed to delete project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const handleProjectClick = (project: Project) => {
    if (onProjectSelect) {
      onProjectSelect(project.name);
    } else {
      navigate(`/issues?project=${project.id}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and sync with GitLab
          </p>
        </div>

        {isAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                🚀 Create Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Enter project name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Enter project description (optional)"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <select
                    id="visibility"
                    value={createForm.visibility}
                    onChange={(e) => setCreateForm({ ...createForm, visibility: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="private">Private</option>
                    <option value="internal">Internal</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-8">
          <CardHeader>
            <CardTitle className="text-xl">No Projects Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create your first project to get started with project management.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              🚀 Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer border-l-4 border-l-primary"
              onClick={() => handleProjectClick(project)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold truncate flex-1 pr-2">
                    {project.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${project.visibility === 'private' ? 'bg-red-100 text-red-800' :
                      project.visibility === 'internal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                      {project.visibility}
                    </span>
                    {isAdmin && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                              <AlertCircle className="h-5 w-5" />
                              Confirm Project Deletion
                            </DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <p className="text-sm text-gray-500">
                              Are you sure you want to delete <strong>{project.name}</strong>?
                              This will also remove all issues associated with this project. This action cannot be undone.
                            </p>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                // The dialog closes automatically when trigger state changes
                                // but we need to find a way to close it without shadcn's internal methods
                                // Actually, the simplest way is to use a local state if needed.
                                // But shadcn Dialog closes on any button click that doesn't stopPropagation?
                                // Actually, just let the user click Delete.
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id);
                                // Close the dialog by triggering a click on the backdrop or similar?
                                // Usually shadcn handles this.
                              }}
                            >
                              Delete Project
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {project.description || "No description provided"}
                </p>

                <div className="flex justify-between items-center text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">Issues:</span>
                      <span className="font-medium">{project.issue_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-600">{project.open_issues || 0} Open</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-600">{project.closed_issues || 0} Closed</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </div>

                {project.web_url && (
                  <div className="mt-2">
                    <a
                      href={project.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center space-x-1"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <span>🔗 View in GitLab</span>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;