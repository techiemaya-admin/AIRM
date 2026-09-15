import React, { useState, useMemo } from 'react';
import {
  useFjtBoardData,
  useCreateFjtProject,
  useSetCurrentFjtProject,
  FjtProject,
} from '@/sdk/features/fjt-board';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUsers } from '@/hooks/useUsers';
import {
  FolderKanban,
  Plus,
  Check,
  X,
  Layers,
  Bookmark,
  User,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface ProjectsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectsManagementDialog: React.FC<ProjectsManagementDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { data: boardData } = useFjtBoardData();
  const { data: dbUsers = [] } = useUsers();
  const createProjectMutation = useCreateFjtProject();
  const setProjectMutation = useSetCurrentFjtProject();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // Form State for creating new project
  const [projectName, setProjectName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [description, setDescription] = useState('');
  const [leadUserId, setLeadUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projects = useMemo(() => boardData?.projects || [], [boardData]);
  const currentProjectId = boardData?.currentProjectId || projects[0]?.id;

  // Auto-generate project key from name
  const handleNameChange = (val: string) => {
    setProjectName(val);
    if (!projectKey || projectKey.length <= 4) {
      const generated = val
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 5);
      if (generated) setProjectKey(generated);
    }
  };

  const handleSelectProject = async (project: FjtProject) => {
    try {
      await setProjectMutation.mutateAsync(project.id);
      toast({
        title: 'Project selected',
        description: `Active project set to ${project.name} (${project.key}).`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectKey.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please enter a project name and key.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedUser = dbUsers.find((u: any) => String(u.id || u.user_id) === leadUserId);
      await createProjectMutation.mutateAsync({
        name: projectName.trim(),
        key: projectKey.trim().toUpperCase(),
        description: description.trim() || undefined,
        leadUserId: leadUserId || undefined,
        lead: selectedUser?.full_name || selectedUser?.name || '-',
      });

      toast({
        title: 'Project created',
        description: `${projectName} (${projectKey.toUpperCase()}) has been created.`,
      });

      // Reset form
      setProjectName('');
      setProjectKey('');
      setDescription('');
      setLeadUserId('');
      setActiveTab('list');
    } catch (err: any) {
      toast({
        title: 'Failed to create project',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideDefaultClose
        className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[680px] h-[480px] sm:h-[580px] max-h-[75vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-white p-0 gap-0 shadow-2xl rounded-xl"
      >
        {/* Clean Header: Icon, Title, Subtitle, and Close button */}
        <div className="py-4 sm:py-4.5 px-5 sm:px-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0B1957] flex items-center justify-center font-bold flex-shrink-0">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 truncate">Projects Directory</h2>
              <p className="text-[11px] text-gray-500 truncate hidden sm:block">Switch active project or create a new project workspace.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0 -mr-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body with segmented tabs at the top */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col space-y-4 custom-scrollbar">
          {/* Tabs inside body */}
          <div className="flex rounded-lg bg-gray-100 p-1 text-xs font-semibold w-full sm:w-auto self-start border border-gray-200/80 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md transition-all ${
                activeTab === 'list'
                  ? 'bg-white text-[#0B1957] shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Projects ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-white text-[#0B1957] shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Project
            </button>
          </div>

          {activeTab === 'list' ? (
            <div className="space-y-3">
              {projects.map((project) => {
                const isActive = project.id === currentProjectId;
                const projectIssues = boardData?.issues.filter(
                  (i) => (i as any).projectId === project.id || i.projectKey?.toUpperCase() === project.key.toUpperCase()
                ) || [];
                const storyCount = projectIssues.filter((i) => i.type === 'story').length;
                const taskCount = projectIssues.filter((i) => i.type === 'task' || i.type === 'bug').length;

                return (
                  <div
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className={`border rounded-lg p-4 bg-white hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isActive ? 'border-[#0B1957] ring-1 ring-[#0B1957]/20 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-md bg-[#0B1957] text-white flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0">
                          {project.key}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-gray-900">{project.name}</h3>
                            {isActive && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">{project.description || 'Standard Agile Project Workspace'}</p>
                        </div>
                      </div>

                      {/* Work Items Count Badge */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-500 font-medium">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <Bookmark className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                          {storyCount} Stories
                        </span>
                        <span>•</span>
                        <span className="text-gray-600">
                          {taskCount} Tasks & Bugs
                        </span>
                        {project.lead && (
                          <>
                            <span>•</span>
                            <span className="text-[#0B1957] font-semibold flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Lead: {project.lead && project.lead !== 'Free Tech' ? project.lead : '-'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isActive ? (
                        <span className="text-xs font-bold text-[#0B1957] bg-blue-50 px-3 py-1.5 rounded-md">
                          Current Board
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProject(project);
                          }}
                          className="text-xs h-8"
                        >
                          Select Project
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleCreateProject} className="flex-1 flex flex-col justify-between space-y-4 pt-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={projectName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Mobile Banking App"
                      className="bg-white border-gray-300 text-xs h-9"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Project Key <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={projectKey}
                      onChange={(e) => setProjectKey(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="e.g. MBA"
                      className="bg-white border-gray-300 text-xs h-9 font-bold uppercase"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the main purpose and scope of this project..."
                    className="bg-white border-gray-300 text-xs resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Project Lead
                  </label>
                  <Select value={leadUserId} onValueChange={setLeadUserId}>
                    <SelectTrigger className="w-full bg-white border border-gray-300 rounded-md text-xs h-9 px-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#0B1957]">
                      <SelectValue placeholder="Select Project Lead" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-56 z-50 shadow-lg border border-gray-200">
                      {dbUsers.map((u: any) => {
                        const uid = String(u.id || u.user_id);
                        const uname = u.full_name || u.name || u.email;
                        return (
                          <SelectItem
                            key={uid}
                            value={uid}
                            className="text-xs cursor-pointer text-gray-700 focus:bg-blue-50 focus:text-[#0B1957] hover:bg-blue-50 hover:text-[#0B1957] data-[highlighted]:bg-blue-50 data-[highlighted]:text-[#0B1957] data-[state=checked]:bg-blue-50 data-[state=checked]:text-[#0B1957] data-[state=checked]:font-semibold"
                          >
                            {uname} {u.email ? `(${u.email})` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-200 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('list')}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0B1957] hover:bg-[#071038] text-white text-xs font-semibold h-8 px-4"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
