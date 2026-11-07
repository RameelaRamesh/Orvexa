'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import {
  CheckSquare,
  Briefcase,
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  HelpCircle,
  X,
  ChevronRight,
  MoreVertical,
  ArrowUpDown,
  List,
  Kanban,
  FileText,
  Paperclip,
  Send,
  MessageSquare,
  Activity as ActivityIcon,
  User,
  Building,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Eye,
  Check,
  TrendingUp,
  FolderOpen,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/user-avatar';

// Status Types
type TaskStatusType = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'COMPLETED';

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  completedAt?: string;
}

interface ActivityLogItem {
  action: string;
  actorId?: string;
  timestamp: string;
  details?: string;
}

interface ProgressUpdate {
  id: string;
  previousProgress: number;
  newProgress: number;
  updatedBy: string;
  updatedAt: string;
  comment?: string;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  project?: { id: string; name: string; key: string };
  assigneeMembershipId?: string;
  assignee?: {
    id: string;
    user?: { firstName: string; lastName: string; email: string; avatarUrl?: string };
    department?: { name: string };
    team?: { name: string };
  };
  status: TaskStatusType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  progress: number;
  progressMode?: 'MANUAL' | 'SUBTASK';
  progressUpdates?: ProgressUpdate[];
  subtasks?: Subtask[];
  reviewRequired?: boolean;
  dueDate?: string;
  startDate?: string;
  isOverdue?: boolean;
  isBlocked?: boolean;
  extensionRequest?: {
    id: string;
    proposedDeadline: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
    feedback?: string;
  };
  activityLog?: ActivityLogItem[];
  comments?: Array<{
    id: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMember {
  id: string;
  user?: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string };
  designation?: { title: string };
  department?: { name: string };
}

interface ProjectItem {
  id: string;
  name: string;
  key: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  managerMembershipId?: string;
  managerName?: string;
  manager?: ProjectMember;
  memberMembershipIds?: string[];
  members?: ProjectMember[];
  startDate?: string;
  endDate?: string;
  progressPercentage: number;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  totalTasks: number;
  completedTasks: number;
  files?: Array<{ id: string; name: string; url: string; size?: string; type?: string; uploadedAt: string }>;
  activity?: Array<{ id: string; action: string; timestamp: string; details: string }>;
}

export default function ProjectsAndTasksPage() {
  const searchParams = useSearchParams();

  // Top Views: My Work, Projects, Team Work
  const [mainView, setMainView] = useState<'my_work' | 'projects' | 'team_work'>('my_work');

  // Sub-view: List or Board for My Work
  const [workLayout, setWorkLayout] = useState<'list' | 'board'>('list');

  // Data states
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Project Workspace
  const [activeProjectWorkspace, setActiveProjectWorkspace] = useState<ProjectItem | null>(null);
  const [projectWorkspaceTab, setProjectWorkspaceTab] = useState<'overview' | 'tasks' | 'members' | 'files' | 'activity'>('overview');

  // Selected Task for Detail Drawer
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);

  // My Work Filters
  const [myWorkStatusFilter, setMyWorkStatusFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [myWorkSearch, setMyWorkSearch] = useState('');
  const [myWorkPriorityFilter, setMyWorkPriorityFilter] = useState('ALL');

  // Projects Filters
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL');
  const [projectDepartmentFilter, setProjectDepartmentFilter] = useState('ALL');
  const [projectSearch, setProjectSearch] = useState('');

  // Team Work Filters
  const [teamMemberFilter, setTeamMemberFilter] = useState('ALL');
  const [teamDeptFilter, setTeamDeptFilter] = useState('ALL');
  const [teamProjectFilter, setTeamProjectFilter] = useState('ALL');
  const [teamStatusFilter, setTeamStatusFilter] = useState('ALL');
  const [teamPriorityFilter, setTeamPriorityFilter] = useState('ALL');
  const [teamSearch, setTeamSearch] = useState('');

  // Modals
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);

  // Form states
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    key: '',
    description: '',
    departmentId: '',
    managerMembershipId: '',
    memberMembershipIds: [] as string[],
    startDate: '',
    endDate: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    status: 'ACTIVE' as 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED',
  });

  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assigneeMembershipId: '',
    startDate: '',
    dueDate: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    reviewRequired: false,
    subtasks: [] as string[],
    newSubtaskInput: '',
  });

  const [extensionForm, setExtensionForm] = useState({
    proposedDeadline: '',
    reason: '',
  });

  const [progressForm, setProgressForm] = useState({
    progress: 50,
    comment: '',
  });

  const [newCommentInput, setNewCommentInput] = useState('');
  const [reviewFeedbackInput, setReviewFeedbackInput] = useState('');

  // Auth & Context
  const [currentMembershipId, setCurrentMembershipId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('MEMBER');

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(wsId && wsId !== 'undefined' && wsId !== 'null' ? { 'x-workspace-id': wsId } : {}),
    };
  };

  // Load User Context
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      const ws = localStorage.getItem('activeWorkspaceId');
      const mem = (p.memberships || []).find((m: any) => m.workspaceId === ws) || p.memberships?.[0];
      if (mem) {
        setCurrentMembershipId(mem.id);
        setUserRole(mem.accessRole || 'MEMBER');
      }
    } catch {}
  }, []);

  // Initial Fetch Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, membersRes, deptsRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/tasks`, { headers: getHeaders() }),
        fetch(`${BRANDING.apiUrl}/projects`, { headers: getHeaders() }),
        fetch(`${BRANDING.apiUrl}/people?limit=100`, { headers: getHeaders() }),
        fetch(`${BRANDING.apiUrl}/departments`, { headers: getHeaders() }),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(Array.isArray(data) ? data : data.data || []);
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(Array.isArray(data) ? data : data.data || []);
      }
      if (membersRes.ok) {
        const data = await membersRes.json();
        setTeamMembers(Array.isArray(data) ? data : data.data || []);
      }
      if (deptsRes.ok) {
        const data = await deptsRes.json();
        setDepartments(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Failed to load projects & tasks data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Deep link checks from searchParams (e.g. ?taskId=... or ?projectId=...)
  useEffect(() => {
    const qTaskId = searchParams.get('taskId');
    const qProjId = searchParams.get('projectId');

    if (qTaskId && tasks.length > 0) {
      const target = tasks.find((t) => t.id === qTaskId);
      if (target) {
        fetchTaskDetail(target.id);
      }
    }

    if (qProjId && projects.length > 0) {
      const proj = projects.find((p) => p.id === qProjId);
      if (proj) {
        openProjectWorkspace(proj.id);
      }
    }
  }, [searchParams, tasks, projects]);

  const fetchTaskDetail = async (taskId: string) => {
    setTaskDetailLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const payload = data && data.data !== undefined ? data.data : data;
        setSelectedTask(payload);
      }
    } catch {
      toast.error('Failed to load task details');
    } finally {
      setTaskDetailLoading(false);
    }
  };

  const openProjectWorkspace = async (projectId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/projects/${projectId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const payload = data && data.data !== undefined ? data.data : data;
        setActiveProjectWorkspace(payload);
        setMainView('projects');
        setProjectWorkspaceTab('overview');
      }
    } catch {
      toast.error('Failed to load project workspace');
    }
  };

  // Check if current user is manager / team lead / admin
  const isManagerOrAdmin = useMemo(() => {
    return ['OWNER', 'ADMIN', 'MANAGER'].includes(userRole.toUpperCase()) || userRole.toUpperCase().includes('LEAD');
  }, [userRole]);

  // Filter Tasks for My Work
  const myWorkTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Must be assigned to user (or unassigned tasks created by user)
      const isMine =
        t.assigneeMembershipId === currentMembershipId ||
        (!t.assigneeMembershipId && (t as any).creatorMembershipId === currentMembershipId);
      if (!isMine) return false;

      // Status Filter
      if (myWorkStatusFilter === 'OVERDUE') {
        if (!t.isOverdue) return false;
      } else if (myWorkStatusFilter === 'BLOCKED') {
        if (!t.isBlocked && t.status !== 'BLOCKED') return false;
      } else if (myWorkStatusFilter === 'COMPLETED') {
        if (t.status !== 'COMPLETED') return false;
      } else if (myWorkStatusFilter !== 'ALL') {
        if (t.status !== myWorkStatusFilter) return false;
      }

      // Priority Filter
      if (myWorkPriorityFilter !== 'ALL' && t.priority !== myWorkPriorityFilter) {
        return false;
      }

      // Search Query
      if (myWorkSearch.trim()) {
        const q = myWorkSearch.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = (t.description || '').toLowerCase().includes(q);
        const inProj = (t.project?.name || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inProj) return false;
      }

      return true;
    });
  }, [tasks, currentMembershipId, myWorkStatusFilter, myWorkPriorityFilter, myWorkSearch]);

  // Filter Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (projectStatusFilter !== 'ALL' && p.status !== projectStatusFilter) {
        return false;
      }
      if (projectDepartmentFilter !== 'ALL' && p.departmentId !== projectDepartmentFilter) {
        return false;
      }
      if (projectSearch.trim()) {
        const q = projectSearch.toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inKey = p.key.toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        if (!inName && !inKey && !inDesc) return false;
      }
      return true;
    });
  }, [projects, projectStatusFilter, projectDepartmentFilter, projectSearch]);

  // Filter Tasks for Team Work
  const teamWorkTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (teamMemberFilter !== 'ALL' && t.assigneeMembershipId !== teamMemberFilter) {
        return false;
      }
      if (teamProjectFilter !== 'ALL' && t.projectId !== teamProjectFilter) {
        return false;
      }
      if (teamDeptFilter !== 'ALL') {
        if (t.assignee?.department?.name !== teamDeptFilter) return false;
      }
      if (teamStatusFilter === 'OVERDUE') {
        if (!t.isOverdue) return false;
      } else if (teamStatusFilter !== 'ALL' && t.status !== teamStatusFilter) {
        return false;
      }
      if (teamPriorityFilter !== 'ALL' && t.priority !== teamPriorityFilter) {
        return false;
      }
      if (teamSearch.trim()) {
        const q = teamSearch.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = (t.description || '').toLowerCase().includes(q);
        const inAssignee = `${t.assignee?.user?.firstName || ''} ${t.assignee?.user?.lastName || ''}`.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inAssignee) return false;
      }
      return true;
    });
  }, [tasks, teamMemberFilter, teamProjectFilter, teamDeptFilter, teamStatusFilter, teamPriorityFilter, teamSearch]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.name.trim() || !newProjectForm.key.trim()) {
      toast.error('Project name and key are required');
      return;
    }

    try {
      const res = await fetch(`${BRANDING.apiUrl}/projects`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newProjectForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create project');
      }

      const createdRaw = await res.json();
      const created = createdRaw && createdRaw.data !== undefined ? createdRaw.data : createdRaw;
      toast.success(`Project "${created.name || ''}" created successfully!`);
      setCreateProjectModalOpen(false);
      setNewProjectForm({
        name: '',
        key: '',
        description: '',
        departmentId: '',
        managerMembershipId: '',
        memberMembershipIds: [],
        startDate: '',
        endDate: '',
        priority: 'MEDIUM',
        status: 'ACTIVE',
      });

      await loadData();
      // Flow requirement: Create Project -> Open Project Workspace -> Allow Task Creation
      openProjectWorkspace(created.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create project');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      const payload: any = {
        title: newTaskForm.title.trim(),
        description: newTaskForm.description.trim() || undefined,
        projectId: newTaskForm.projectId || (activeProjectWorkspace ? activeProjectWorkspace.id : undefined),
        assigneeMembershipId: newTaskForm.assigneeMembershipId || undefined,
        startDate: newTaskForm.startDate || undefined,
        dueDate: newTaskForm.dueDate || undefined,
        priority: newTaskForm.priority,
        reviewRequired: newTaskForm.reviewRequired,
        subtasks: newTaskForm.subtasks.map((st) => ({ title: st })),
      };

      const res = await fetch(`${BRANDING.apiUrl}/tasks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create task');
      }

      const createdRaw = await res.json();
      const created = createdRaw && createdRaw.data !== undefined ? createdRaw.data : createdRaw;
      toast.success(`Task "${created.title || ''}" created successfully!`);
      setCreateTaskModalOpen(false);
      setNewTaskForm({
        title: '',
        description: '',
        projectId: '',
        assigneeMembershipId: '',
        startDate: '',
        dueDate: '',
        priority: 'MEDIUM',
        reviewRequired: false,
        subtasks: [],
        newSubtaskInput: '',
      });

      await loadData();
      if (activeProjectWorkspace) {
        openProjectWorkspace(activeProjectWorkspace.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  const handleAddSubtask = async (taskId: string, title: string) => {
    if (!title.trim()) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        await loadData();
        toast.success('Subtask added');
      }
    } catch {
      toast.error('Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ isCompleted }),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        await loadData();
      }
    } catch {
      toast.error('Failed to toggle subtask');
    }
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        await loadData();
        toast.success('Subtask removed');
      }
    } catch {
      toast.error('Failed to delete subtask');
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${selectedTask.id}/progress`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(progressForm),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        setProgressModalOpen(false);
        setProgressForm({ progress: 50, comment: '' });
        await loadData();
        toast.success('Progress updated');
      }
    } catch {
      toast.error('Failed to update progress');
    }
  };

  const handleSubmitForReview = async (taskId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}/review`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notes: 'Submitted for manager review' }),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        await loadData();
        toast.success('Task submitted for review! Manager notified.');
      }
    } catch {
      toast.error('Failed to submit for review');
    }
  };

  const handleReviewDecision = async (taskId: string, approved: boolean, feedback?: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}/review-decision`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ approved, feedback }),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        await loadData();
        toast.success(approved ? 'Task approved and completed!' : 'Changes requested. Task returned to In Progress.');
      }
    } catch {
      toast.error('Failed to submit review decision');
    }
  };

  const handleDirectComplete = async (taskId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        await loadData();
        toast.success('Task marked as Done!');
      }
    } catch {
      toast.error('Failed to mark task complete');
    }
  };

  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !extensionForm.proposedDeadline || !extensionForm.reason.trim()) {
      toast.error('Please provide proposed deadline and reason');
      return;
    }
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${selectedTask.id}/extension-request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(extensionForm),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        setExtensionModalOpen(false);
        setExtensionForm({ proposedDeadline: '', reason: '' });
        await loadData();
        toast.success('Extension requested. Responsible manager notified.');
      }
    } catch {
      toast.error('Failed to request extension');
    }
  };

  const handleReviewExtension = async (taskId: string, action: 'APPROVE' | 'REJECT', feedback?: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}/extension-review`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action, feedback }),
      });
      if (res.ok) {
        const updated = await res.json();
        const payload = updated && updated.data !== undefined ? updated.data : updated;
        setSelectedTask(payload);
        await loadData();
        toast.success(action === 'APPROVE' ? 'Deadline extension approved!' : 'Extension rejected.');
      }
    } catch {
      toast.error('Failed to review extension');
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!newCommentInput.trim()) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text: newCommentInput }),
      });
      if (res.ok) {
        setNewCommentInput('');
        fetchTaskDetail(taskId);
        toast.success('Comment added');
      }
    } catch {
      toast.error('Failed to post comment');
    }
  };

  // Helper styles
  const getStatusBadge = (status: TaskStatusType, isOverdue?: boolean) => {
    let base = '';
    let label: string = status;
    if (status === 'TODO') {
      base = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      label = 'To Do';
    } else if (status === 'IN_PROGRESS') {
      base = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900';
      label = 'In Progress';
    } else if (status === 'IN_REVIEW') {
      base = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      label = 'In Review';
    } else if (status === 'BLOCKED') {
      base = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      label = 'Blocked';
    } else if (status === 'COMPLETED' || (status as string) === 'DONE') {
      base = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
      label = 'Done';
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${base}`}>
          {label}
        </span>
        {isOverdue && status !== 'COMPLETED' && (status as string) !== 'DONE' && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
            Overdue
          </span>
        )}
      </div>
    );
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'URGENT') {
      return <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Urgent</span>;
    }
    if (priority === 'HIGH') {
      return <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">High</span>;
    }
    if (priority === 'LOW') {
      return <span className="text-[11px] font-medium text-slate-500">Low</span>;
    }
    return <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Medium</span>;
  };

  return (
    <div className="space-y-6">
{/* Topics (Tabs) & Header Controls - Single Unified Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-1 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setMainView('my_work');
              setActiveProjectWorkspace(null);
            }}
            className={`pb-2.5 px-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              mainView === 'my_work' && !activeProjectWorkspace
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            My Work
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {tasks.filter((t) => t.assigneeMembershipId === currentMembershipId).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainView('projects')}
            className={`pb-2.5 px-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              mainView === 'projects' || activeProjectWorkspace
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Projects
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {projects.length}
            </span>
          </button>

          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => {
                setMainView('team_work');
                setActiveProjectWorkspace(null);
              }}
              className={`pb-2.5 px-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                mainView === 'team_work' && !activeProjectWorkspace
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              Team Work
            </button>
          )}

          {activeProjectWorkspace && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 ml-2">
              <Briefcase className="h-3 w-3" />
              {activeProjectWorkspace.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end self-end sm:self-center pb-1 sm:pb-0">
          {/* View Layout Toggle (List vs Board for My Work) */}
          {mainView === 'my_work' && !activeProjectWorkspace && (
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg mr-1">
              <button
                type="button"
                onClick={() => setWorkLayout('list')}
                className={`p-1.5 rounded-md text-xs cursor-pointer ${
                  workLayout === 'list'
                    ? 'bg-white dark:bg-slate-900 text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setWorkLayout('board')}
                className={`p-1.5 rounded-md text-xs cursor-pointer ${
                  workLayout === 'board'
                    ? 'bg-white dark:bg-slate-900 text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Board View"
              >
                <Kanban className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCreateTaskModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </button>
          <button
            type="button"
            onClick={() => setCreateProjectModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Briefcase className="h-3.5 w-3.5" />
            New Project
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MY WORK VIEW */}
      {/* ========================================================================= */}
      {mainView === 'my_work' && !activeProjectWorkspace && (
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED', 'OVERDUE'] as const).map((st) => (

                <button
                  key={st}
                  type="button"
                  onClick={() => setMyWorkStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    myWorkStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All Tasks'
                    : st === 'TODO'
                    ? 'To Do'
                    : st === 'IN_PROGRESS'
                    ? 'In Progress'
                    : st === 'IN_REVIEW'
                    ? 'In Review'
                    : st === 'BLOCKED'
                    ? 'Blocked'
                    : st === 'COMPLETED'
                    ? 'Completed'
                    : 'Overdue'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-44 sm:w-56">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={myWorkSearch}
                  onChange={(e) => setMyWorkSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={myWorkPriorityFilter}
                onChange={(e) => setMyWorkPriorityFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-xs cursor-pointer focus:outline-hidden"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* List View */}
          {workLayout === 'list' && (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Progress</th>
                      <th className="py-3 px-3">Deadline</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myWorkTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                          <p className="text-sm font-semibold text-foreground">No tasks in this view</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Create a task or adjust your status filter above.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      myWorkTasks.map((task) => (
                        <tr
                          key={task.id}
                          onClick={() => fetchTaskDetail(task.id)}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                              {task.title}
                            </div>
                            {task.subtasks && task.subtasks.length > 0 && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Subtasks: {task.subtasks.filter((s) => s.isCompleted).length} / {task.subtasks.length} completed
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              {task.project?.name || 'Standalone'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {getStatusBadge(task.status, task.isOverdue)}
                          </td>
                          <td className="py-3 px-3">
                            {getPriorityBadge(task.priority)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="w-24">
                              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground mb-1">
                                <span>{task.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    task.status === 'COMPLETED'
                                      ? 'bg-emerald-500'
                                      : task.isOverdue
                                      ? 'bg-rose-500'
                                      : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {task.dueDate ? (
                              <span className={task.isOverdue ? 'text-rose-600 font-semibold' : ''}>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            ) : (
                              'No date'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchTaskDetail(task.id);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Board View (Kanban) */}
          {workLayout === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(
                [
                  { title: 'To Do', status: 'TODO', color: 'border-slate-300 dark:border-slate-700' },
                  { title: 'In Progress', status: 'IN_PROGRESS', color: 'border-blue-400 dark:border-blue-700' },
                  { title: 'In Review', status: 'IN_REVIEW', color: 'border-amber-400 dark:border-amber-700' },
                  { title: 'Done', status: 'COMPLETED', color: 'border-emerald-400 dark:border-emerald-700' },
                ] as const
              ).map((col) => {
                const colTasks = myWorkTasks.filter((t) => t.status === col.status);
                return (
                  <div
                    key={col.status}
                    className="flex flex-col bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-border"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                      <span className="font-semibold text-xs text-foreground">{col.title}</span>
                      <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-white dark:bg-slate-800 text-muted-foreground border border-border">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
                      {colTasks.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-xs">
                          No tasks in {col.title}
                        </div>
                      ) : (
                        colTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => fetchTaskDetail(t.id)}
                            className="p-3 rounded-lg bg-card border border-border hover:border-blue-400 shadow-2xs cursor-pointer transition-all hover:-translate-y-0.5 text-left"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                                {t.title}
                              </span>
                              {t.isOverdue && (
                                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-rose-500 text-white shrink-0">
                                  Overdue
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                              {t.description || 'No description provided.'}
                            </p>

                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                              <span>{t.project?.name || 'Standalone'}</span>
                              <div className="flex items-center gap-2">
                                <span>{t.progress}%</span>
                                {getPriorityBadge(t.priority)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROJECTS DIRECTORY VIEW */}
      {/* ========================================================================= */}
      {mainView === 'projects' && !activeProjectWorkspace && (
        <div className="space-y-4">
          {/* Projects Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects by name, key or description..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={projectStatusFilter}
                onChange={(e) => setProjectStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-xs cursor-pointer focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <select
                value={projectDepartmentFilter}
                onChange={(e) => setProjectDepartmentFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-xs cursor-pointer focus:outline-hidden"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Projects Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="text-sm font-semibold text-foreground">No projects found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create your first project to organize deliverables and team tasks.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Create Project
                </button>
              </div>
            ) : (
              filteredProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openProjectWorkspace(p.id)}
                  className="p-4 rounded-xl border border-border bg-card hover:border-blue-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between text-left group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {p.key}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">
                        {p.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {p.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/80 space-y-3">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{p.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${p.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="truncate max-w-[120px]">
                          {p.managerName || 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3 text-slate-400" />
                        <span>{p.completedTasks} / {p.totalTasks} Tasks</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2.1 DEDICATED PROJECT WORKSPACE (Overview, Tasks, Members, Files, Activity) */}
      {/* ========================================================================= */}
      {activeProjectWorkspace && (
        <div className="space-y-5">
          {/* Workspace Top Banner */}
          <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveProjectWorkspace(null)}
                className="p-1.5 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground cursor-pointer"
                title="Back to all projects"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {activeProjectWorkspace.key}
                  </span>
                  <h2 className="text-xl font-bold text-foreground">{activeProjectWorkspace.name}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Department: {activeProjectWorkspace.departmentName || 'General'} • Project Manager: {activeProjectWorkspace.managerName || 'Unassigned'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewTaskForm((prev) => ({ ...prev, projectId: activeProjectWorkspace.id }));
                  setCreateTaskModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Task to Project
              </button>
            </div>
          </div>

          {/* Project Workspace Sections Navigation */}
          <div className="flex border-b border-border gap-2">
            {(
              [
                { id: 'overview', label: 'Overview', icon: FolderOpen },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: (activeProjectWorkspace as any).tasks?.length },
                { id: 'members', label: 'Members', icon: Users, count: (activeProjectWorkspace as any).members?.length },
                { id: 'files', label: 'Files', icon: Paperclip, count: (activeProjectWorkspace as any).files?.length },
                { id: 'activity', label: 'Activity', icon: ActivityIcon },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProjectWorkspaceTab(tab.id)}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                    projectWorkspaceTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {(tab as any).count !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                      {(tab as any).count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section: Overview */}
          {projectWorkspaceTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-4">
                <div className="p-4 rounded-xl border border-border bg-card">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Description & Objectives
                  </h4>
                  <p className="text-xs text-foreground leading-relaxed">
                    {activeProjectWorkspace.description || 'No description provided for this project.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Milestone Progress & Velocity
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Overall Project Completion</span>
                      <span>{activeProjectWorkspace.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${activeProjectWorkspace.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border text-center text-xs">
                    <div>
                      <span className="block font-bold text-foreground text-base">{(activeProjectWorkspace as any).totalTasks || 0}</span>
                      <span className="text-[10px] text-muted-foreground">Total Tasks</span>
                    </div>
                    <div>
                      <span className="block font-bold text-emerald-600 text-base">{(activeProjectWorkspace as any).completedTasks || 0}</span>
                      <span className="text-[10px] text-muted-foreground">Completed</span>
                    </div>
                    <div>
                      <span className="block font-bold text-blue-600 text-base">{(activeProjectWorkspace as any).inProgressTasks || 0}</span>
                      <span className="text-[10px] text-muted-foreground">In Progress</span>
                    </div>
                    <div>
                      <span className="block font-bold text-amber-600 text-base">{(activeProjectWorkspace as any).inReviewTasks || 0}</span>
                      <span className="text-[10px] text-muted-foreground">In Review</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 text-xs text-left">
                <h4 className="font-bold text-foreground text-sm border-b border-border pb-2">
                  Project Details
                </h4>
                <div>
                  <span className="block text-muted-foreground text-[11px]">Status</span>
                  <span className="font-semibold text-foreground uppercase">{activeProjectWorkspace.status}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground text-[11px]">Priority</span>
                  <span className="font-semibold text-foreground">{activeProjectWorkspace.priority}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground text-[11px]">Start Date</span>
                  <span className="font-semibold text-foreground">
                    {activeProjectWorkspace.startDate ? new Date(activeProjectWorkspace.startDate).toLocaleDateString() : 'Not scheduled'}
                  </span>
                </div>
                <div>
                  <span className="block text-muted-foreground text-[11px]">Target Completion</span>
                  <span className="font-semibold text-foreground">
                    {activeProjectWorkspace.endDate ? new Date(activeProjectWorkspace.endDate).toLocaleDateString() : 'Not scheduled'}
                  </span>
                </div>
                <div>
                  <span className="block text-muted-foreground text-[11px]">Project Manager</span>
                  <span className="font-semibold text-foreground">{activeProjectWorkspace.managerName || 'Unassigned'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Tasks */}
          {projectWorkspaceTab === 'tasks' && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-3">Assignee</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Progress</th>
                    <th className="py-3 px-3">Deadline</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {((activeProjectWorkspace as any).tasks || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        No tasks inside this project yet.
                      </td>
                    </tr>
                  ) : (
                    ((activeProjectWorkspace as any).tasks || []).map((t: any) => (
                      <tr
                        key={t.id}
                        onClick={() => fetchTaskDetail(t.id)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                      >
                        <td className="py-3 px-4 font-semibold text-foreground">{t.title}</td>
                        <td className="py-3 px-3">
                          {t.assignee?.user ? `${t.assignee.user.firstName} ${t.assignee.user.lastName}` : 'Unassigned'}
                        </td>
                        <td className="py-3 px-3">{getStatusBadge(t.status, t.isOverdue)}</td>
                        <td className="py-3 px-3">{t.sla?.progress || 0}%</td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'None'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className="px-2 py-1 rounded-md border border-border text-[11px] font-semibold"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Members */}
          {projectWorkspaceTab === 'members' && (
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-foreground">Project Roster & Collaborators</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {((activeProjectWorkspace as any).members || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground col-span-full py-6 text-center">
                    No members assigned to this project yet.
                  </p>
                ) : (
                  ((activeProjectWorkspace as any).members || []).map((m: any) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-border bg-background flex items-center gap-3"
                    >
                      <UserAvatar
                        avatarUrl={m.user?.avatarUrl}
                        firstName={m.user?.firstName}
                        lastName={m.user?.lastName}
                        seed={m.id}
                        size="sm"
                      />
                      <div className="truncate text-left">
                        <span className="block font-semibold text-xs text-foreground truncate">
                          {m.user?.firstName} {m.user?.lastName}
                        </span>
                        <span className="block text-[10px] text-muted-foreground truncate">
                          {m.designation?.title || 'Team Member'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Section: Files */}
          {projectWorkspaceTab === 'files' && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <h4 className="font-bold text-sm text-foreground">Project Attachments & Documents</h4>
              {((activeProjectWorkspace as any).files || []).length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-xs">
                  No files uploaded to this project yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {((activeProjectWorkspace as any).files || []).map((f: any) => (
                    <div key={f.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-foreground">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground">({f.size})</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Activity */}
          {projectWorkspaceTab === 'activity' && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <h4 className="font-bold text-sm text-foreground">Project History & Timeline</h4>
              <div className="divide-y divide-border text-xs">
                {((activeProjectWorkspace as any).activity || []).length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  ((activeProjectWorkspace as any).activity || []).map((act: any, idx: number) => (
                    <div key={act.id || idx} className="py-2.5 flex items-start gap-2.5 text-left">
                      <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">{act.details || act.action}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TEAM WORK VIEW (Manager / Lead Scoped) */}
      {/* ========================================================================= */}
      {mainView === 'team_work' && !activeProjectWorkspace && (
        <div className="space-y-4">
          {/* Team Work Filters */}
          <div className="p-3 rounded-xl border border-border bg-card flex flex-wrap items-center gap-2.5 text-xs">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search team tasks..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-border bg-background text-xs"
              />
            </div>

            <select
              value={teamMemberFilter}
              onChange={(e) => setTeamMemberFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-xs"
            >
              <option value="ALL">All Team Members</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user?.firstName} {m.user?.lastName}
                </option>
              ))}
            </select>

            <select
              value={teamProjectFilter}
              onChange={(e) => setTeamProjectFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-xs"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={teamStatusFilter}
              onChange={(e) => setTeamStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="COMPLETED">Done</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          {/* Team Tasks Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-3">Assignee</th>
                  <th className="py-3 px-3">Project</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Progress</th>
                  <th className="py-3 px-3">Deadline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teamWorkTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No team tasks found matching your filters.
                    </td>
                  </tr>
                ) : (
                  teamWorkTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => fetchTaskDetail(t.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="py-3 px-4 font-semibold text-foreground">{t.title}</td>
                      <td className="py-3 px-3">
                        {t.assignee?.user ? `${t.assignee.user.firstName} ${t.assignee.user.lastName}` : 'Unassigned'}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{t.project?.name || 'Standalone'}</td>
                      <td className="py-3 px-3">{getStatusBadge(t.status, t.isOverdue)}</td>
                      <td className="py-3 px-3">{t.progress}%</td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {t.dueDate ? (
                          <span className={t.isOverdue ? 'text-rose-600 font-semibold' : ''}>
                            {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          'None'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="px-2 py-1 rounded-md border border-border text-[11px] font-semibold"
                        >
                          Review / Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TASK DETAIL DRAWER / MODAL */}
      {/* ========================================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-2xs p-0 sm:p-4">
          <div className="w-full sm:max-w-xl h-full sm:h-[92vh] sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 text-left">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">
                  {selectedTask.project?.key ? `${selectedTask.project.key} • ` : ''}TASK-{selectedTask.id ? selectedTask.id.slice(0, 6) : ''}
                </span>
                {getStatusBadge(selectedTask.status, selectedTask.isOverdue)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-md text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              <div>
                <h3 className="text-lg font-bold text-foreground leading-snug">{selectedTask.title}</h3>
                <p className="text-muted-foreground mt-1.5 leading-relaxed">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

              {/* Extension Request Alert if Pending */}
              {selectedTask.extensionRequest && selectedTask.extensionRequest.status === 'PENDING' && (
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Clock className="h-4 w-4 text-amber-600" />
                    Deadline Extension Requested
                  </div>
                  <p className="text-xs">
                    Proposed New Deadline: <strong>{selectedTask.extensionRequest?.proposedDeadline ? new Date(selectedTask.extensionRequest.proposedDeadline).toLocaleDateString() : 'N/A'}</strong>
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Reason: {selectedTask.extensionRequest.reason}
                  </p>
                  {isManagerOrAdmin && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleReviewExtension(selectedTask.id, 'APPROVE')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
                      >
                        Approve Extension
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewExtension(selectedTask.id, 'REJECT')}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Progress & Milestone Tracking */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">Completion Progress</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{selectedTask.progress ?? 0}%</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProgressForm({ progress: selectedTask.progress ?? 0, comment: '' });
                        setProgressModalOpen(true);
                      }}
                      className="px-2 py-0.5 rounded-md border border-border text-[10px] font-semibold hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Update %
                    </button>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${selectedTask.progress ?? 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Mode: {selectedTask.progressMode === 'SUBTASK' ? 'Subtask-calculated automatic progress' : 'Manual percentage updates'}
                </p>
              </div>

              {/* Subtasks Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Subtasks Checklist</h4>
                </div>

                <div className="space-y-1.5">
                  {(selectedTask.subtasks || []).map((sub: any, idx: number) => {
                    const subId = typeof sub === 'string' ? `sub_${idx}` : (sub.id || `sub_${idx}`);
                    const subTitle = typeof sub === 'string' ? sub : (sub.title || '');
                    const isDone = typeof sub === 'string' ? false : Boolean(sub.isCompleted);
                    return (
                      <div
                        key={subId}
                        className="flex items-center justify-between p-2 rounded-lg border border-border/80 bg-background hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={(e) => handleToggleSubtask(selectedTask.id, subId, e.target.checked)}
                            className="h-3.5 w-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className={`text-xs ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {subTitle}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(selectedTask.id, subId)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as any;
                      handleAddSubtask(selectedTask.id, form.title.value);
                      form.reset();
                    }}
                    className="flex gap-2 pt-1"
                  >
                    <input
                      name="title"
                      type="text"
                      placeholder="Add a new subtask..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>

              {/* Action Buttons for Review / Completion / Extension */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/40 dark:bg-slate-800/20 space-y-2">
                <span className="font-bold text-xs text-foreground block">Lifecycle Actions</span>
                <div className="flex flex-wrap gap-2">
                  {/* Submit for review button */}
                  {selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'IN_REVIEW' && selectedTask.reviewRequired && (
                    <button
                      type="button"
                      onClick={() => handleSubmitForReview(selectedTask.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Submit for Review
                    </button>
                  )}

                  {/* Manager Review Controls */}
                  {selectedTask.status === 'IN_REVIEW' && isManagerOrAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReviewDecision(selectedTask.id, true)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve & Mark Done
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const feedback = prompt('Enter revisions / rework feedback:');
                          if (feedback !== null) {
                            handleReviewDecision(selectedTask.id, false, feedback);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reject to Rework
                      </button>
                    </>
                  )}

                  {/* Direct completion if review not required */}
                  {selectedTask.status !== 'COMPLETED' && !selectedTask.reviewRequired && (
                    <button
                      type="button"
                      onClick={() => handleDirectComplete(selectedTask.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark as Done
                    </button>
                  )}

                  {/* Request Extension button */}
                  {selectedTask.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => setExtensionModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-slate-800 text-foreground text-xs font-semibold cursor-pointer hover:bg-slate-100"
                    >
                      Request Deadline Extension
                    </button>
                  )}
                </div>
              </div>

              {/* Activity History */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Activity Timeline</h4>
                <div className="p-3 rounded-xl border border-border bg-card divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {(selectedTask.activityLog || []).map((act: any, idx: number) => (
                    <div key={idx} className="py-2 text-[11px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-foreground">{act.action}</span>
                        <span>{act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">{typeof act.details === 'object' ? JSON.stringify(act.details) : act.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discussion & Comments */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Comments & Discussion</h4>
                <div className="space-y-2">
                  {(selectedTask.comments || []).map((comm: any) => (
                    <div key={comm.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                        <span>{comm.authorName}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {comm.createdAt ? new Date(comm.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{comm.text}</p>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={newCommentInput}
                      onChange={(e) => setNewCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedTask.id)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddComment(selectedTask.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE PROJECT */}
      {/* ========================================================================= */}
      {createProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-2xl overflow-hidden p-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Create New Project</h3>
              <button
                type="button"
                onClick={() => setCreateProjectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Redesign 2026"
                  value={newProjectForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const key = name.slice(0, 4).toUpperCase();
                    setNewProjectForm((prev) => ({ ...prev, name, key: prev.key || key }));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Project Key *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WEB"
                    value={newProjectForm.key}
                    onChange={(e) => setNewProjectForm((prev) => ({ ...prev, key: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Department</label>
                  <select
                    value={newProjectForm.departmentId}
                    onChange={(e) => setNewProjectForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs cursor-pointer"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Project Manager</label>
                <select
                  value={newProjectForm.managerMembershipId}
                  onChange={(e) => setNewProjectForm((prev) => ({ ...prev, managerMembershipId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs cursor-pointer"
                >
                  <option value="">Select Manager</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user?.firstName} {m.user?.lastName} ({m.designation?.title || 'Member'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newProjectForm.startDate}
                    onChange={(e) => setNewProjectForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={newProjectForm.endDate}
                    onChange={(e) => setNewProjectForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Priority</label>
                  <select
                    value={newProjectForm.priority}
                    onChange={(e) => setNewProjectForm((prev) => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Initial Status</label>
                  <select
                    value={newProjectForm.status}
                    onChange={(e) => setNewProjectForm((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs cursor-pointer"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Outline key goals, deliverables and project constraints..."
                  value={newProjectForm.description}
                  onChange={(e) => setNewProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Create Project & Open Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE TASK */}
      {/* ========================================================================= */}
      {createTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-2xl overflow-hidden p-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Create New Task</h3>
              <button
                type="button"
                onClick={() => setCreateTaskModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement OAuth Authentication"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Project (Optional)</label>
                  <select
                    value={newTaskForm.projectId}
                    onChange={(e) => setNewTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs cursor-pointer"
                  >
                    <option value="">Standalone Task (No Project)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Assignee</label>
                  <select
                    value={newTaskForm.assigneeMembershipId}
                    onChange={(e) => setNewTaskForm((prev) => ({ ...prev, assigneeMembershipId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs cursor-pointer"
                  >
                    <option value="">Assign Later</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.firstName} {m.user?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newTaskForm.startDate}
                    onChange={(e) => setNewTaskForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Priority</label>
                <select
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm((prev) => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Details, acceptance criteria and steps..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              {/* Review Required Checkbox */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-border">
                <input
                  type="checkbox"
                  id="chkReview"
                  checked={newTaskForm.reviewRequired}
                  onChange={(e) => setNewTaskForm((prev) => ({ ...prev, reviewRequired: e.target.checked }))}
                  className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="chkReview" className="font-semibold text-xs text-foreground cursor-pointer">
                  Requires Manager Review before marking as Done
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DEADLINE EXTENSION REQUEST */}
      {/* ========================================================================= */}
      {extensionModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-2xl p-5 text-left">
            <h3 className="font-bold text-sm text-foreground mb-1">Request Deadline Extension</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Current deadline: {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'None'}.
              Responsible manager will be alerted for approval.
            </p>

            <form onSubmit={handleRequestExtension} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Proposed New Deadline *</label>
                <input
                  type="date"
                  required
                  value={extensionForm.proposedDeadline}
                  onChange={(e) => setExtensionForm((p) => ({ ...p, proposedDeadline: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Reason for Extension *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why extra time is needed (e.g. unexpected dependency, API revisions)..."
                  value={extensionForm.reason}
                  onChange={(e) => setExtensionForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setExtensionModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPDATE PROGRESS */}
      {/* ========================================================================= */}
      {progressModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-2xl p-5 text-left">
            <h3 className="font-bold text-sm text-foreground mb-1">Update Completion Percentage</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Update manual progress for "{selectedTask.title}".
            </p>

            <form onSubmit={handleUpdateProgress} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Progress Percentage</span>
                  <span className="text-blue-600 font-bold">{progressForm.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressForm.progress}
                  onChange={(e) => setProgressForm((p) => ({ ...p, progress: parseInt(e.target.value, 10) }))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Progress Notes / Comment</label>
                <input
                  type="text"
                  placeholder="Optional note on what was completed..."
                  value={progressForm.comment}
                  onChange={(e) => setProgressForm((p) => ({ ...p, comment: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
