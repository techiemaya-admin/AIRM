import React, { useState, useMemo, useEffect } from 'react';
import {
  useFjtBoardData,
  useCreateFjtIssue,
  useUpdateFjtEpic,
  FjtEpic,
} from '@/sdk/features/fjt-board';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Layers,
  Plus,
  Edit2,
  Bookmark,
  Check,
  X,
  Search,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const EPIC_COLOR_PRESETS = [
  '#ea580c', // Orange
  '#9333ea', // Purple
  '#dc2626', // Red
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#db2777', // Pink
  '#0d9488', // Teal
  '#4f46e5', // Indigo
  '#0284c7', // Sky
];

interface EpicsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEditingEpicId?: string | null;
}

export const EpicsManagementDialog: React.FC<EpicsManagementDialogProps> = ({
  open,
  onOpenChange,
  initialEditingEpicId,
}) => {
  const { data: boardData } = useFjtBoardData();
  const createIssueMutation = useCreateFjtIssue();
  const updateEpicMutation = useUpdateFjtEpic();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEpic, setEditingEpic] = useState<FjtEpic | null>(null);

  // Form State for creating / editing (Epic Name, Summary, Color)
  const [epicName, setEpicName] = useState('');
  const [summary, setSummary] = useState('');
  const [color, setColor] = useState('#ea580c');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const epics = useMemo(() => boardData?.epics || [], [boardData]);
  const activeProject = useMemo(() => {
    if (boardData?.projects && boardData.projects.length > 0) {
      if (boardData.currentProjectId) {
        const found = boardData.projects.find((p) => p.id === boardData.currentProjectId);
        if (found) return found;
      }
      return boardData.projects[0];
    }
    return {
      id: '',
      key: boardData?.project?.key || 'FJT',
      name: boardData?.project?.name || 'Project',
    };
  }, [boardData]);

  // Set initial editing epic if specified
  useEffect(() => {
    if (initialEditingEpicId && open) {
      const found = epics.find((e) => e.id === initialEditingEpicId);
      if (found) {
        startEditingEpic(found);
      }
    } else if (open && !initialEditingEpicId) {
      setActiveTab('list');
    }
  }, [initialEditingEpicId, open, epics]);

  const filteredEpics = useMemo(() => {
    if (!searchQuery.trim()) return epics;
    const q = searchQuery.toLowerCase();
    return epics.filter((e) => {
      const name = (e.epicName || (e as any).name || '').toLowerCase();
      const s = (e.summary || '').toLowerCase();
      const k = (e.key || '').toLowerCase();
      return name.includes(q) || s.includes(q) || k.includes(q);
    });
  }, [epics, searchQuery]);

  const startEditingEpic = (epic: FjtEpic) => {
    setEditingEpic(epic);
    setEpicName(epic.epicName || (epic as any).name || epic.summary || '');
    setSummary(epic.summary || epic.epicName || '');
    setColor(epic.color || '#ea580c');
    setActiveTab('edit');
  };

  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!epicName.trim()) {
      toast({
        title: 'Missing epic name',
        description: 'Please enter a name for the epic.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createIssueMutation.mutateAsync({
        type: 'epic',
        projectKey: activeProject.key,
        projectName: activeProject.name,
        epicName: epicName.trim(),
        summary: summary.trim() || epicName.trim(),
        epicColor: color,
      });

      toast({
        title: 'Epic created',
        description: `Epic "${epicName}" has been successfully created.`,
      });

      // Reset form
      setEpicName('');
      setSummary('');
      setColor('#ea580c');
      setActiveTab('list');
    } catch (err: any) {
      toast({
        title: 'Failed to create epic',
        description: err.message || 'An error occurred while creating the epic.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpic) return;
    if (!epicName.trim()) {
      toast({
        title: 'Missing epic name',
        description: 'Please enter a name for the epic.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateEpicMutation.mutateAsync({
        epicId: editingEpic.id,
        epicName: epicName.trim(),
        summary: summary.trim() || epicName.trim(),
        color,
      });

      toast({
        title: 'Epic updated',
        description: `Epic "${epicName}" has been successfully updated.`,
      });

      setEditingEpic(null);
      setActiveTab('list');
    } catch (err: any) {
      toast({
        title: 'Failed to update epic',
        description: err.message || 'An error occurred while updating the epic.',
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
        className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[720px] h-[480px] sm:h-[560px] max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-white p-0 gap-0 shadow-2xl rounded-xl"
      >
        {/* Header */}
        <div className="py-4 px-5 sm:px-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold flex-shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 truncate">
                Epics Management
              </h2>
              <p className="text-[11px] text-gray-500 truncate hidden sm:block">
                View, create, and edit Epics for {activeProject.name}
              </p>
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

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col space-y-4 custom-scrollbar">
          {/* Segmented Controls / Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
            <div className="flex rounded-lg bg-gray-100 p-1 text-xs font-semibold w-full sm:w-auto border border-gray-200/80">
              <button
                type="button"
                onClick={() => {
                  setEditingEpic(null);
                  setActiveTab('list');
                }}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md transition-all ${
                  activeTab === 'list'
                    ? 'bg-white text-[#0B1957] shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Epics ({epics.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingEpic(null);
                  setEpicName('');
                  setSummary('');
                  setColor('#ea580c');
                  setActiveTab('create');
                }}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'bg-white text-[#0B1957] shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Epic
              </button>
              {activeTab === 'edit' && editingEpic && (
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-md bg-white text-purple-700 shadow-xs font-bold flex items-center gap-1.5"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit: {editingEpic.key}
                </button>
              )}
            </div>

            {activeTab === 'list' && (
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Filter epics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* List View */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {filteredEpics.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
                  <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600">
                    {searchQuery ? 'No epics matching your search' : 'No epics created for this project yet'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Epics help structure large deliverables into manageable user stories.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveTab('create')}
                    className="mt-4 bg-[#0B1957] hover:bg-[#071038] text-white text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create first Epic
                  </Button>
                </div>
              ) : (
                filteredEpics.map((epic) => {
                  const epicStories = boardData?.issues.filter(
                    (i) => i.epicId === epic.id && i.type === 'story'
                  ) || [];
                  const epicTasks = boardData?.issues.filter((i) => {
                    if (i.epicId === epic.id && (i.type === 'task' || i.type === 'bug')) return true;
                    const parentStory = boardData.issues.find((s) => s.id === i.storyId);
                    return parentStory?.epicId === epic.id;
                  }) || [];

                  const displayName = epic.epicName || (epic as any).name || epic.summary;

                  return (
                    <div
                      key={epic.id}
                      className="border border-gray-200 hover:border-gray-300 rounded-lg p-4 bg-white hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <span
                            className="w-3.5 h-3.5 rounded-md flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: epic.color || '#ea580c' }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                {epic.key}
                              </span>
                              <h3 className="font-bold text-sm text-gray-900 truncate">
                                {displayName}
                              </h3>
                            </div>

                            {epic.summary && epic.summary !== displayName && (
                              <p className="text-xs text-gray-500 line-clamp-1">{epic.summary}</p>
                            )}
                          </div>
                        </div>

                        {/* Counts */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 font-medium pl-6">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <Bookmark className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                            {epicStories.length} Stories
                          </span>
                          <span>•</span>
                          <span className="text-gray-600">
                            {epicTasks.length} Tasks & Bugs
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingEpic(epic)}
                          className="text-xs h-8 gap-1.5 border-gray-300 hover:bg-gray-50"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                          Edit Epic
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Create or Edit Form */}
          {(activeTab === 'create' || activeTab === 'edit') && (
            <form
              onSubmit={activeTab === 'create' ? handleCreateEpic : handleUpdateEpic}
              className="flex-1 flex flex-col justify-between space-y-4 pt-1"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Epic Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={epicName}
                    onChange={(e) => setEpicName(e.target.value)}
                    placeholder="e.g. Authentication & Security"
                    className="bg-white border-gray-300 text-xs h-9"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Summary / Description
                  </label>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief description of the deliverables and scope of this epic..."
                    className="bg-white border-gray-300 text-xs resize-none"
                    rows={3}
                  />
                </div>

                {/* Color Preset Palette */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Epic Theme Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {EPIC_COLOR_PRESETS.map((c) => {
                      const isSelected = color === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center ${
                            isSelected ? 'scale-110 ring-2 ring-offset-2 ring-gray-800 shadow-sm' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-200 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingEpic(null);
                    setActiveTab('list');
                  }}
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
                  {isSubmitting
                    ? activeTab === 'create'
                      ? 'Creating...'
                      : 'Saving...'
                    : activeTab === 'create'
                    ? 'Create Epic'
                    : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
