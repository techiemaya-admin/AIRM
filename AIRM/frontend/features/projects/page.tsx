import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
import { 
  Trash2, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  Github, 
  Layers, 
  Layout, 
  CheckCircle2, 
  Search,
  Kanban,
  Table as TableIcon,
  Calendar,
  GitBranch,
  Rocket,
  Bug,
  RefreshCw,
  Flag,
  Map,
  History,
  MessageSquare,
  Code2,
  CircleDot,
  GitPullRequest,
  Shield,
  BarChart2,
  Settings,
  Globe,
  Lock,
  Star,
  Eye,
  GitFork,
  BookOpen,
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ArrowUpDown,
  MoreHorizontal,
  FileText,
  Folder,
  Tag,
  GitCommit,
  Filter,
  Milestone,
  Bell,
  Bold,
  Italic,
  Paperclip,
  Link2,
  List
} from "lucide-react";
import { CardSkeleton } from "@/components/PageSkeletons";

interface Project {
  id: number | string;
  name: string;
  description?: string;
  web_url?: string;
  visibility: string;
  issue_count: number;
  open_issues: number;
  closed_issues: number;
  created_at: string;
  source?: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  private: boolean;
  html_url: string;
}

interface GitHubProject {
  id: string;
  number: number;
  name: string;
  html_url: string;
  closed: boolean;
  updated_at: string;
}

type WizardStep = 'list' | 'repository' | 'templates' | 'confirm';

// Helper icon for Team planning since Users isn't imported from lucide-react in the same way sometimes
const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const PROJECT_TEMPLATES = [
  {
    id: 'team-planning',
    title: 'Team planning',
    description: "Manage your team's work items, plan upcoming cycles, and understand team capacity.",
    icon: <Users className="w-6 h-6 text-blue-500" />,
    image: "/team-planning.png",
    type: 'Featured'
  },
  {
    id: 'kanban',
    title: 'Kanban',
    description: 'Visualize the status of your project and limit work in progress.',
    icon: <Kanban className="w-6 h-6 text-orange-500" />,
    image: "/kanban.png",
    type: 'Featured'
  },
  {
    id: 'feature-release',
    title: 'Feature release',
    description: "Manage your team's prioritized work items when planning for a feature release.",
    icon: <Rocket className="w-6 h-6 text-purple-500" />,
    image: "/team-planning.png",
    type: 'Featured'
  },
  {
    id: 'bug-tracker',
    title: 'Bug tracker',
    description: 'Track and triage your bugs 🪲',
    icon: <Bug className="w-6 h-6 text-red-500" />,
    image: "/kanban.png",
    type: 'Featured'
  },
  {
    id: 'iterative-development',
    title: 'Iterative development',
    description: 'Plan your current and upcoming iterations as you work through your prioritized backlog of items.',
    icon: <RefreshCw className="w-6 h-6 text-indigo-500" />,
    image: "/team-planning.png",
    type: 'Featured'
  },
  {
    id: 'product-launch',
    title: 'Product launch',
    description: 'Manage work items across teams and functions when planning for a product launch 🚀',
    icon: <Flag className="w-6 h-6 text-emerald-500" />,
    image: "/kanban.png",
    type: 'Featured'
  },
  {
    id: 'roadmap',
    title: 'Roadmap',
    description: "Manage your team's long term plans as you plan out your roadmap.",
    icon: <Map className="w-6 h-6 text-cyan-500" />,
    image: "/roadmap.png",
    type: 'Featured'
  },
  {
    id: 'team-retrospective',
    title: 'Team retrospective',
    description: 'Reflect as a team what went well, what can be improved next time, and action items.',
    icon: <History className="w-6 h-6 text-amber-500" />,
    image: "/roadmap.png",
    type: 'Featured'
  }
];

const SCRATCH_TEMPLATES = [
  { id: 'table', title: 'Table', description: 'Start with a spreadsheet style table', icon: <TableIcon className="w-5 h-5 text-blue-500" />, image: "/team-planning.png" },
  { id: 'board', title: 'Board', description: 'Start with a board to spread issues', icon: <Layout className="w-5 h-5 text-orange-500" />, image: "/kanban.png" },
  { id: 'roadmap', title: 'Roadmap', description: 'Start with a high-level timeline', icon: <Calendar className="w-5 h-5 text-emerald-500" />, image: "/roadmap.png" }
];


const Projects = ({ onProjectSelect, onlyProjects = false }: { onProjectSelect?: (projectName: string) => void, onlyProjects?: boolean }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Wizard State
  const [wizardStep, setWizardStep] = useState<WizardStep>('list');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [ghProjects, setGhProjects] = useState<GitHubProject[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingGhProjects, setLoadingGhProjects] = useState(false);
  
  // Selection State
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedGhProject, setSelectedGhProject] = useState<GitHubProject | 'new' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState("");
  const [importItems, setImportItems] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<Project | null>(null);
  const [boardItems, setBoardItems] = useState<any[]>([]);
  const [projectViews, setProjectViews] = useState<any[]>([
    { id: 1, name: 'View 1', layout: 'table' }
  ]);
  const [activeViewId, setActiveViewId] = useState(1);
  const [showNewViewMenu, setShowNewViewMenu] = useState(false);
  const [showViewMenuId, setShowViewMenuId] = useState<number | null>(null);
  const [boardAddingStatus, setBoardAddingStatus] = useState<string | null>(null);
  const [isRenamingView, setIsRenamingView] = useState<number | null>(null);
  const [tempViewName, setTempViewName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [mainTab, setMainTab] = useState<'repos' | 'projects'>('repos');
  const [allRepos, setAllRepos] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // Drag-and-drop state
  const [draggedItem, setDraggedItem] = useState<any | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [projectFields, setProjectFields] = useState<{ fieldId: string; options: { id: string; name: string }[] } | null>(null);

  // Projects linked to the currently opened repo
  const [repoProjects, setRepoProjects] = useState<any[]>([]);
  const [repoProjectsLoading, setRepoProjectsLoading] = useState(false);
  // useRef persists across re-renders and is never stale in async callbacks
  const wizardOriginRepoRef = useRef<any>(null);
  // Keep a state copy for reading in JSX if needed (ref for logic, state for rendering)
  const [wizardOriginRepo, setWizardOriginRepo] = useState<any>(null);

  // Refresh items from GitHub for the currently open board
  const refreshBoardItems = async (nodeId?: string) => {
    const id = nodeId || (selectedBoard as any)?.githubNodeId;
    if (!id) return;
    setIsSyncing(true);
    try {
      const items = await api.git.getProjectItems(id);
      setBoardItems(items);
    } catch (err) {
      console.error('Failed to refresh board items:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-poll GitHub every 30 s while a board is open
  useEffect(() => {
    const nodeId = (selectedBoard as any)?.githubNodeId;
    if (!nodeId) return;
    const interval = setInterval(() => refreshBoardItems(nodeId), 30000);
    return () => clearInterval(interval);
  }, [(selectedBoard as any)?.githubNodeId]);

  // Handle drag-and-drop: move item to a new status column
  const handleDrop = async (targetStatus: string) => {
    if (!draggedItem || draggedItem.status === targetStatus) {
      setDraggedItem(null);
      setDragOverColumn(null);
      return;
    }

    // Capture before clearing state
    const itemToMove = draggedItem;

    // Optimistic update
    setBoardItems((prev: any[]) =>
      prev.map(i => i.id === itemToMove.id ? { ...i, status: targetStatus } : i)
    );
    setDraggedItem(null);
    setDragOverColumn(null);

    // Persist to GitHub
    const nodeId = (selectedBoard as any)?.githubNodeId;
    if (!nodeId) {
      console.warn('⚠️ No GitHub Node ID — cannot sync drag to GitHub');
      return;
    }
    if (!projectFields) {
      console.warn('⚠️ No projectFields loaded — cannot sync drag to GitHub. Trying to fetch fields now...');
      // Attempt to fetch fields on demand
      try {
        const fields = await api.git.getProjectFields(nodeId) as any;
        if (fields) setProjectFields(fields);
        const option = fields?.options?.find((o: any) => o.name.toLowerCase() === targetStatus.toLowerCase());
        if (option) {
          await api.git.updateProjectItemStatus(itemToMove.id, nodeId, fields.fieldId, option.id);
          console.log(`✅ Moved "${itemToMove.title}" → ${targetStatus} on GitHub`);
        }
      } catch (err) {
        console.error('Failed to fetch fields and update on GitHub:', err);
      }
      return;
    }

    const option = projectFields.options.find(
      o => o.name.toLowerCase() === targetStatus.toLowerCase()
    );
    if (!option) {
      console.warn(`⚠️ No GitHub option found for status "${targetStatus}". Options: ${projectFields.options.map(o => o.name).join(', ')}`);
      return;
    }

    console.log(`🚀 Calling updateProjectItemStatus: item=${itemToMove.id}, project=${nodeId}, field=${projectFields.fieldId}, option=${option.id} (${option.name})`);
    try {
      await api.git.updateProjectItemStatus(itemToMove.id, nodeId, projectFields.fieldId, option.id);
      console.log(`✅ Moved "${itemToMove.title}" → ${targetStatus} on GitHub`);
    } catch (err) {
      console.error('Failed to update status on GitHub:', err);
    }
  };



  const openProjectBoard = async (project: any) => {
    // Determine GitHub Node ID
    // If already a GitHub project, the id IS the Node ID (PVT_kw...)
    let githubNodeId: string | null = null;
    if (project.source === 'github_project' || String(project.id).startsWith('PVT_')) {
      githubNodeId = project.id;
    } else {
      // Local project — try to find it in GitHub by number first, then name
      try {
        const ghProjects: any[] = await api.git.getProjects();
        // Match by number (most reliable)
        let match = project.number ? ghProjects.find((p: any) => p.number === project.number) : null;
        // Fallback: match by repo_name or name  
        if (!match) {
          const projectName = (project.repo_name || project.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          match = ghProjects.find((p: any) => {
            const ghName = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return ghName === projectName || ghName.includes(projectName) || projectName.includes(ghName);
          });
        }
        if (match) {
          githubNodeId = match.id;
          console.log(`✅ Resolved GitHub Node ID for "${project.name}": ${githubNodeId}`);
        } else {
          console.warn(`⚠️ Could not match "${project.name}" to any GitHub project`);
        }
      } catch (e) {
        console.error('Could not resolve GitHub Node ID:', e);
      }
    }

    setSelectedBoard({ ...project, githubNodeId });
    setActiveViewId(1);
    // Default to board layout so the template columns are immediately visible
    setProjectViews([{ id: 1, name: 'Board', layout: 'board' }]);
    setBoardItems([]);
    setProjectFields(null);

    // If we have a GitHub Node ID, load real items + fields from GitHub
    if (githubNodeId) {
      try {
        const [items, fields] = await Promise.all([
          api.git.getProjectItems(githubNodeId),
          api.git.getProjectFields(githubNodeId).catch(() => null),
        ]);
        setBoardItems(Array.isArray(items) ? items : []);
        if (fields) setProjectFields(fields as any);
        return;
      } catch (err) {
        console.error('Failed to fetch GitHub project items:', err);
        // Fall through to template-based items
      }
    }

    // Fallback: template-based placeholder items for non-GitHub projects
    const template = project.template || 'kanban';
    const templateKey = template.toLowerCase().replace(/\s+/g, '-');
    const FALLBACK_COLUMNS: Record<string, string[]> = {
      'kanban':              ['Todo', 'In Progress', 'Done'],
      'team-planning':      ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
      'bug-tracker':        ['New', 'Confirmed', 'In Progress', 'Fixed', 'Verified'],
      'feature-release':    ['Planning', 'In Progress', 'Review', 'Released'],
      'iterative-development': ['Backlog', 'Current Sprint', 'In Progress', 'Done'],
      'product-launch':     ['Planning', 'Building', 'Testing', 'Launched'],
      'roadmap':            ['Planned', 'In Progress', 'Done'],
      'team-retrospective': ['Went Well', 'Improve', 'Action Items', 'Done'],
    };
    const cols = FALLBACK_COLUMNS[templateKey] || ['Todo', 'In Progress', 'Done'];
    // Seed the projectFields with fallback columns so the board renders correctly
    setProjectFields({ fieldId: 'local', options: cols.map((c, i) => ({ id: String(i), name: c })) });
    setBoardItems([]);
  };

  const handleAddDates = () => {
    const updated = boardItems.map((item, i) => ({
      ...item,
      start: `2026-04-${(i * 5) + 1}`.padStart(10, '0'),
      end: `2026-04-${(i * 5) + 5}`.padStart(10, '0')
    }));
    setBoardItems(updated);
    toast({ title: "Dates Synchronized", description: "All items have been scheduled for the current month." });
  };

  const handleRenameView = (id: number) => {
    const view = projectViews.find(v => v.id === id);
    if (view) {
      setIsRenamingView(id);
      setTempViewName(view.name);
      setShowViewMenuId(null);
    }
  };

  const saveViewName = () => {
    if (isRenamingView && tempViewName) {
      setProjectViews(projectViews.map(v => v.id === isRenamingView ? { ...v, name: tempViewName } : v));
      setIsRenamingView(null);
      toast({ title: "View Renamed", description: `Successfully renamed to "${tempViewName}"` });
    }
  };

  const handleToolbarAction = (action: string) => {
    toast({ title: action, description: "This feature is being synchronized with your GitHub settings." });
  };
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Adds a draft item to the real GitHub Project V2 board, then updates local state
  const handleAddItem = async (title: string, status: string = 'Todo') => {
    if (!title.trim() || !selectedBoard) return;
    // Optimistic local update
    const tempItem = { id: Date.now(), title, status, assignees: ['P'], prs: 0 };
    setBoardItems((prev: any[]) => [...prev, tempItem]);
    setNewItemTitle('');
    setIsAddingItem(false);
    setBoardAddingStatus(null);
    // Persist to GitHub using the real Node ID
    const githubNodeId = selectedBoard.githubNodeId;
    if (githubNodeId) {
      try {
        await api.git.addProjectItem(githubNodeId, title);
      } catch (err) {
        console.error('Failed to add item to GitHub project:', err);
      }
    } else {
      console.warn('No GitHub Node ID for this project — item saved locally only.');
    }
  };
  const [repoTab, setRepoTab] = useState<'code' | 'issues' | 'pulls' | 'agents' | 'projects'>('code');
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [branches, setBranches] = useState<any[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [repoTree, setRepoTree] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [openedFile, setOpenedFile] = useState<any | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [showGoToFile, setShowGoToFile] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [fileSearchResults, setFileSearchResults] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [issueComments, setIssueComments] = useState<Record<number, any[]>>({});
  const [issueLabels, setIssueLabels] = useState<Record<number, string[]>>({});
  const [commentText, setCommentText] = useState("");
  const [importType, setImportType] = useState("Open issues");
  const [createOnGithub, setCreateOnGithub] = useState(false);
  const [createGithubProject, setCreateGithubProject] = useState(true);
  const [repoIssues, setRepoIssues] = useState<any[]>([]);
  const [repoPRs, setRepoPRs] = useState<any[]>([]);
  const [repoCommits, setRepoCommits] = useState<any[]>([]);
  const [isRepoLoading, setIsRepoLoading] = useState(false);
  
  // Forms
  const [newRepoForm, setNewRepoForm] = useState({ name: "", description: "", visibility: "private" });
  const [newProjectForm, setNewProjectForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<'featured' | 'scratch'>('featured');
  const [templateSearch, setTemplateSearch] = useState("");
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueBody, setNewIssueBody] = useState("");

  useEffect(() => {
    fetchProjects();
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setIsAdmin(userData.role === 'admin');
  }, [onlyProjects]);

  // Fetch projects linked to the currently selected repo whenever the Projects tab opens
  useEffect(() => {
    if (repoTab === 'projects' && selectedProject) {
      const owner = (selectedProject as any).owner || 'prasad758';
      const repo = (selectedProject as any).repo_name || (selectedProject as any).name;
      setRepoProjectsLoading(true);
      api.git.getRepoProjects(owner, repo)
        .then((data: any[]) => setRepoProjects(data))
        .catch(() => setRepoProjects([]))
        .finally(() => setRepoProjectsLoading(false));
    }
  }, [repoTab, selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      fetchRepoData();
    }
  }, [selectedProject]);

  const fetchRepoData = async () => {
    if (!selectedProject) return;
    setIsRepoLoading(true);
    try {
      const repoName = selectedProject.repo_name || selectedProject.name;
      const issues = await api.git.getIssues(repoName);
      
       const allIssues = issues as any[];
       console.log(`📦 Fetched ${allIssues.length} total items for ${repoName}`);
       
       const realIssues = allIssues.filter((item: any) => !(item.web_url || "").includes('/pull/'));
       
       console.log(`✅ Filtered: ${realIssues.length} issues`);
       setRepoIssues(realIssues);

      // Fetch real PRs from dedicated GitHub API
      const owner = 'prasad758';
      const repoName2 = selectedProject.repo_name || selectedProject.name;
      try {
        const prs = await api.git.getRepoPullRequests(owner, repoName2);
        setRepoPRs(prs as any[]);
        console.log(`✅ Fetched ${(prs as any[]).length} PRs from GitHub`);
      } catch {
        setRepoPRs([]);
      }
      
      const commits = await api.git.getCommits(repoName);
      setRepoCommits(commits as any[]);
    } catch (error) {
      console.error("Error fetching repo data:", error);
    } finally {
      setIsRepoLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      if (onlyProjects) {
        // Shared global projects list
        const [ghProjectsData, localProjectsData] = await Promise.all([
          api.git.getProjects().catch(() => []),
          api.projects.getAll().catch(() => []),
        ]);
        
        const ghProj = (ghProjectsData as any[]).map(p => ({
          ...p,
          source: 'github_project',
          issue_count: p.issue_count || 0,
        }));

        const ghIdSet = new Set(ghProj.map(p => p.id));
        const ghNameSet = new Set(ghProj.map(p => (p.name || '').toLowerCase().trim()));

        const localOnly = (localProjectsData as any[]).filter((p: any) => {
          if (p.github_id && ghIdSet.has(p.github_id)) return false;
          if (ghNameSet.has((p.name || '').toLowerCase().trim())) return false;
          return true;
        }).map((p: any) => ({
          ...p,
          source: 'github_project',
        }));

        setProjects([...ghProj, ...localOnly]);
      } else {
        // Dashboard mode: fetch both for tabs
        const [reposData, ghProjectsData, localProjectsData] = await Promise.all([
          api.git.getRepos().catch(() => []), // Fetch real GitHub repos
          api.git.getProjects().catch(() => []),
          api.projects.getAll().catch(() => []) 
        ]);

        const repos = (reposData as any[]).map(r => ({
          ...r,
          source: 'github_repo',
          repo_name: r.name, 
          issue_count: r.open_issues_count || 0,
          open_issues: r.open_issues_count || 0,
        }));
        setAllRepos(repos);

        const ghProj = (ghProjectsData as any[]).map(p => ({
          ...p,
          source: 'github_project',
          issue_count: p.issue_count || 0,
        }));

        const ghIdSet = new Set(ghProj.map(p => p.id));
        const ghNameSet = new Set(ghProj.map(p => (p.name || '').toLowerCase().trim()));

        const localOnly = (localProjectsData as any[]).filter((p: any) => {
          if (p.source !== 'local') return false; 
          if (p.github_id && ghIdSet.has(p.github_id)) return false;
          if (ghNameSet.has((p.name || '').toLowerCase().trim())) return false;
          return true;
        }).map((p: any) => ({
          ...p,
          source: 'github_project',
        }));

        const projectsList = [...ghProj, ...localOnly];
        setAllProjects(projectsList);
        setProjects(mainTab === 'repos' ? repos : projectsList);
      }
    } catch (error: any) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!onlyProjects) {
      setProjects(mainTab === 'repos' ? allRepos : allProjects);
    }
  }, [mainTab, allRepos, allProjects]);
  
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle.trim()) return;
    
    setCreating(true);
    try {
      const repoName = selectedProject.repo_name || selectedProject.name;
      await api.git.createIssue({
        title: newIssueTitle,
        body: newIssueBody,
      }, repoName);
      
      setNewIssueTitle("");
      setNewIssueBody("");
      setShowNewIssueForm(false);
      fetchRepoData(); // Refresh the list
      toast({
        title: "Issue created",
        description: "Your issue has been successfully created on GitHub.",
      });
    } catch (error) {
      console.error("Failed to create issue:", error);
      toast({
        title: "Error",
        description: "Failed to create issue on GitHub.",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const fetchGitHubRepos = async () => {
    setLoadingRepos(true);
    try {
      const response = await api.git.getRepos();
      setRepos(response as GitHubRepo[]);
    } catch (error) {
      console.error("Failed to fetch GitHub repos:", error);
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchGitHubProjects = async () => {
    setLoadingGhProjects(true);
    try {
      const response = await api.git.getProjects();
      setGhProjects(response as GitHubProject[]);
    } catch (error) {
      console.error("Failed to fetch GitHub projects:", error);
    } finally {
      setLoadingGhProjects(false);
    }
  };

  const startWizard = () => {
    setWizardStep('repository');
    setSelectedProject(null);
    fetchGitHubRepos();
    setSelectedRepo(null);
    setSelectedGhProject(null);
    setSelectedTemplate(null);
  };

  /** Opens a repository's code tab and loads branches + file tree */
  const openRepo = async (project: any, branch?: string) => {
    setSelectedProject(project);
    setRepoTab('code');
    setOpenedFile(null);
    setCurrentPath('');
    setFileSearch('');
    setShowGoToFile(false);
    setShowBranchDropdown(false);

    const owner = project.owner || project.repo_owner || 'prasad758';
    const repo = project.repo_name || project.name;
    const br = branch || selectedBranch;

    setIsLoadingTree(true);
    try {
      const [branchList, tree] = await Promise.all([
        api.git.getBranches(owner, repo) as Promise<any[]>,
        api.git.getRepoTree(owner, repo, br) as Promise<any[]>,
      ]);
      setBranches(branchList);
      setRepoTree(tree);
    } catch (err) {
      console.error('Failed to load repo data:', err);
      setRepoTree([]);
    } finally {
      setIsLoadingTree(false);
    }
  };

  /** Switch branch and reload tree */
  const switchBranch = async (branch: string) => {
    setSelectedBranch(branch);
    setShowBranchDropdown(false);
    setBranchSearch('');
    setOpenedFile(null);
    setCurrentPath('');
    if (!selectedProject) return;
    const owner = (selectedProject as any).owner || 'prasad758';
    const repo = (selectedProject as any).repo_name || (selectedProject as any).name;
    setIsLoadingTree(true);
    try {
      const tree = await api.git.getRepoTree(owner, repo, branch) as any[];
      setRepoTree(tree);
    } catch (err) {
      console.error('Failed to reload tree:', err);
    } finally {
      setIsLoadingTree(false);
    }
  };

  /** Open a file in the viewer */
  const openFile = async (filePath: string) => {
    if (!selectedProject) return;
    const owner = (selectedProject as any).owner || 'prasad758';
    const repo = (selectedProject as any).repo_name || (selectedProject as any).name;
    setIsLoadingFile(true);
    setOpenedFile(null);
    setShowGoToFile(false);
    try {
      const file = await api.git.getFileContent(owner, repo, filePath, selectedBranch) as any;
      setOpenedFile(file);
      setCurrentPath(filePath);
    } catch (err) {
      console.error('Failed to load file:', err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  /** Search files */
  const handleFileSearch = async (q: string) => {
    setFileSearch(q);
    if (!q || !selectedProject) { setFileSearchResults([]); return; }
    const owner = (selectedProject as any).owner || 'prasad758';
    const repo = (selectedProject as any).repo_name || (selectedProject as any).name;
    try {
      const results = await api.git.searchRepoFiles(owner, repo, q, selectedBranch) as any[];
      setFileSearchResults(results);
    } catch (err) {
      setFileSearchResults([]);
    }
  };


  // Open wizard directly on the Create project (templates) step — used by Projects tab
  const startProjectWizard = () => {
    setSelectedProject(null);
    setSelectedRepo(null);
    setSelectedGhProject('new');
    setSelectedTemplate(null);
    setWizardStep('templates');
  };

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setNewProjectForm({ ...newProjectForm, name: repo.name });
    setWizardStep('templates');
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await api.projects.create({
        ...newRepoForm,
        createRepo: true
      }) as any;
      
      const repoData = {
        id: Date.now(), // Fallback ID
        name: newRepoForm.name,
        description: newRepoForm.description,
        private: newRepoForm.visibility === 'private',
        html_url: `https://github.com/${newRepoForm.name}` // Approx
      };
      
      setSelectedRepo(repoData);
      setNewProjectForm({ ...newProjectForm, name: newRepoForm.name });
      setWizardStep('templates');
      toast({ title: "Success", description: "Repository created successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!selectedIssue || !commentText || !selectedProject) return;
    
    try {
      // 1. Sync with GitHub
      await api.git.addComment(
        String(selectedIssue.iid || selectedIssue.id), 
        commentText, 
        selectedIssue.repository || selectedProject.repo_name || selectedProject.name
      );
      
      // 2. Update local state for immediate feedback
      const newComment = {
        id: Date.now(),
        author: 'prasad758',
        text: commentText,
        time: 'just now'
      };
      setIssueComments({
        ...issueComments,
        [selectedIssue.id]: [...(issueComments[selectedIssue.id] || []), newComment]
      });
      setCommentText("");
      
      toast({ title: "Success", description: "Comment posted to GitHub!" });
    } catch (error: any) {
      console.error("GitHub sync failed:", error);
      toast({ title: "GitHub Sync Error", description: "Failed to post to GitHub, but saved locally.", variant: "destructive" });
      
      // Still add locally if GitHub fails
      const newComment = { id: Date.now(), author: 'prasad758', text: commentText, time: 'just now' };
      setIssueComments({ ...issueComments, [selectedIssue.id]: [...(issueComments[selectedIssue.id] || []), newComment] });
      setCommentText("");
    }
  };

  const toggleLabel = async (label: string) => {
    if (!selectedIssue || !selectedProject) return;
    
    const currentLabels = issueLabels[selectedIssue.id] || [];
    const isAdding = !currentLabels.includes(label);
    const newLabels = isAdding
      ? [...currentLabels, label]
      : currentLabels.filter(l => l !== label);
      
    try {
      // Sync with GitHub
      await api.git.updateIssue(
        String(selectedIssue.id), 
        { labels: newLabels },
        selectedProject.repo_name || selectedProject.name
      );
      
      setIssueLabels({ ...issueLabels, [selectedIssue.id]: newLabels });
      toast({ title: "Labels synced", description: `Label "${label}" ${isAdding ? 'added' : 'removed'} on GitHub.` });
    } catch (error: any) {
      console.error("GitHub label sync failed:", error);
      setIssueLabels({ ...issueLabels, [selectedIssue.id]: newLabels });
    }
  };

  const handleFinalSubmit = async () => {
    setCreating(true);
    try {
      const payload = {
        name: newProjectForm.name,
        description: newProjectForm.description,
        repo_name: selectedRepo?.name || (newProjectForm as any).repo_name,
        github_project_id: selectedGhProject === 'new' ? undefined : (selectedGhProject as any)?.id,
        template: selectedTemplate,
        import_items: importItems,
        import_type: importType,
        createRepo: createOnGithub,
        createGithubProject: createGithubProject,  // ← controls GitHub Project V2 creation
      };

      // Capture repo_name BEFORE the API call so it's always available in the closure
      const payloadRepoName = payload.repo_name;
      const created: any = await api.projects.create(payload);

      // If import is checked, trigger a sync for this repo
      if (importItems && selectedRepo) {
        toast({ title: "Syncing...", description: "Importing items from repository..." });
        await api.git.syncIssues(); 
      }
      
      toast({ 
        title: "✅ Project Created!", 
        description: `"${newProjectForm.name}" created with ${selectedTemplate} template.` 
      });

      setWizardStep('list');

      // Wait 2 s for GitHub API to reflect the newly linked project before re-fetching
      await new Promise(r => setTimeout(r, 2000));
      await fetchProjects();

      // Refresh the repo's project list if opened from a repo's Projects tab.
      // Use payloadRepoName (captured before state changes) for reliability.
      const refRepo = wizardOriginRepoRef.current;
      const refreshRepo = refRepo || (payloadRepoName && selectedRepo?.name === payloadRepoName ? selectedRepo : null);
      console.log('🔍 refreshRepo =', refreshRepo, '| payloadRepoName =', payloadRepoName);
      if (payloadRepoName) {
        const owner = 'prasad758';
        const repo = payloadRepoName;
        console.log(`🔄 Refreshing repo projects for: ${owner}/${repo}`);
        wizardOriginRepoRef.current = null;
        setWizardOriginRepo(null);
        setRepoProjectsLoading(true);
        api.git.getRepoProjects(owner, repo)
          .then((data: any[]) => { setRepoProjects(data); })
          .catch((e) => console.error('getRepoProjects error:', e))
          .finally(() => setRepoProjectsLoading(false));
      }

      // Auto-open the board (only when NOT coming from a repo's Projects tab)
      if (created?.github_id && !payloadRepoName) {
        openProjectBoard({
          ...created,
          id: created.github_id,
          source: 'github_project',
          template: selectedTemplate,
        });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const filteredRepos = repos.filter(r => r.name.toLowerCase().includes(repoSearch.toLowerCase()));

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
        </div>
      </div>
    );
  }

  if (selectedBoard) {
    return (
      <div className="flex flex-col h-full bg-white min-h-screen">
        {/* Project Board Header */}
        <div className="bg-[#f6f8fa] border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Github className="w-4 h-4" />
              <div className="flex items-center gap-1 text-blue-600 font-normal">
                <span className="hover:underline cursor-pointer" onClick={() => { setSelectedBoard(null); setSelectedProject(null); }}>prasad758</span>
                <span className="text-gray-400">/</span>
                <span className="hover:underline cursor-pointer" onClick={() => setSelectedBoard(null)}>Projects</span>
                <span className="text-gray-400">/</span>
                <span className="font-bold text-gray-900">@prasad758's {selectedBoard.name || 'untitled project'} project</span>
                <Lock className="w-3 h-3 text-gray-400 ml-1" />
              </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                 <Input placeholder="Type / to search" className="pl-9 h-7 w-48 bg-white border-gray-300 text-[10px]" />
               </div>
               <div className="flex items-center gap-2">
                 <Bell className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer" />
                 <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">P</div>
               </div>
            </div>
          </div>
        </div>

        {/* Board Toolbar */}
        <div className="border-b px-6 py-2 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold flex items-center gap-2">
               <Layout className="w-5 h-5" /> @prasad758's {selectedBoard.name || 'untitled project'} project
             </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs bg-gray-50 border-gray-200 font-bold"
              onClick={() => handleToolbarAction("Status Update")}
            >
              Add status update
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="Sync with GitHub"
              className="h-7 text-xs bg-gray-50 border-gray-200 font-bold flex items-center gap-1"
              onClick={() => refreshBoardItems()}
              disabled={isSyncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
            <div className="flex items-center border rounded-md overflow-hidden h-7 text-xs">
              <button 
                className="px-3 py-1 hover:bg-gray-50 border-r flex items-center gap-1 font-bold"
                onClick={() => handleToolbarAction("Insights")}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Insights
              </button>
              <button 
                className="px-3 py-1 hover:bg-gray-50 border-r flex items-center gap-1 font-bold"
                onClick={() => handleToolbarAction("Workflows")}
              >
                Workflows <span className="bg-gray-100 px-1.5 rounded-full ml-1 text-[10px]">6</span>
              </button>
              <button className="px-2 py-1 hover:bg-gray-50">
                <Settings className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 border hover:bg-gray-50"
              onClick={() => handleToolbarAction("Project Settings")}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Views Bar */}
        <div className="px-6 border-b flex items-center gap-2 bg-[#f6f8fa] min-h-[40px] relative z-20">
          {projectViews.map(view => (
            <div key={view.id} className="relative">
              <div 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md border cursor-pointer transition-colors text-xs font-bold whitespace-nowrap ${
                  activeViewId === view.id 
                  ? 'bg-white border-b-white -mb-px text-gray-900 border-gray-200 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:bg-gray-100'
                }`}
                onClick={() => {
                   setActiveViewId(view.id);
                   if (activeViewId === view.id) setShowViewMenuId(showViewMenuId === view.id ? null : view.id);
                }}
              >
                {view.layout === 'table' ? <TableIcon className="w-3.5 h-3.5" /> : view.layout === 'board' ? <Kanban className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                
                {isRenamingView === view.id ? (
                  <Input 
                    autoFocus
                    className="h-5 w-24 text-[10px] p-1 font-bold"
                    value={tempViewName}
                    onChange={(e) => setTempViewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveViewName()}
                    onBlur={saveViewName}
                  />
                ) : (
                  view.name
                )}
                
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
              </div>

              {/* Existing View Management Dropdown */}
              {showViewMenuId === view.id && (
                <div 
                  className="absolute top-full left-0 mt-1 w-52 bg-white border rounded-md shadow-lg z-50 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Management</div>
                  <button 
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 text-gray-700"
                    onClick={(e) => { e.stopPropagation(); handleRenameView(view.id); }}
                  >
                    <FileText className="w-3.5 h-3.5" /> Rename view
                  </button>
                  <button 
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 text-gray-700"
                    onClick={(e) => { e.stopPropagation(); handleToolbarAction("Move View"); setShowViewMenuId(null); }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Move view
                  </button>
                  <button 
                    onClick={(e) => {
                       e.stopPropagation();
                       const id = projectViews.length + 1;
                       setProjectViews([...projectViews, { ...view, id, name: `${view.name} copy` }]);
                       setActiveViewId(id);
                       setShowViewMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 text-gray-700"
                  >
                    <Layers className="w-3.5 h-3.5" /> Duplicate view
                  </button>
                  <button 
                    onClick={(e) => {
                       e.stopPropagation();
                       if (projectViews.length > 1) {
                         const filtered = projectViews.filter(v => v.id !== view.id);
                         setProjectViews(filtered);
                         setActiveViewId(filtered[0].id);
                       }
                       setShowViewMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete view
                  </button>
                  
                  <div className="border-t my-1" />
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Layout</div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const newViews = projectViews.map(v => v.id === view.id ? { ...v, layout: 'table' } : v);
                      setProjectViews(newViews);
                      setShowViewMenuId(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 ${view.layout === 'table' ? 'bg-blue-50 text-blue-600 font-bold' : ''}`}
                  >
                    <TableIcon className="w-3.5 h-3.5" /> Table
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const newViews = projectViews.map(v => v.id === view.id ? { ...v, layout: 'board' } : v);
                      setProjectViews(newViews);
                      setShowViewMenuId(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 ${view.layout === 'board' ? 'bg-blue-50 text-blue-600 font-bold' : ''}`}
                  >
                    <Kanban className="w-3.5 h-3.5" /> Board
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const newViews = projectViews.map(v => v.id === view.id ? { ...v, layout: 'roadmap' } : v);
                      setProjectViews(newViews);
                      setShowViewMenuId(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 ${view.layout === 'roadmap' ? 'bg-blue-50 text-blue-600 font-bold' : ''}`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Roadmap
                  </button>

                  <div className="border-t my-1" />
                  <button 
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 text-gray-700"
                    onClick={(e) => { e.stopPropagation(); setShowViewMenuId(null); }}
                  >
                    <BarChart2 className="w-3.5 h-3.5" /> Generate chart
                  </button>
                  <button 
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 text-gray-700"
                    onClick={(e) => { e.stopPropagation(); setShowViewMenuId(null); }}
                  >
                    <ArrowRight className="w-3.5 h-3.5 rotate-90" /> Export view data
                  </button>
                </div>
              )}
            </div>
          ))}
          
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-gray-500 font-normal hover:bg-gray-200"
              onClick={() => setShowNewViewMenu(!showNewViewMenu)}
            >
              <Plus className="w-3 h-3 mr-1" /> New view
            </Button>
            
            {/* New View Layout Selector Dropdown */}
            {showNewViewMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-50 py-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Layout</div>
                <button 
                  onClick={() => {
                    const id = projectViews.length + 1;
                    setProjectViews([...projectViews, { id, name: `View ${id}`, layout: 'table' }]);
                    setActiveViewId(id);
                    setShowNewViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100"
                >
                  <TableIcon className="w-3.5 h-3.5" /> Table
                </button>
                <button 
                  onClick={() => {
                    const id = projectViews.length + 1;
                    setProjectViews([...projectViews, { id, name: `View ${id}`, layout: 'board' }]);
                    setActiveViewId(id);
                    setShowNewViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100"
                >
                  <Kanban className="w-3.5 h-3.5" /> Board
                </button>
                <button 
                  onClick={() => {
                    const id = projectViews.length + 1;
                    setProjectViews([...projectViews, { id, name: `View ${id}`, layout: 'roadmap' }]);
                    setActiveViewId(id);
                    setShowNewViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100"
                >
                  <Calendar className="w-3.5 h-3.5" /> Roadmap
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Content based on View Layout */}
        <div className="flex-1 overflow-auto bg-white">
          {projectViews.find(v => v.id === activeViewId)?.layout === 'table' ? (
            <div className="p-4 space-y-4">
              <div className="relative max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Filter by keyword or by field" className="pl-10 h-9 border-gray-300 text-sm shadow-sm focus-visible:ring-blue-500" />
                <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1">
                   <div className="h-full px-2 flex items-center border rounded-md bg-gray-50 text-[10px] font-bold gap-1 cursor-pointer hover:bg-gray-100">
                      <Layout className="w-3 h-3" /> View
                   </div>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#f6f8fa] border-b text-gray-500 font-semibold">
                    <tr>
                      <th className="p-2 border-r w-10 text-center bg-[#f6f8fa]"><input type="checkbox" className="rounded-sm" /></th>
                      <th className="p-2 border-r min-w-[300px]">Title</th>
                      <th className="p-2 border-r w-8 text-center text-gray-400 font-normal">...</th>
                      <th className="p-2 border-r w-40">Assignees</th>
                      <th className="p-2 border-r w-8 text-center text-gray-400 font-normal">...</th>
                      <th className="p-2 border-r w-32">Status</th>
                      <th className="p-2 border-r w-8 text-center text-gray-400 font-normal">...</th>
                      <th className="p-2 border-r w-40">Linked pull requests</th>
                      <th className="p-2 border-r w-8 text-center text-gray-400 font-normal">...</th>
                      <th className="p-2">Sub-issues progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {boardItems.map(item => (
                       <tr key={item.id} className="hover:bg-gray-50/80 group h-10">
                         <td className="p-2 text-center text-gray-300 font-bold border-r"><input type="checkbox" className="rounded-sm" /></td>
                         <td className="p-2 border-r font-medium text-gray-900">{item.title}</td>
                         <td className="p-2 border-r text-center text-gray-300">...</td>
                         <td className="p-2 border-r">
                           <div className="flex -space-x-1">
                             {item.assignees.map((a, i) => (
                               <div key={i} className="w-5 h-5 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[8px] text-white font-bold">{a}</div>
                             ))}
                           </div>
                         </td>
                         <td className="p-2 border-r text-center text-gray-300">...</td>
                         <td className="p-2 border-r">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                             item.status === 'Done' ? 'bg-green-100 text-green-700' : 
                             item.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                           }`}>
                             {item.status}
                           </span>
                         </td>
                         <td className="p-2 border-r text-center text-gray-300">...</td>
                         <td className="p-2 border-r">
                           {item.prs > 0 && <span className="flex items-center gap-1 text-gray-500"><GitPullRequest className="w-3 h-3" /> {item.prs}</span>}
                         </td>
                         <td className="p-2 border-r text-center text-gray-300">...</td>
                         <td className="p-2">
                           <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                             <div className="bg-green-500 h-full w-1/3" />
                           </div>
                         </td>
                       </tr>
                     ))}
                     <tr className="hover:bg-gray-50/80 group">
                       <td className="p-2 text-center text-gray-300 font-bold">+</td>
                       <td className="p-2 text-gray-400 font-normal italic" colSpan={9}>
                         {isAddingItem ? (
                           <div className="flex items-center gap-2">
                             <Input 
                               autoFocus
                               placeholder="Item title" 
                               className="h-7 text-xs border-blue-400 ring-1 ring-blue-400"
                               value={newItemTitle}
                               onChange={(e) => setNewItemTitle(e.target.value)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' && newItemTitle) {
                                   handleAddItem(newItemTitle, 'Todo');
                                 } else if (e.key === 'Escape') {
                                   setIsAddingItem(false);
                                 }
                               }}
                             />
                           </div>
                         ) : (
                           <div className="cursor-text w-full" onClick={() => setIsAddingItem(true)}>
                             Add item...
                           </div>
                         )}
                       </td>
                     </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : projectViews.find(v => v.id === activeViewId)?.layout === 'board' ? (
            // Dynamic board columns derived from GitHub Project Status field options
            (() => {
              // Use GitHub's actual Status field options, fall back to Kanban defaults
              const boardColumns = projectFields?.options?.map((o: any) => o.name) || ['Todo', 'In Progress', 'Done'];
              // Color map for column header dots
              const COL_COLOR: Record<string, string> = {
                'Todo': 'bg-gray-400', 'Backlog': 'bg-gray-400', 'New': 'bg-gray-400',
                'Planning': 'bg-gray-400', 'Planned': 'bg-gray-400', 'Went Well': 'bg-emerald-400',
                'In Progress': 'bg-blue-500', 'Current Sprint': 'bg-blue-500', 'Building': 'bg-blue-500',
                'Review': 'bg-orange-400', 'Confirmed': 'bg-orange-400', 'Ready': 'bg-cyan-400',
                'Testing': 'bg-yellow-500', 'Improve': 'bg-red-400', 'Action Items': 'bg-red-500',
                'Done': 'bg-green-500', 'Released': 'bg-green-500', 'Fixed': 'bg-green-500',
                'Launched': 'bg-green-500', 'Verified': 'bg-green-500',
              };
              const COL_CARD_COLOR: Record<string, string> = {
                'Done': 'border-l-green-400', 'Released': 'border-l-green-400', 'Fixed': 'border-l-green-400',
                'In Progress': 'border-l-blue-400', 'Review': 'border-l-orange-400',
              };
              return (
                <div className="p-6 h-full bg-gray-50/30 overflow-x-auto flex gap-4">
                  {boardColumns.map(status => (
                    <div
                      key={status}
                      className={`w-72 flex-shrink-0 flex flex-col gap-3 transition-all duration-150 ${
                        dragOverColumn === status ? 'ring-2 ring-blue-400 ring-offset-2 rounded-xl bg-blue-50/40' : ''
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverColumn(status); }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null);
                      }}
                      onDrop={(e) => { e.preventDefault(); handleDrop(status); }}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${COL_COLOR[status] || 'bg-gray-400'}`} />
                          <h3 className="font-bold text-sm text-gray-900">{status}</h3>
                          <span className="bg-gray-200/60 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-gray-500">
                            {boardItems.filter(i => i.status === status).length}
                          </span>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </div>

                      {/* Cards */}
                      <div className="space-y-2">
                        {boardItems.filter(i => i.status === status).map(item => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => {
                              setDraggedItem(item);
                              e.dataTransfer.effectAllowed = 'move';
                              setTimeout(() => { (e.target as HTMLElement).style.opacity = '0.4'; }, 0);
                            }}
                            onDragEnd={(e) => {
                              (e.target as HTMLElement).style.opacity = '1';
                              setDraggedItem(null);
                              setDragOverColumn(null);
                            }}
                            className={`bg-white p-3 rounded-lg border-l-4 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group transition-all duration-100 border border-gray-200 ${
                              COL_CARD_COLOR[status] || 'border-l-gray-200'
                            } ${
                              draggedItem?.id === item.id ? 'opacity-40 scale-95' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-xs font-bold text-gray-900 leading-tight">{item.title}</h4>
                              <Plus className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 shrink-0" />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {item.prs > 0 && <span className="flex items-center gap-1 text-[10px] text-gray-500"><GitPullRequest className="w-2.5 h-2.5" /> {item.prs}</span>}
                              </div>
                              <div className="w-5 h-5 rounded-full bg-blue-600 border flex items-center justify-center text-[8px] text-white font-bold">P</div>
                            </div>
                          </div>
                        ))}

                        {/* Empty column drop target */}
                        {draggedItem && dragOverColumn === status && boardItems.filter(i => i.status === status).length === 0 && (
                          <div className="h-16 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50 flex items-center justify-center">
                            <span className="text-xs text-blue-400 font-bold">Drop here</span>
                          </div>
                        )}

                        {/* Add item input */}
                        {boardAddingStatus === status ? (
                          <div className="bg-white p-2 rounded-lg border border-blue-400 shadow-sm">
                            <Input
                              autoFocus
                              placeholder="Item title"
                              className="h-7 text-xs border-none focus-visible:ring-0 p-1"
                              value={newItemTitle}
                              onChange={(e) => setNewItemTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newItemTitle) {
                                  handleAddItem(newItemTitle, status);
                                } else if (e.key === 'Escape') {
                                  setBoardAddingStatus(null);
                                }
                              }}
                              onBlur={() => { if (!newItemTitle) setBoardAddingStatus(null); }}
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-8 text-[11px] text-gray-500 font-bold hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setBoardAddingStatus(status)}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add item
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <div className="h-full bg-white flex flex-col overflow-hidden">
               {/* Roadmap Header/Toolbar - GitHub Parity */}
               <div className="border-b p-3 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer text-xs text-gray-600">
                        <MapPin className="w-3.5 h-3.5" /> Markers
                     </div>
                     <div className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer text-xs text-gray-600">
                        <ArrowUpDown className="w-3.5 h-3.5" /> Sort
                     </div>
                     <div className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5" /> Date fields
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer text-xs text-gray-600">
                        <Plus className="w-3.5 h-3.5" /> Month
                     </div>
                     <div className="px-2 py-1 hover:bg-gray-100 rounded cursor-pointer text-xs text-gray-600 font-bold">Today</div>
                     <div className="flex items-center border rounded-md">
                        <button className="p-1 hover:bg-gray-100 border-r"><ChevronLeft className="w-4 h-4" /></button>
                        <button className="p-1 hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
                     </div>
                     <Button size="sm" variant="default" className="h-7 text-[10px] font-bold bg-blue-600" onClick={handleAddDates}>
                        Add dates to start
                     </Button>
                  </div>
               </div>

               {/* Timeline Content - Split Layout */}
               <div className="flex-1 flex overflow-hidden">
                  {/* Left Sidebar - Item Titles */}
                  <div className="w-80 border-r flex flex-col bg-white">
                     <div className="h-10 border-b flex items-center px-4 bg-gray-50/50">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">March 2026</span>
                     </div>
                     <div className="flex-1 overflow-y-auto">
                        {boardItems.map(item => (
                           <div key={item.id} className="h-10 border-b flex items-center px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer truncate">
                              {item.title}
                           </div>
                        ))}
                        <button className="h-10 w-full flex items-center px-4 text-xs text-gray-500 hover:text-blue-600 transition-colors gap-2">
                           <Plus className="w-3.5 h-3.5" /> Add item
                        </button>
                     </div>
                  </div>

                  {/* Right Sidebar - Timeline Grid */}
                  <div className="flex-1 overflow-auto bg-white relative no-scrollbar">
                     {/* Day Header */}
                     <div className="h-10 border-b flex min-w-[2000px] sticky top-0 bg-white z-10">
                        {Array.from({ length: 31 }).map((_, i) => (
                           <div key={i} className="w-12 border-r flex items-center justify-center text-[10px] text-gray-400">
                              {i + 1}
                           </div>
                        ))}
                     </div>

                     {/* Rows with Bars */}
                     <div className="relative min-w-[2000px]">
                        {boardItems.map((item, idx) => {
                           const startDay = parseInt(item.start?.split('-')[2] || '1');
                           const duration = (parseInt(item.end?.split('-')[2] || '5') - startDay) + 1;
                           
                           return (
                              <div key={item.id} className="h-10 border-b relative group">
                                 {/* Task Bar */}
                                 <div 
                                    className={`absolute top-1.5 h-7 rounded-md shadow-sm border flex items-center px-2 gap-2 transition-all cursor-pointer hover:ring-2 ring-blue-400/30 ${
                                       item.status === 'Done' ? 'bg-green-100 border-green-300 text-green-700' : 
                                       item.status === 'In Progress' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700'
                                    }`}
                                    style={{ 
                                       left: `${(startDay - 1) * 48}px`,
                                       width: `${duration * 48}px`,
                                       zIndex: 5
                                    }}
                                 >
                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                    <span className="text-[10px] font-bold truncate">Scheduled</span>
                                 </div>

                                 {/* Row Grid Lines */}
                                 <div className="absolute inset-0 flex pointer-events-none">
                                    {Array.from({ length: 31 }).map((_, i) => (
                                       <div key={i} className="w-12 border-r h-full opacity-[0.03] border-black" />
                                    ))}
                                 </div>
                              </div>
                           );
                        })}
                        
                        {/* Current Day Marker */}
                        <div className="absolute top-0 bottom-0 left-[480px] w-0.5 bg-red-400 z-20 pointer-events-none">
                           <div className="w-2 h-2 rounded-full bg-red-400 absolute -top-1 -left-[3px]" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50/30">
          <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium" onClick={() => setSelectedBoard(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project
          </Button>
        </div>
      </div>
    );
  }

  // When the wizard is open, skip the repo detail view so the main return renders
  // (the wizard Dialog lives in the main return; this avoids duplicating all wizard JSX)
  if (selectedProject && wizardStep === 'list') {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* GitHub Style Repo Header */}
        <div className="bg-[#f6f8fa] border-b pt-4 px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xl">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 font-normal text-blue-600">
                <span className="hover:underline cursor-pointer">prasad758</span>
                <span className="text-gray-400">/</span>
                <span className="font-bold text-gray-900 hover:underline cursor-pointer">{selectedProject.name}</span>
              </div>
              <span className="text-xs px-2 py-0.5 border rounded-full text-muted-foreground font-medium bg-white ml-2">
                {selectedProject.visibility === 'public' ? 'Public' : 'Private'}
              </span>
            </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-md overflow-hidden bg-white text-xs h-7">
                  <button className="flex items-center gap-1 px-3 py-1 hover:bg-gray-50 border-r font-bold">
                    <GitBranch className="w-3.5 h-3.5" /> {selectedBranch} <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center border rounded-md overflow-hidden bg-white text-xs">
                <button className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50 border-r">
                  <Eye className="w-3.5 h-3.5" /> Watch <span className="bg-gray-100 px-1.5 rounded-full ml-1 font-bold">0</span> <ChevronDown className="w-3 h-3" />
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50 border-r">
                  <GitFork className="w-3.5 h-3.5" /> Fork <span className="bg-gray-100 px-1.5 rounded-full ml-1 font-bold">0</span> <ChevronDown className="w-3 h-3" />
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                  <Star className="w-3.5 h-3.5" /> Star <span className="bg-gray-100 px-1.5 rounded-full ml-1 font-bold">0</span> <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 -mb-px">
            {[
              { id: 'code', label: 'Code', icon: <Code2 className="w-4 h-4" /> },
              { id: 'issues', label: 'Issues', icon: <CircleDot className="w-4 h-4" /> },
              { id: 'pulls', label: 'Pull requests', icon: <GitPullRequest className="w-4 h-4" /> },
              { id: 'projects', label: 'Projects', icon: <Layout className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRepoTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-all border-b-2 ${
                  repoTab === tab.id 
                    ? 'border-[#fd8c73] font-semibold text-gray-900' 
                    : 'border-transparent text-gray-600 hover:bg-gray-200/50 hover:border-gray-300'
                }`}
              >
                <span className="opacity-70">{tab.icon}</span>
                {tab.label}
                {tab.id === 'issues' && <span className="bg-gray-200/80 px-1.5 rounded-full text-[10px] font-bold">{isRepoLoading ? '...' : repoIssues.length}</span>}
                {tab.id === 'pulls' && <span className="bg-gray-200/80 px-1.5 rounded-full text-[10px] font-bold">{isRepoLoading ? '...' : repoPRs.length}</span>}
                {tab.id === 'projects' && <span className="bg-gray-200/80 px-1.5 rounded-full text-[10px] font-bold">{repoProjectsLoading ? '...' : repoProjects.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 bg-white">
          {selectedIssue ? (
            <div className="max-w-6xl mx-auto py-4 space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between border-b pb-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-normal">
                    <span className="font-bold text-gray-900">{selectedIssue.title}</span> 
                    <span className="text-gray-400 ml-2 font-light">#{selectedIssue.id}</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1f883d] text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-sm">
                      <CircleDot className="w-4 h-4" /> Open
                    </span>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-bold text-gray-900 hover:underline cursor-pointer">prasad758</span> opened this issue {selectedIssue.time} · {selectedIssue.comments} comments
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 font-bold bg-[#f6f8fa] border-gray-300">Edit</Button>
                  <Button size="sm" className="h-8 bg-[#1f883d] hover:bg-[#1a7f37] font-bold">New issue</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                   {/* Timeline Item */}
                   <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm shrink-0 border-2 border-white">P</div>
                     <div className="flex-1 border rounded-lg overflow-hidden shadow-sm bg-white">
                        <div className="bg-[#f0f8ff] px-4 py-2 border-b flex items-center justify-between text-xs">
                          <p className="text-gray-600"><span className="font-bold text-gray-900">prasad758</span> opened this issue {selectedIssue.time}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-4 h-4" /></Button>
                        </div>
                        <div className="p-4 text-sm text-gray-900 font-medium">No description provided.</div>
                     </div>
                   </div>

                   {/* Existing Comments */}
                   {(issueComments[selectedIssue.id] || []).map(comment => (
                     <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-left-2">
                       <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm shrink-0 border-2 border-white">P</div>
                       <div className="flex-1 border rounded-lg overflow-hidden shadow-sm bg-white">
                          <div className="bg-[#f6f8fa] px-4 py-2 border-b flex items-center justify-between text-xs">
                            <p className="text-gray-600"><span className="font-bold text-gray-900">{comment.author}</span> commented {comment.time}</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-4 h-4" /></Button>
                          </div>
                          <div className="p-4 text-sm text-gray-900 whitespace-pre-wrap">{comment.text}</div>
                       </div>
                     </div>
                   ))}

                   {/* Add Comment */}
                   <div className="flex gap-4 pt-4 border-t-2 border-dashed">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm shrink-0">P</div>
                      <div className="flex-1 space-y-3">
                         <h3 className="text-sm font-bold">Add a comment</h3>
                         <div className="border rounded-lg overflow-hidden shadow-md bg-white ring-1 ring-black/[0.03]">
                            <div className="bg-[#f6f8fa] border-b flex items-center px-4">
                               <div className="flex -mb-px">
                                  <button className="px-4 py-2 text-xs font-bold border-x border-t bg-white rounded-t-md -mb-px">Write</button>
                                  <button className="px-4 py-2 text-xs text-gray-500 hover:text-gray-900">Preview</button>
                               </div>
                               <div className="flex-1 flex justify-end items-center gap-3 text-gray-400">
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><Plus className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><Bold className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><Italic className="w-4 h-4" /></Button>
                                  <div className="w-px h-4 bg-gray-300 mx-1" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><Code2 className="w-4 h-4" /></Button>
                               </div>
                            </div>
                            <div className="p-4">
                               <Textarea 
                                 placeholder="Use Markdown to format your comment" 
                                 className="min-h-[150px] border-none focus-visible:ring-0 resize-none p-0 text-sm"
                                 value={commentText}
                                 onChange={(e) => setCommentText(e.target.value)}
                               />
                               <div className="mt-4 pt-4 border-t flex items-center text-[10px] text-muted-foreground">
                                  <Paperclip className="w-3.5 h-3.5 mr-2" /> 
                                  <label className="hover:text-blue-600 cursor-pointer">
                                    Paste, drop, or click to add files
                                    <input type="file" className="hidden" onChange={() => toast({ title: "File uploaded", description: "Your image has been attached." })} />
                                  </label>
                               </div>
                            </div>
                            <div className="bg-[#f6f8fa] border-t p-3 flex justify-end gap-2">
                               <div className="flex items-center border rounded-md overflow-hidden bg-white shadow-sm">
                                  <Button variant="ghost" size="sm" className="h-8 text-xs font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Close issue
                                  </Button>
                                  <div className="w-px h-5 bg-gray-200" />
                                  <Button variant="ghost" size="icon" className="h-8 w-6"><ChevronDown className="w-3 h-3" /></Button>
                               </div>
                               <Button 
                                 className="h-8 bg-[#1f883d] hover:bg-[#1a7f37] font-bold shadow-sm px-4"
                                 onClick={handleCommentSubmit}
                                 disabled={!commentText}
                               >
                                 Comment
                               </Button>
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="pl-14 pt-4">
                     <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600" onClick={() => setSelectedIssue(null)}>
                       <ArrowLeft className="w-4 h-4 mr-2" /> Back to issues
                     </Button>
                   </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <div className="border-b pb-4 group relative">
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-gray-600 hover:text-blue-600 cursor-pointer">Labels</span>
                      <Settings className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(issueLabels[selectedIssue.id] || []).length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No labels</p>
                      ) : (
                        (issueLabels[selectedIssue.id] || []).map(label => (
                          <span key={label} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200">{label}</span>
                        ))
                      )}
                    </div>
                    <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {['bug', 'enhancement', 'priority'].map(l => (
                        <button 
                          key={l}
                          onClick={() => toggleLabel(l)}
                          className="text-[9px] px-1.5 py-0.5 border rounded hover:bg-gray-100 font-bold uppercase tracking-wider"
                        >
                          + {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {[
                    { label: 'Assignees', value: 'No one — Assign yourself' },
                    { label: 'Projects', value: 'No projects' },
                    { label: 'Milestone', value: 'No milestone' },
                    { label: 'Relationships', value: 'None yet' },
                  ].map(field => (
                    <div key={field.label} className="border-b pb-4 group">
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <span className="text-gray-600 hover:text-blue-600 cursor-pointer">{field.label}</span>
                        <Settings className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{field.value}</p>
                    </div>
                  ))}
                  
                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-gray-600">Development</span>
                      <Settings className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer" />
                    </div>
                    <p className="text-[11px] text-blue-600 hover:underline cursor-pointer">Create a branch for this issue or link a pull request.</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold mb-2">
                      <span className="text-gray-600">Notifications</span>
                      <span className="text-blue-600 hover:underline cursor-pointer font-normal">Customize</span>
                    </div>
                    <Button variant="outline" className="w-full h-8 text-xs font-bold gap-2">
                       <Bell className="w-3.5 h-3.5" /> Unsubscribe
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2 italic text-center">You're receiving notifications because you're subscribed.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {repoTab === 'code' && (
                <div className="max-w-6xl mx-auto space-y-4">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 relative">
                      {/* Branch switcher */}
                      <Button
                        variant="outline" size="sm"
                        className="h-8 font-bold bg-[#f6f8fa] border-gray-300"
                        onClick={() => setShowBranchDropdown(v => !v)}
                      >
                        <GitBranch className="w-3.5 h-3.5 mr-1" /> {selectedBranch} <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                      {showBranchDropdown && (
                        <div className="absolute top-10 left-0 z-50 w-72 bg-white border rounded-lg shadow-xl">
                          <div className="p-2 border-b">
                            <div className="text-xs font-bold text-gray-600 mb-2">Switch branches/tags</div>
                            <input
                              autoFocus
                              className="w-full border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                              placeholder="Find or create a branch..."
                              value={branchSearch}
                              onChange={e => setBranchSearch(e.target.value)}
                            />
                          </div>
                          <div className="text-xs font-bold text-gray-500 px-3 pt-2">Branches</div>
                          <div className="max-h-60 overflow-y-auto py-1">
                            {branches
                              .filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()))
                              .map(b => (
                                <div
                                  key={b.name}
                                  className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${
                                    b.name === selectedBranch ? 'text-blue-600 font-bold' : ''
                                  }`}
                                  onClick={() => switchBranch(b.name)}
                                >
                                  {b.name === selectedBranch && <span className="text-blue-600">✓</span>}
                                  {b.name}
                                  {b.protected && <span className="ml-auto text-[10px] border px-1 rounded text-gray-400">protected</span>}
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground ml-2">
                        <span><span className="font-bold text-gray-900">{branches.length || 1}</span> branch{branches.length !== 1 ? 'es' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Go to file */}
                      <div className="relative">
                        <Button variant="outline" size="sm" className="h-8 font-bold" onClick={() => setShowGoToFile(v => !v)}>
                          <Search className="w-3.5 h-3.5 mr-1" /> Go to file
                        </Button>
                        {showGoToFile && (
                          <div className="absolute top-10 right-0 z-50 w-80 bg-white border rounded-lg shadow-xl">
                            <div className="p-2">
                              <input
                                autoFocus
                                className="w-full border rounded px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                                placeholder="Search files..."
                                value={fileSearch}
                                onChange={e => handleFileSearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-64 overflow-y-auto border-t">
                              {fileSearchResults.length === 0 && fileSearch && (
                                <div className="p-3 text-xs text-gray-400 text-center">No files found</div>
                              )}
                              {fileSearchResults.map(f => (
                                <div
                                  key={f.path}
                                  className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center gap-2"
                                  onClick={() => openFile(f.path)}
                                >
                                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate">{f.path}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button size="sm" className="h-8 bg-[#1f883d] hover:bg-[#1a7f37] font-bold text-white shadow-sm">
                        <Code2 className="w-4 h-4 mr-2" /> Code <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {/* File viewer */}
                  {openedFile ? (
                    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                      <div className="bg-[#f6f8fa] p-2 border-b flex items-center gap-2 text-xs">
                        <button className="text-blue-600 hover:underline font-bold" onClick={() => { setOpenedFile(null); setCurrentPath(''); }}>
                          ← Back
                        </button>
                        <span className="text-gray-400">/</span>
                        {currentPath.split('/').map((seg, i, arr) => (
                          <span key={i} className={i === arr.length - 1 ? 'font-bold text-gray-900' : 'text-blue-600 hover:underline cursor-pointer'}>{seg}{i < arr.length - 1 ? ' /' : ''}</span>
                        ))}
                      </div>
                      <div className="p-4">
                        {isLoadingFile ? (
                          <div className="p-10 text-center text-gray-400 animate-pulse">Loading file...</div>
                        ) : (
                          <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800 leading-relaxed max-h-[70vh] overflow-auto">
                            {openedFile.content}
                          </pre>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* File tree */
                    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                      {/* Commit bar */}
                      <div className="bg-[#f6f8fa] p-3 border-b flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-[10px]">P</div>
                          <span className="font-bold text-gray-900">{(selectedProject as any)?.owner || 'prasad758'}</span>
                          <span className="text-gray-500">Latest commit on {selectedBranch}</span>
                        </div>
                        <span className="text-gray-400">{new Date().toLocaleDateString()}</span>
                      </div>
                      {/* Breadcrumb if inside folder */}
                      {currentPath && (
                        <div className="px-3 py-2 border-b bg-gray-50 text-xs flex items-center gap-1">
                          <button className="text-blue-600 hover:underline font-bold" onClick={() => setCurrentPath('')}>root</button>
                          {currentPath.split('/').map((seg, i) => (
                            <span key={i}><span className="text-gray-400"> / </span><span className="font-bold text-gray-700">{seg}</span></span>
                          ))}
                        </div>
                      )}
                      <div className="divide-y text-sm">
                        {isLoadingTree ? (
                          <div className="p-10 text-center text-gray-400 animate-pulse">Loading files from GitHub...</div>
                        ) : repoTree.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 text-xs">No files found</div>
                        ) : (
                          // Show only top-level or current folder entries
                          (() => {
                            const prefix = currentPath ? currentPath + '/' : '';
                            const visible = repoTree
                              .filter(f => f.path.startsWith(prefix))
                              .map(f => ({ ...f, rel: f.path.slice(prefix.length) }))
                              .filter(f => !f.rel.includes('/') && f.rel !== '');
                            const folders = visible.filter(f => f.type === 'tree');
                            const files = visible.filter(f => f.type === 'blob');
                            return [...folders, ...files].map(f => (
                              <div
                                key={f.path}
                                className="p-3 flex items-center hover:bg-gray-50 group cursor-pointer"
                                onClick={() => {
                                  if (f.type === 'tree') {
                                    setCurrentPath(f.path);
                                  } else {
                                    openFile(f.path);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {f.type === 'tree'
                                    ? <Folder className="w-4 h-4 text-blue-400 fill-blue-400/20 shrink-0" />
                                    : <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                  }
                                  <span className="font-medium text-gray-900 hover:text-blue-600 hover:underline truncate">{f.rel}</span>
                                </div>
                                <div className="text-xs text-gray-400 w-24 text-right shrink-0">—</div>
                              </div>
                            ));
                          })()
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

          {repoTab === 'issues' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="is:issue state:open" className="pl-9 h-8 bg-[#f6f8fa] border-gray-300 text-sm focus-visible:ring-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 bg-[#f6f8fa] border-gray-300 font-medium">
                    <Tag className="w-3.5 h-3.5 mr-1" /> Labels <span className="bg-gray-200/80 px-1.5 rounded-full text-[10px] ml-1 font-bold">0</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 bg-[#f6f8fa] border-gray-300 font-medium">
                    <Milestone className="w-3.5 h-3.5 mr-1" /> Milestones <span className="bg-gray-200/80 px-1.5 rounded-full text-[10px] ml-1 font-bold">0</span>
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 bg-[#1f883d] hover:bg-[#1a7f37] font-bold"
                    onClick={() => setShowNewIssueForm(true)}
                  >
                    New issue
                  </Button>
                </div>
              </div>

              {showNewIssueForm && (
                <div className="bg-white border rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="bg-[#f6f8fa] p-3 border-b">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Github className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      Create new issue
                    </h3>
                  </div>
                  <form onSubmit={handleCreateIssue} className="p-4 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[12px] font-bold text-gray-700">Add a title *</Label>
                      <Input 
                        placeholder="Title" 
                        className="h-9 focus-visible:ring-blue-500"
                        value={newIssueTitle}
                        onChange={(e) => setNewIssueTitle(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12px] font-bold text-gray-700">Add a description</Label>
                      <div className="border rounded-md">
                        <div className="bg-[#f6f8fa] border-b px-3 py-1.5 flex items-center gap-4 text-xs font-medium">
                          <span className="text-blue-600 border-b-2 border-orange-500 pb-0.5">Write</span>
                          <span className="text-gray-500 hover:text-gray-900 cursor-pointer">Preview</span>
                          <div className="flex-1" />
                          <div className="flex items-center gap-2 text-gray-400">
                             <Bold className="w-3.5 h-3.5 hover:text-gray-600 cursor-pointer" />
                             <Italic className="w-3.5 h-3.5 hover:text-gray-600 cursor-pointer" />
                             <Code2 className="w-3.5 h-3.5 hover:text-gray-600 cursor-pointer" />
                             <Link2 className="w-3.5 h-3.5 hover:text-gray-600 cursor-pointer" />
                             <List className="w-3.5 h-3.5 hover:text-gray-600 cursor-pointer" />
                          </div>
                        </div>
                        <textarea 
                          className="w-full min-h-[150px] p-3 text-sm outline-none resize-none"
                          placeholder="Type your description here..."
                          value={newIssueBody}
                          onChange={(e) => setNewIssueBody(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button variant="ghost" size="sm" type="button" onClick={() => setShowNewIssueForm(false)}>Cancel</Button>
                      <Button 
                        size="sm" 
                        className="bg-[#1f883d] hover:bg-[#1a7f37] font-bold"
                        type="submit"
                        disabled={creating || !newIssueTitle.trim()}
                      >
                        {creating ? "Creating..." : "Submit new issue"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#f6f8fa] p-3 border-b flex items-center justify-between text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="flex items-center gap-1 text-gray-900 font-bold"><CircleDot className="w-3.5 h-3.5 text-green-600" /> Open {repoIssues.filter(i => i.state === 'open' || i.state === 'opened').length}</span>
                    <span className="flex items-center gap-1 opacity-60"><CheckCircle2 className="w-3.5 h-3.5" /> Closed {repoIssues.filter(i => i.state === 'closed').length}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {['Author', 'Labels', 'Projects', 'Milestones', 'Assignees', 'Sort'].map(item => (
                      <div key={item} className="flex items-center gap-1 hover:text-gray-900 cursor-pointer">
                        {item} <ChevronDown className="w-3 h-3" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white divide-y">
                   {isRepoLoading ? (
                      <div className="p-20 text-center text-muted-foreground animate-pulse font-medium">Fetching issues from GitHub...</div>
                   ) : repoIssues.length === 0 ? (
                      <div className="p-20 text-center text-muted-foreground">
                        <CircleDot className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <h4 className="text-lg font-bold">No issues found</h4>
                        <p className="text-sm">This repository has no open issues.</p>
                      </div>
                   ) : (
                     repoIssues.map(issue => (
                       <div key={issue.id} className="p-3 flex items-start gap-3 hover:bg-gray-50 group cursor-pointer" onClick={() => setSelectedIssue({
                          ...issue,
                          time: new Date(issue.created_at).toLocaleDateString(),
                          comments: 0 // Fetch real comments if needed
                       })}>
                         <input type="checkbox" className="mt-1 rounded border-gray-300" onClick={(e) => e.stopPropagation()} />
                         <CircleDot className={`w-4 h-4 ${issue.state === 'opened' ? 'text-green-600' : 'text-purple-600'} mt-0.5`} />
                         <div className="flex-1">
                           <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 leading-none mb-1">{issue.title}</h4>
                           <p className="text-[11px] text-muted-foreground font-medium">#{issue.iid} · {issue.author?.login} opened {new Date(issue.created_at).toLocaleDateString()}</p>
                         </div>
                       </div>
                     ))
                   )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center pt-4">
                <span className="text-blue-600 hover:underline cursor-pointer">Give feedback</span>
              </p>
            </div>
          )}

          {repoTab === 'pulls' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="is:pr is:open" className="pl-9 h-8 bg-[#f6f8fa] border-gray-300 text-sm focus-visible:ring-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 bg-[#f6f8fa] border-gray-300 font-medium">
                    <Tag className="w-3.5 h-3.5 mr-1" /> Labels <span className="bg-gray-200/80 px-1.5 rounded-full text-[10px] ml-1 font-bold">4</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 bg-[#f6f8fa] border-gray-300 font-medium">
                    <Milestone className="w-3.5 h-3.5 mr-1" /> Milestones <span className="bg-gray-200/80 px-1.5 rounded-full text-[10px] ml-1 font-bold">0</span>
                  </Button>
                  <Button size="sm" className="h-8 bg-[#1f883d] hover:bg-[#1a7f37] font-bold">New pull request</Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#f6f8fa] p-3 border-b flex items-center justify-between text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="flex items-center gap-1 text-gray-900 font-bold"><GitPullRequest className="w-3.5 h-3.5 text-green-600" /> Open {repoPRs.filter(pr => pr.state === 'open').length}</span>
                    <span className="flex items-center gap-1 opacity-60"><CheckCircle2 className="w-3.5 h-3.5" /> Closed {repoPRs.filter(pr => pr.state === 'closed').length}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {['Reviews', 'Assignees', 'Sort'].map(item => (
                      <div key={item} className="flex items-center gap-1 hover:text-gray-900 cursor-pointer">
                        {item} <ChevronDown className="w-3 h-3" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white divide-y">
                   {isRepoLoading ? (
                      <div className="p-20 text-center text-muted-foreground animate-pulse font-medium">Fetching pull requests from GitHub...</div>
                   ) : repoPRs.length === 0 ? (
                      <div className="p-20 text-center text-muted-foreground">
                        <GitPullRequest className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <h4 className="text-lg font-bold">No pull requests found</h4>
                        <p className="text-sm">This repository has no open pull requests.</p>
                      </div>
                   ) : (
                     repoPRs.map(pr => (
                       <div key={pr.id} className="p-3 flex items-start gap-3 hover:bg-gray-50 group cursor-pointer">
                         <input type="checkbox" className="mt-1 rounded border-gray-300" />
                         <GitPullRequest className="w-4 h-4 text-green-600 mt-0.5" />
                         <div className="flex-1">
                           <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 leading-none mb-1">{pr.title}</h4>
                           <p className="text-[11px] text-muted-foreground font-medium">#{pr.iid} · {pr.author?.login} opened {new Date(pr.created_at).toLocaleDateString()}</p>
                         </div>
                       </div>
                     ))
                   )}
                </div>
              </div>
            </div>
          )}
          {repoTab === 'projects' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="is:open" className="pl-9 h-10 bg-[#f6f8fa] border-gray-300 text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" className="text-blue-600 font-bold text-sm" onClick={() => toast({ title: "Coming Soon", description: "Project linking will be available in the next update." })}>
                    <Layers className="w-4 h-4 mr-2" /> Link a project
                  </Button>
                  <Button
                    className="bg-[#1f883d] hover:bg-[#1a7f37] font-bold"
                    onClick={() => {
                      const repoName = (selectedProject as any).repo_name || (selectedProject as any).name;
                      wizardOriginRepoRef.current = selectedProject;
                      setWizardOriginRepo(selectedProject);
                      setSelectedRepo(selectedProject as any);
                      // Store repo_name in the form so it survives wizard navigation
                      setNewProjectForm(f => ({ ...f, name: '', repo_name: repoName } as any));
                      setSelectedGhProject('new');
                      setSelectedTemplate(null);
                      setWizardStep('templates');
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> New project
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Header counts */}
                <div className="p-3 bg-[#f6f8fa] border-b flex items-center justify-between text-xs font-bold text-gray-900">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      Open {repoProjects.filter(p => !p.closed).length}
                    </span>
                    <span className="opacity-50 font-medium">Closed {repoProjects.filter(p => p.closed).length}</span>
                  </div>
                  <span className="text-gray-500 font-medium">Sort <ChevronDown className="w-3 h-3 inline ml-1" /></span>
                </div>

                {/* Project list */}
                <div className="divide-y">
                  {repoProjectsLoading ? (
                    <div className="p-12 text-center text-muted-foreground animate-pulse">
                      <Layers className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Fetching projects from GitHub...</p>
                    </div>
                  ) : repoProjects.filter(p => !p.closed).length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Layers className="w-10 h-10 mx-auto mb-4 opacity-20" />
                      <h4 className="text-base font-bold mb-1">No projects yet</h4>
                      <p className="text-sm">Create a project to organize issues in this repository.</p>
                    </div>
                  ) : (
                    repoProjects.filter(p => !p.closed).map(proj => (
                      <div
                        key={proj.id}
                        className="p-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer group"
                        onClick={() => openProjectBoard(proj)}
                      >
                        <div className="w-10 h-10 rounded border bg-gray-50 flex items-center justify-center shrink-0">
                          <Layers className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold group-hover:text-blue-600 truncate">{proj.name}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            #{proj.number} · updated {proj.updated_at ? new Date(proj.updated_at).toLocaleDateString() : '—'}
                            {proj.issue_count > 0 && ` · ${proj.issue_count} items`}
                          </p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 border rounded-full text-muted-foreground font-medium shrink-0">Private</span>
                        <Button variant="ghost" size="icon" className="text-gray-400 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

              <div className="flex items-center justify-center gap-8 pt-12 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    <span>© 2026 GitHub, Inc.</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>Terms</span><span>Privacy</span><span>Security</span><span>Status</span><span>Docs</span><span>Contact</span>
                  </div>
              </div>
            </>
          )}
          
          <Button 
            variant="ghost" 
            className="mt-8 text-blue-600" 
            onClick={() => setSelectedProject(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {onlyProjects ? 'Projects' : 'Project Dashboard'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {onlyProjects ? 'Your GitHub Projects (V2) boards' : 'Manage your GitHub repositories and projects'}
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={onlyProjects || mainTab === 'projects' ? startProjectWizard : startWizard}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              {onlyProjects || mainTab === 'projects' ? 'New Project' : 'New Repository'}
            </Button>
          )}
        </div>

        {!onlyProjects && (
          <div className="border-b flex items-center gap-8">
            <button 
              onClick={() => setMainTab('repos')}
              className={`flex items-center gap-2 px-1 py-4 text-sm font-medium transition-all border-b-2 -mb-[2px] ${
                mainTab === 'repos' 
                ? 'border-orange-500 text-gray-900' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Folder className="w-4 h-4" />
              Repositories <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-600">{allRepos.length}</span>
            </button>
            <button 
              onClick={() => setMainTab('projects')}
              className={`flex items-center gap-2 px-1 py-4 text-sm font-medium transition-all border-b-2 -mb-[2px] ${
                mainTab === 'projects' 
                ? 'border-orange-500 text-gray-900' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Layout className="w-4 h-4" />
              Projects <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-600">{allProjects.length}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main List */}
      {projects.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-12 text-center bg-muted/30">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">No Projects Yet</CardTitle>
          <CardDescription className="max-w-md mt-2">
            Add your first project board on GitHub to start managing your workflow.
          </CardDescription>
          <Button onClick={startWizard} className="mt-6">Get Started</Button>
        </Card>
      ) : onlyProjects ? (
        /* GitHub List View Parity */
        <div className="space-y-4">
           {/* List Controls */}
           <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="is:open" 
                  className="pl-10 h-10 border-gray-300 shadow-sm focus:ring-blue-500 rounded-md"
                  readOnly
                />
              </div>
           </div>

           {/* List Header/Tabs */}
           <div className="border rounded-md overflow-hidden bg-white shadow-sm">
              <div className="bg-[#f6f8fa] border-b px-4 py-2 flex items-center justify-between">
                 <div className="flex items-center gap-6 text-sm">
                    <button className="flex items-center gap-1.5 font-bold text-gray-900 border-b-2 border-orange-500 pb-0.5 mt-0.5">
                       Open <span className="bg-gray-200/60 px-2 py-0.5 rounded-full text-[10px]">{projects.filter(p => !p.closed).length}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900">
                       Closed <span className="bg-gray-200/60 px-2 py-0.5 rounded-full text-[10px]">{projects.filter(p => p.closed).length}</span>
                    </button>
                 </div>
                 <div className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer hover:text-gray-900">
                    Sort <ChevronDown className="w-4 h-4" />
                 </div>
              </div>

              {/* List Content */}
              <div className="divide-y">
                 {projects.map((project) => (
                    <div 
                      key={project.id} 
                      className="p-4 hover:bg-gray-50 cursor-pointer flex items-start justify-between group"
                      onClick={() => {
                        if (project.source === 'github_project') {
                          openProjectBoard(project);
                        } else {
                          openRepo(project);
                        }
                      }}
                    >
                       <div className="flex gap-3">
                          <Layout className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600 hover:underline text-[15px]">{project.name}</span>
                                <span className="text-[10px] border px-1.5 py-0.5 rounded-full text-gray-500 font-medium">Private</span>
                             </div>
                             <div className="text-xs text-gray-500 mt-1">
                                #{project.number || '0'} updated {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'recently'}
                             </div>
                          </div>
                       </div>
                       <MoreHorizontal className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100" />
                    </div>
                 ))}
              </div>
           </div>
        </div>
      ) : (
        /* Repository Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="group hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 cursor-pointer overflow-hidden relative"
              onClick={() => {
                if (project.source === 'github_project') {
                  openProjectBoard(project);
                } else {
                  openRepo(project);
                }
              }}
            >
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove repository ${project.name}?`)) {
                      api.projects.delete(String(project.id)).then(() => fetchProjects());
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${project.visibility === 'public' ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{project.visibility}</span>
                </div>
                <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2 h-10">{project.description || "No description provided"}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{project.issue_count}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Issues</span>
                  </div>
                  <div className="flex flex-col border-l pl-4">
                    <span className="text-2xl font-bold text-blue-600">{project.open_issues}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Open</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 border-t py-3 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Linked</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  Manage <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Wizard Dialog */}
      <Dialog open={wizardStep !== 'list'} onOpenChange={(open) => !open && setWizardStep('list')}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 border-b bg-muted/30">
            <DialogTitle className="text-xl flex items-center gap-2">
              {wizardStep === 'repository' && "Select Repository"}
              {wizardStep === 'templates' && "Create project"}
              {wizardStep === 'confirm' && "Finalize Repository"}
            </DialogTitle>
            {wizardStep !== 'templates' && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-8 h-1 rounded-full ${['repository', 'templates', 'confirm'].indexOf(wizardStep) >= 0 ? 'bg-blue-600' : 'bg-muted'}`} />
                <div className={`w-8 h-1 rounded-full ${['templates', 'confirm'].indexOf(wizardStep) >= 0 ? 'bg-blue-600' : 'bg-muted'}`} />
                <div className={`w-8 h-1 rounded-full ${['confirm'].indexOf(wizardStep) >= 0 ? 'bg-blue-600' : 'bg-muted'}`} />
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {/* STEP 1: REPOSITORY */}
            {wizardStep === 'repository' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search repositories..." 
                      className="pl-9" 
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">or</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                          <GitBranch className="w-4 h-4 mr-2" /> New Repo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Create New Repository</DialogTitle></DialogHeader>
                        <form onSubmit={handleCreateRepo} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Repo Name</Label>
                            <Input 
                              placeholder="my-awesome-repo" 
                              value={newRepoForm.name}
                              onChange={(e) => setNewRepoForm({...newRepoForm, name: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Visibility</Label>
                            <select 
                              className="w-full border rounded-md p-2"
                              value={newRepoForm.visibility}
                              onChange={(e) => setNewRepoForm({...newRepoForm, visibility: e.target.value})}
                            >
                              <option value="private">Private</option>
                              <option value="public">Public</option>
                            </select>
                          </div>
                          <Button className="w-full" disabled={creating}>{creating ? 'Creating...' : 'Create Repo'}</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {loadingRepos ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRepos.map(repo => (
                      <div 
                        key={repo.id}
                        onClick={() => handleRepoSelect(repo)}
                        className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-sm group-hover:text-blue-700">{repo.name}</h3>
                          <span className="text-[10px] px-1.5 py-0.5 border rounded-full text-muted-foreground">{repo.private ? 'Private' : 'Public'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{repo.description || "No description"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PROJECT CONTEXT */}
            {wizardStep === 'project' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                      <Github className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Target Repo: {selectedRepo?.name}</h4>
                      <p className="text-xs text-muted-foreground">Select an existing board or create a new one for this repo.</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setWizardStep('repository')}>Change</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Existing Project Boards</h3>
                    {loadingGhProjects ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
                      </div>
                    ) : ghProjects.length === 0 ? (
                      <div className="p-8 border-dashed border-2 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">No projects found for this owner.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {ghProjects.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => setSelectedGhProject(p)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${selectedGhProject !== 'new' && selectedGhProject?.id === p.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-muted'}`}
                          >
                            <span className="text-sm font-medium">{p.title}</span>
                            {selectedGhProject !== 'new' && selectedGhProject?.id === p.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div 
                    onClick={() => {
                      setSelectedGhProject('new');
                      setWizardStep('templates');
                    }}
                    className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${selectedGhProject === 'new' ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-400 hover:bg-muted/50'}`}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Plus className="text-green-600" />
                    </div>
                    <h3 className="font-bold">Create New Board</h3>
                    <p className="text-xs text-muted-foreground mt-1">Start fresh with a custom project template</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: TEMPLATES (GitHub Style) */}
            {wizardStep === 'templates' && (
              <div className="flex h-[600px] -m-6">
                {/* Sidebar */}
                <div className="w-64 border-r bg-muted/10 p-4 space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Project templates</h3>
                    <button 
                      onClick={() => setTemplateCategory('featured')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${templateCategory === 'featured' ? 'bg-white shadow-sm text-blue-600 border border-blue-100' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      Featured
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Start from scratch</h3>
                    <div className="space-y-1">
                      {SCRATCH_TEMPLATES.map(t => (
                        <button 
                          key={t.id}
                          onClick={() => {
                            setSelectedTemplate(t.id);
                            setWizardStep('confirm');
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="p-4 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search templates" 
                        className="pl-9 bg-muted/20 border-none h-9" 
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                      {templateCategory === 'featured' ? 'Featured' : 'Start from scratch'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(templateCategory === 'featured' ? PROJECT_TEMPLATES : SCRATCH_TEMPLATES)
                        .filter(t => t.title.toLowerCase().includes(templateSearch.toLowerCase()))
                        .map(t => (
                        <div 
                          key={t.id}
                          onClick={() => {
                            setSelectedTemplate(t.id);
                            setWizardStep('confirm');
                          }}
                          className="group border rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer bg-white"
                        >
                          <div className="aspect-[16/10] bg-muted/30 overflow-hidden border-b">
                            {t.image ? (
                              <img src={t.image} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="p-4 bg-white rounded-lg shadow-sm">{t.icon}</div>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-sm text-gray-900">{t.title} <span className="text-muted-foreground font-normal ml-1">· GitHub</span></h4>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {t.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRM */}
            {wizardStep === 'confirm' && (
              <div className="space-y-6">
                <div className="flex gap-8">
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold mb-1">New {selectedTemplate}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplate === 'table' && "Start with a powerful spreadsheet style table to filter, sort and group your issues and pull requests. Easily switch to a board or roadmap layout at any time."}
                        {selectedTemplate === 'board' && "Start with a board to spread your issues and pull requests across customizable columns. Easily switch to a table or roadmap layout at any time."}
                        {selectedTemplate === 'roadmap' && "Start with a roadmap for a high-level visualization of your project over time. Easily switch to a table or board layout at any time."}
                        {!['table', 'board', 'roadmap'].includes(selectedTemplate || '') && `Starting with the ${selectedTemplate} template to kickstart your workflow.`}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Project name</Label>
                        <Input 
                          value={newProjectForm.name}
                          onChange={(e) => setNewProjectForm({...newProjectForm, name: e.target.value})}
                          placeholder="Project name"
                          className="max-w-md"
                        />
                      </div>

                      <div className="p-4 border rounded-xl bg-white shadow-sm space-y-4">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            id="import-items" 
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={importItems}
                            onChange={(e) => setImportItems(e.target.checked)}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="import-items" className="text-sm font-bold cursor-pointer">Import items from repository</Label>
                            <p className="text-xs text-muted-foreground">All new and existing items from the selected repository will be added to this project.</p>
                          </div>
                        </div>

                         {importItems && (
                          <div className="flex items-center gap-3 pl-7">
                            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-muted/30 text-sm">
                              <Layers className="w-4 h-4 text-muted-foreground" />
                              <select 
                                className="bg-transparent border-none focus:ring-0 p-0 font-medium"
                                value={importType}
                                onChange={(e) => setImportType(e.target.value)}
                              >
                                <option>Open issues</option>
                                <option>All issues</option>
                                <option>Pull requests</option>
                              </select>
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">from</span>
                            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-muted/30 text-sm">
                              <GitBranch className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{selectedRepo?.name}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 pl-7 pt-2 border-t mt-2">
                           <input 
                             type="checkbox" 
                             id="create-github-project" 
                             className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                             checked={createGithubProject}
                             onChange={(e) => setCreateGithubProject(e.target.checked)}
                           />
                           <div className="space-y-0.5">
                             <Label htmlFor="create-github-project" className="text-sm font-bold cursor-pointer flex items-center gap-2">
                               <Layers className="w-4 h-4" /> Create a GitHub Project board
                             </Label>
                             <p className="text-[10px] text-muted-foreground">Creates a GitHub Projects (V2) board and applies the selected template's columns.</p>
                           </div>
                        </div>

                        <div className="flex items-center gap-3 pl-7 pt-2 border-t mt-2">
                           <input 
                             type="checkbox" 
                             id="create-on-github" 
                             className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                             checked={createOnGithub}
                             onChange={(e) => setCreateOnGithub(e.target.checked)}
                           />
                           <div className="space-y-0.5">
                             <Label htmlFor="create-on-github" className="text-sm font-bold cursor-pointer flex items-center gap-2">
                               <Github className="w-4 h-4" /> Also create a new GitHub repository
                             </Label>
                             <p className="text-[10px] text-muted-foreground">Optional: creates a new repository in your GitHub account alongside this project.</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:block w-[400px] shrink-0 space-y-4">
                    <div className="aspect-video border rounded-xl overflow-hidden bg-muted/20 relative group">
                      {selectedTemplate === 'table' && (
                        <div className="p-4 space-y-3">
                          <div className="flex gap-2 border-b pb-2">
                             <div className="w-4 h-4 bg-blue-200 rounded" />
                             <div className="w-12 h-4 bg-gray-200 rounded" />
                          </div>
                          {[1,2,3,4].map(i => (
                            <div key={i} className="flex gap-4 items-center">
                              <div className="w-4 h-4 border rounded" />
                              <div className="h-3 w-32 bg-gray-100 rounded" />
                              <div className="h-3 w-16 bg-blue-50 rounded ml-auto" />
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedTemplate === 'board' && (
                        <div className="p-4 grid grid-cols-3 gap-2 h-full">
                          {[1,2,3].map(c => (
                            <div key={c} className="space-y-2">
                              <div className="h-2 w-12 bg-gray-200 rounded" />
                              <div className="h-16 w-full bg-white border rounded shadow-sm" />
                              <div className="h-16 w-full bg-white border rounded shadow-sm" />
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedTemplate === 'roadmap' && (
                        <div className="p-4 space-y-4 h-full">
                           <div className="flex gap-2 items-center">
                              <div className="w-full h-2 bg-gray-100 rounded" />
                           </div>
                           <div className="relative h-20 w-full border-l border-b">
                              <div className="absolute top-2 left-4 right-12 h-6 bg-blue-100 rounded-full" />
                              <div className="absolute top-10 left-12 right-4 h-6 bg-green-100 rounded-full" />
                           </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="text-[10px] font-bold uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">Preview Layout</span>
                      </div>
                    </div>
                    <div className="p-4 border rounded-xl bg-blue-50/50">
                       <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Pro Tip</h4>
                       <p className="text-xs text-blue-600 leading-relaxed">
                         You can easily switch between Table, Board, and Roadmap layouts at any time after creation.
                       </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 mt-8 border-t">
                  <p className="text-xs text-muted-foreground font-medium">
                    {importItems ? "1 item and its sub-issues will be added" : "No items will be imported initially"}
                  </p>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 h-10 px-6 text-sm font-bold"
                    onClick={handleFinalSubmit}
                    disabled={creating || !newProjectForm.name}
                  >
                    {creating ? 'Creating...' : 'Create project'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-muted/10 flex justify-between">
            <Button 
              variant="ghost" 
              onClick={() => {
                if (wizardStep === 'confirm') setWizardStep('templates');
                else if (wizardStep === 'templates') setWizardStep('project');
                else if (wizardStep === 'project') setWizardStep('repository');
                else setWizardStep('list');
              }}
              disabled={creating}
            >
              {wizardStep === 'repository' ? 'Cancel' : <><ArrowLeft className="w-4 h-4 mr-2" /> Back</>}
            </Button>
            
            {wizardStep === 'project' && selectedGhProject && (
              <Button onClick={() => setWizardStep(selectedGhProject === 'new' ? 'templates' : 'confirm')}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;

