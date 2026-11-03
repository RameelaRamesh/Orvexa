'use client';

import React, { useEffect, useState } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  CheckSquare,
  Briefcase,
  Calendar,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Send,
  MessageSquare,
  Activity,
  Layers,
  Link as LinkIcon,
  CheckCircle,
  Clock,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  Settings,
  RefreshCw,
  X,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<'work_items' | 'workflows'>('work_items');
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [workflowRules, setWorkflowRules] = useState<any[]>([]);
  const [workflowExecutions, setWorkflowExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User Context for assignment scoping
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.id || '';
    } catch {
      return '';
    }
  });
  const [currentMembershipId, setCurrentMembershipId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      const ws = localStorage.getItem('activeWorkspaceId');
      const mem = (p.memberships || []).find((m: any) => m.workspaceId === ws) || p.memberships?.[0];
      return mem?.id || '';
    } catch {
      return '';
    }
  });
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.email || '';
    } catch {
      return '';
    }
  });
  const [currentFirstName, setCurrentFirstName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.firstName || '';
    } catch {
      return '';
    }
  });
  const [currentLastName, setCurrentLastName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('orvexa_cached_profile') || '{}');
      return p.lastName || '';
    } catch {
      return '';
    }
  });

  // Filters & Scope Toggles
  const [assignmentScope, setAssignmentScope] = useState<'MY_RELEVANT' | 'ASSIGNED_TO_ME' | 'ASSIGNED_BY_ME' | 'ALL'>('MY_RELEVANT');
  const [statusToggle, setStatusToggle] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', key: '', description: '' });

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [isStandaloneTask, setIsStandaloneTask] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    projectId: '',
    assigneeMembershipId: '',
    assigneeMembershipIds: [] as string[],
    priority: 'MEDIUM',
    dueDate: '',
    startDate: '',
    estimatedHours: '',
  });
  const [assigneeFilterText, setAssigneeFilterText] = useState('');

  // Selected Work Item Detail View
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedNewDepId, setSelectedNewDepId] = useState('');
  const [showEditAssignees, setShowEditAssignees] = useState(false);
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('MEMBER');
  const [savingAssignees, setSavingAssignees] = useState(false);

  // Workflow Rule Modal
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'ON_STATUS_CHANGE',
    field: 'status',
    operator: 'EQUALS',
    value: 'IN_REVIEW',
    actionType: 'SEND_NOTIFICATION',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

  const loadAllData = async () => {
    if (!token || !wsId) return;
    try {
      const headers = { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId };
      const [projRes, taskRes, memRes, wfRulesRes, wfExecsRes, meRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/projects`, { headers }),
        fetch(`${BRANDING.apiUrl}/tasks`, { headers }),
        fetch(`${BRANDING.apiUrl}/people`, { headers }),
        fetch(`${BRANDING.apiUrl}/tasks/workflows/rules`, { headers }),
        fetch(`${BRANDING.apiUrl}/tasks/workflows/executions`, { headers }),
        fetch(`${BRANDING.apiUrl}/auth/me`, { headers }),
      ]);

      const [projData, taskData, memData, wfRulesData, wfExecsData, meData] = await Promise.all([
        projRes.json(),
        taskRes.json(),
        memRes.json(),
        wfRulesRes.json(),
        wfExecsRes.json(),
        meRes.json(),
      ]);

      setProjects(projData?.data !== undefined ? projData.data : (Array.isArray(projData) ? projData : []));
      setTasks(taskData?.data !== undefined ? taskData.data : (Array.isArray(taskData) ? taskData : []));
      setTeamMembers(memData?.data !== undefined ? memData.data : (Array.isArray(memData) ? memData : []));
      setWorkflowRules(wfRulesData?.data !== undefined ? wfRulesData.data : (Array.isArray(wfRulesData) ? wfRulesData : []));

      const userObj = meData?.data?.user || meData?.data || {};
      const memberships = meData?.data?.memberships || userObj?.memberships || [];
      const activeMem = memberships.find((m: any) => m.workspaceId === wsId) || memberships[0];
      if (userObj?.id) setCurrentUserId(userObj.id);
      if (userObj?.email) setCurrentUserEmail(userObj.email);
      if (userObj?.firstName) setCurrentFirstName(userObj.firstName);
      if (userObj?.lastName) setCurrentLastName(userObj.lastName);
      if (activeMem?.id) setCurrentMembershipId(activeMem.id);
      if (activeMem?.accessRole) {
        setCurrentRole(activeMem.accessRole);
      }
      setWorkflowExecutions(wfExecsData?.data !== undefined ? wfExecsData.data : (Array.isArray(wfExecsData) ? wfExecsData : []));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const taskIdFromUrl = params.get('taskId');
      if (taskIdFromUrl) {
        openTaskDetail(taskIdFromUrl);
      }
    }
  }, []);

  const openTaskDetail = async (id: string) => {
    setTaskDetailLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId! },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const payload = data?.data !== undefined ? data.data : data;
      setSelectedTask(payload);
      setShowEditAssignees(false);
      const currentIds: string[] = Array.isArray(payload.assigneeMembershipIds) && payload.assigneeMembershipIds.length > 0
        ? payload.assigneeMembershipIds
        : (payload.assigneeMembershipId ? [payload.assigneeMembershipId] : []);
      setEditAssigneeIds(currentIds);
    } catch (err: any) {
      toast.error(err.message || 'Error loading work item details');
    } finally {
      setTaskDetailLoading(false);
    }
  };

  const getMemberDisplayName = (m: any): string => {
    if (!m) return 'Team Member';
    if (m.user) {
      const full = `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim();
      if (full) return full;
      if (m.user.email) return m.user.email;
    }
    return m.email || 'Team Member';
  };

  const getMemberRoleName = (m: any): string => {
    if (!m) return 'Member';
    if (typeof m.designation === 'string' && m.designation) return m.designation;
    if (m.designation && typeof m.designation === 'object' && m.designation.title) return String(m.designation.title);
    if (typeof m.role === 'string' && m.role) return m.role;
    return 'Member';
  };

  const getMemberDeptName = (m: any): string => {
    if (!m) return 'General';
    if (typeof m.department === 'string' && m.department) return m.department;
    if (m.department && typeof m.department === 'object' && m.department.name) return String(m.department.name);
    return 'General';
  };

  const getTaskAssignees = (task: any) => {
    if (!task) return [];
    const ids: string[] = Array.isArray(task.assigneeMembershipIds) && task.assigneeMembershipIds.length > 0
      ? task.assigneeMembershipIds
      : (task.assigneeMembershipId ? [task.assigneeMembershipId] : []);
    const safeMembers = Array.isArray(teamMembers) ? teamMembers.filter(Boolean) : [];
    const found = safeMembers.filter((m) => m && ids.includes(m.id));
    if (found.length === 0 && task.assignee) {
      return [task.assignee];
    }
    return found;
  };

  const getTaskAssigner = (task: any) => {
    if (!task) return null;
    const safeMembers = Array.isArray(teamMembers) ? teamMembers.filter(Boolean) : [];
    const creatorId = task.creatorMembershipId || (task.sla as any)?.creatorMembershipId;
    if (creatorId) {
      const found = safeMembers.find((m) => m && (m.id === creatorId || m.userId === creatorId));
      if (found) return found;
    }
    if (Array.isArray(task.activityLog) && task.activityLog.length > 0) {
      const createdLog = task.activityLog.find((a: any) => a.action === 'CREATED') || task.activityLog[0];
      if (createdLog?.actorId && createdLog.actorId !== 'SYSTEM') {
        const found = safeMembers.find((m) => m && (m.id === createdLog.actorId || m.userId === createdLog.actorId));
        if (found) return found;
      }
    }
    // Fallback to workspace Owner or Admin if task was created during setup
    const ownerOrAdmin = safeMembers.find((m) => m && (m.accessRole === 'OWNER' || m.accessRole === 'ADMIN'));
    return ownerOrAdmin || null;
  };

  const isTaskAssignedToMe = (task: any) => {
    if (!task) return false;
    const memId = currentMembershipId;
    const usrId = currentUserId;
    const usrEmail = (currentUserEmail || '').toLowerCase();

    // 1. Direct assignee membership ID
    if (memId && task.assigneeMembershipId === memId) return true;
    if (memId && task.assignee?.id === memId) return true;

    // 2. Assignee user ID or email
    if (usrId && task.assignee?.userId === usrId) return true;
    if (usrId && task.assignee?.user?.id === usrId) return true;
    if (usrEmail && task.assignee?.user?.email?.toLowerCase() === usrEmail) return true;

    // 3. Multi-assignee arrays
    const assigneeIds = Array.isArray(task.assigneeMembershipIds)
      ? task.assigneeMembershipIds
      : Array.isArray((task.sla as any)?.assigneeMembershipIds)
      ? (task.sla as any).assigneeMembershipIds
      : [];
    if (memId && assigneeIds.includes(memId)) return true;

    // 4. Collaborators
    const collabIds = Array.isArray(task.collaboratorIds) ? task.collaboratorIds : [];
    if (memId && collabIds.includes(memId)) return true;

    return false;
  };

  const isTaskAssignedByMe = (task: any) => {
    if (!task) return false;
    const memId = currentMembershipId;
    const usrId = currentUserId;
    const usrEmail = (currentUserEmail || '').toLowerCase();
    const fullName = `${currentFirstName} ${currentLastName}`.trim().toLowerCase();

    // 1. Creator membership or user ID in task metadata
    const creatorId = task.creatorMembershipId || (task.sla as any)?.creatorMembershipId;
    if (memId && creatorId === memId) return true;
    if (usrId && creatorId === usrId) return true;

    const creatorUserId = (task.sla as any)?.creatorUserId;
    if (usrId && creatorUserId === usrId) return true;

    // 2. Activity log created actor
    if (Array.isArray(task.activityLog) && task.activityLog.length > 0) {
      const createdLog = task.activityLog.find((a: any) => a.action === 'CREATED') || task.activityLog[0];
      if (createdLog?.actorId) {
        if (memId && createdLog.actorId === memId) return true;
        if (usrId && createdLog.actorId === usrId) return true;
      }
    }

    // 3. Resolved assigner match
    const assigner = getTaskAssigner(task);
    if (assigner) {
      if (memId && assigner.id === memId) return true;
      if (usrId && assigner.userId === usrId) return true;
      if (usrEmail && assigner.user?.email?.toLowerCase() === usrEmail) return true;
      const assignerName = getMemberDisplayName(assigner).trim().toLowerCase();
      if (fullName && assignerName && assignerName === fullName) return true;
    }

    return false;
  };

  const handleSaveAssignees = async () => {
    if (!selectedTask) return;
    setSavingAssignees(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({
          assigneeMembershipIds: editAssigneeIds,
          assigneeMembershipId: editAssigneeIds[0] || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update assignees');
      toast.success('Assignees updated successfully');
      setShowEditAssignees(false);
      await openTaskDetail(selectedTask.id);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error updating assignees');
    } finally {
      setSavingAssignees(false);
    }
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BRANDING.apiUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify(newProject),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Project created successfully!');
      setShowCreateProjectModal(false);
      setNewProject({ name: '', key: '', description: '' });
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating project');
    }
  };

  // Create Work Item (Standalone or Linked)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        dueDate: newTask.dueDate || undefined,
        startDate: newTask.startDate || undefined,
        estimatedHours: newTask.estimatedHours ? Number(newTask.estimatedHours) : undefined,
        assigneeMembershipId: newTask.assigneeMembershipIds.length > 0 ? newTask.assigneeMembershipIds[0] : (newTask.assigneeMembershipId || undefined),
        assigneeMembershipIds: newTask.assigneeMembershipIds,
        collaboratorIds: newTask.assigneeMembershipIds,
        projectId: isStandaloneTask ? undefined : newTask.projectId || undefined,
      };

      const res = await fetch(`${BRANDING.apiUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(isStandaloneTask ? 'Standalone work item created!' : 'Project task created!');
      setShowCreateTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        projectId: '',
        assigneeMembershipId: '',
        assigneeMembershipIds: [],
        priority: 'MEDIUM',
        dueDate: '',
        startDate: '',
        estimatedHours: '',
      });
      setAssigneeFilterText('');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating task');
    }
  };

  // Lifecycle Actions
  const handleAction = async (endpoint: string, body: any = {}, successMsg = 'Action completed') => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${selectedTask.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(successMsg);
      await openTaskDetail(selectedTask.id);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({ text: newCommentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Comment added');
      setNewCommentText('');
      await openTaskDetail(selectedTask.id);
    } catch (err: any) {
      toast.error(err.message || 'Error adding comment');
    }
  };

  const handleAddDependency = async () => {
    if (!selectedNewDepId || !selectedTask) return;
    try {
      const currentDeps = selectedTask.dependsOnTaskIds || [];
      const updatedDeps = [...currentDeps, selectedNewDepId];

      const res = await fetch(`${BRANDING.apiUrl}/tasks/${selectedTask.id}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify({ dependsOnTaskIds: updatedDeps }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Dependency added successfully');
      setSelectedNewDepId('');
      await openTaskDetail(selectedTask.id);
    } catch (err: any) {
      toast.error(err.message || 'Error adding dependency');
    }
  };

  const handleCreateWorkflowRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newRule.name,
        trigger: newRule.trigger,
        conditions: [
          { field: newRule.field, operator: newRule.operator, value: newRule.value },
        ],
        actions: [
          { type: newRule.actionType, payload: { title: `Automated Workflow: ${newRule.name}` } },
        ],
        isActive: true,
      };

      const res = await fetch(`${BRANDING.apiUrl}/tasks/workflows/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId!,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Workflow automation rule configured!');
      setShowWorkflowModal(false);
      setNewRule({
        name: '',
        trigger: 'ON_STATUS_CHANGE',
        field: 'status',
        operator: 'EQUALS',
        value: 'IN_REVIEW',
        actionType: 'SEND_NOTIFICATION',
      });
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Error configuring workflow rule');
    }
  };

  const handleRetryExecution = async (execId: string) => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/tasks/workflows/executions/${execId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-workspace-id': wsId! },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Workflow execution re-evaluated');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Retry failed');
    }
  };

  // Filter Tasks
  const isManagerOrAdmin = currentRole === 'MANAGER' || currentRole === 'ADMIN' || currentRole === 'OWNER';

  const isTaskInAssignmentScope = (task: any, scope: 'MY_RELEVANT' | 'ASSIGNED_TO_ME' | 'ASSIGNED_BY_ME' | 'ALL') => {
    if (scope === 'ALL') return true;
    const assignedToMe = isTaskAssignedToMe(task);
    const assignedByMe = isTaskAssignedByMe(task);
    if (scope === 'ASSIGNED_TO_ME') return assignedToMe;
    if (scope === 'ASSIGNED_BY_ME') return assignedByMe;
    return assignedToMe || assignedByMe;
  };

  // 1. Scoped Tasks based on assignment filter (defaults to assigned to me OR by me)
  const scopedTasks = tasks.filter((t) => isTaskInAssignmentScope(t, assignmentScope));

  // 2. Only show projects that actually have tasks in the current assignment scope
  const visibleProjects = assignmentScope === 'ALL'
    ? projects
    : projects.filter((p) => scopedTasks.some((t) => t.projectId === p.id));

  // 3. Tasks in selected project context
  const tasksInProjectView = scopedTasks.filter((t) => {
    if (selectedProjectId === 'STANDALONE' && t.projectId) return false;
    if (selectedProjectId !== 'ALL' && selectedProjectId !== 'STANDALONE' && t.projectId !== selectedProjectId) return false;
    return true;
  });

  // 4. Counts for the status toggle buttons (All / Pending / Completed)
  const pendingCount = tasksInProjectView.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
  const completedCount = tasksInProjectView.filter((t) => t.status === 'COMPLETED').length;
  const allCount = tasksInProjectView.length;

  // 5. Final filtered tasks list
  const filteredTasks = tasksInProjectView.filter((t) => {
    // Status Toggle
    if (statusToggle === 'PENDING' && (t.status === 'COMPLETED' || t.status === 'CANCELLED')) return false;
    if (statusToggle === 'COMPLETED' && t.status !== 'COMPLETED') return false;

    // Detailed Status dropdown
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

    // Priority filter
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Universal Work Engine &amp; Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configurable work items, independent or project-linked tasks, circular dependency checks, and durable workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateTaskModal(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Add Work Item
          </Button>
          <Button variant="outline" onClick={() => setShowCreateProjectModal(true)} className="gap-2">
            <Briefcase className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab('work_items')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'work_items'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckSquare className="h-4 w-4" /> Work Items &amp; Tasks ({scopedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'workflows'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" /> Workflow Automation Rules ({workflowRules.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: WORK ITEMS & TASKS
          ========================================================================= */}
      {activeTab === 'work_items' && (
        <div className="space-y-6">
          {/* Projects Bar Overview */}
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedProjectId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedProjectId === 'ALL'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:bg-surface-secondary'
              }`}
            >
              All Work Items ({scopedTasks.length})
            </button>
            <button
              onClick={() => setSelectedProjectId('STANDALONE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedProjectId === 'STANDALONE'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:bg-surface-secondary'
              }`}
            >
              Standalone Tasks ({scopedTasks.filter((t) => !t.projectId).length})
            </button>
            {visibleProjects.map((p) => {
              const projectCount = scopedTasks.filter((t) => t.projectId === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    selectedProjectId === p.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:bg-surface-secondary'
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold tracking-wide ${
                      selectedProjectId === p.id
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}
                  >
                    {p.key}
                  </span>
                  <span>{p.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({projectCount})</span>
                </button>
              );
            })}
          </div>

          {/* Selected Project Details Card */}
          {(() => {
            const activeProj = projects.find((p) => p.id === selectedProjectId);
            if (!activeProj) return null;
            return (
              <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30">
                      {activeProj.key}
                    </Badge>
                    <span className="font-semibold text-foreground text-sm">{activeProj.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{activeProj.status}</Badge>
                  </div>
                  {activeProj.description && (
                    <p className="text-muted-foreground text-xs mt-1">{activeProj.description}</p>
                  )}
                </div>
                <div className="text-left sm:text-right text-muted-foreground text-[11px] shrink-0 space-y-0.5">
                  <div className="flex items-center sm:justify-end gap-1">
                    <Calendar className="h-3 w-3 text-primary inline" />
                    <span>Project Created: <strong className="text-foreground">{new Date(activeProj.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                  {activeProj.priority && (
                    <div>Priority: <strong className="uppercase text-foreground">{activeProj.priority}</strong></div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4 space-y-3.5">
              {/* Row 1: Assignment Scope & Status Toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/60 pb-3">
                {/* Assignment Scope Pills */}
                <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setAssignmentScope('MY_RELEVANT')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      assignmentScope === 'MY_RELEVANT'
                        ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Assigned To / By Me ({tasks.filter((t) => isTaskInAssignmentScope(t, 'MY_RELEVANT')).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentScope('ASSIGNED_TO_ME')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      assignmentScope === 'ASSIGNED_TO_ME'
                        ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Assigned for Me ({tasks.filter((t) => isTaskAssignedToMe(t)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentScope('ASSIGNED_BY_ME')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      assignmentScope === 'ASSIGNED_BY_ME'
                        ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Assigned by Me ({tasks.filter((t) => isTaskAssignedByMe(t)).length})
                  </button>
                  {isManagerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => setAssignmentScope('ALL')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                        assignmentScope === 'ALL'
                          ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All Workspace ({tasks.length})
                    </button>
                  )}
                </div>

                {/* Status Toggle (All / Pending / Completed) */}
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusToggle('ALL');
                      setStatusFilter('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      statusToggle === 'ALL'
                        ? 'bg-background text-foreground shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({allCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusToggle('PENDING');
                      setStatusFilter('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      statusToggle === 'PENDING'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Pending ({pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusToggle('COMPLETED');
                      setStatusFilter('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      statusToggle === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    Completed ({completedCount})
                  </button>
                </div>
              </div>

              {/* Row 2: Search & Detailed Dropdowns */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground w-60 focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      if (e.target.value === 'COMPLETED') setStatusToggle('COMPLETED');
                      else if (e.target.value !== 'ALL') setStatusToggle('PENDING');
                      else setStatusToggle('ALL');
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing <strong>{filteredTasks.length}</strong> task(s)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-surface-secondary/50">
                      <th className="py-3.5 px-4 font-semibold">Work Item Title</th>
                      <th className="py-3.5 px-4 font-semibold">Context / Project</th>
                      <th className="py-3.5 px-4 font-semibold">Assignee</th>
                      <th className="py-3.5 px-4 font-semibold">Progress</th>
                      <th className="py-3.5 px-4 font-semibold">Priority</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-secondary/20 transition-colors">
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                              <span>{t.title}</span>
                              {t.isRework && (
                                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 shrink-0">
                                  REWORK #{t.reworkCount}
                                </Badge>
                              )}
                            </div>
                            {t.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                            )}
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
                              <Clock className="h-3 w-3 inline text-muted-foreground shrink-0" />
                              <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs align-top">
                          {(() => {
                            const projectInfo = t.project || (t.projectId ? projects.find((p) => p.id === t.projectId) : null);
                            const projectCreatedAt = projectInfo?.createdAt;
                            return (
                              <div className="space-y-1.5">
                                <div>
                                  {projectInfo ? (
                                    <Badge variant="secondary" className="text-[11px] font-normal">
                                      {projectInfo.key ? `${projectInfo.key}: ${projectInfo.name}` : projectInfo.name}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[11px] font-normal">
                                      Standalone
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                    <span>Created: <span className="text-foreground/90 font-medium">{projectCreatedAt ? new Date(projectCreatedAt).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}</span></span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <UserCheck className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                    <span>Assigner: <span className="text-foreground/90 font-medium">{getTaskAssigner(t) ? getMemberDisplayName(getTaskAssigner(t)) : 'Workspace Admin'}</span></span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-4 text-xs align-top">
                          {getTaskAssignees(t).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {getTaskAssignees(t).map((m: any) => (
                                <div key={m.id}>
                                  <Badge variant="secondary" className="text-[11px] py-0.5 px-2 font-normal">
                                    {getMemberDisplayName(m)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="w-24 bg-muted rounded-full h-2 overflow-hidden mt-1">
                              <div
                                className="bg-primary h-full transition-all"
                                style={{ width: `${t.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium block">{t.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="mt-0.5">
                            <Badge
                              variant={
                                t.priority === 'URGENT'
                                  ? 'destructive'
                                  : t.priority === 'HIGH'
                                  ? 'outline'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {t.priority}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="mt-0.5">
                            <Badge
                              variant={
                                t.status === 'COMPLETED'
                                  ? 'success'
                                  : t.status === 'IN_REVIEW'
                                  ? 'outline'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {t.status}
                              {t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && ' (Overdue)'}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right align-top">
                          <Button size="sm" variant="ghost" onClick={() => openTaskDetail(t.id)} className="text-xs gap-1 h-8">
                            Inspect <ArrowRight className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredTasks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                          No work items match current filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: WORKFLOW AUTOMATION RULES
          ========================================================================= */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Durable Workflow Automations</h2>
              <p className="text-xs text-muted-foreground">
                Configurable trigger &rarr; safe condition &rarr; action pipeline without arbitrary unsafe code execution
              </p>
            </div>
            <Button size="sm" onClick={() => setShowWorkflowModal(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Workflow Rule
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflowRules.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <Badge variant={r.isActive ? 'success' : 'secondary'}>{r.isActive ? 'Active' : 'Disabled'}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Trigger: <span className="font-semibold text-foreground">{r.trigger}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div>
                    <span className="text-muted-foreground font-semibold">Conditions: </span>
                    {r.conditions?.map((c: any, i: number) => (
                      <span key={i} className="font-mono bg-surface-secondary px-1.5 py-0.5 rounded text-[11px] mr-1">
                        {c.field} {c.operator} {c.value}
                      </span>
                    ))}
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Actions: </span>
                    {r.actions?.map((a: any, i: number) => (
                      <span key={i} className="font-mono bg-surface-secondary px-1.5 py-0.5 rounded text-[11px] mr-1">
                        {a.type}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {workflowRules.length === 0 && (
              <Card className="col-span-full py-10 text-center text-xs text-muted-foreground">
                No custom workflow rules configured. Click &ldquo;Add Workflow Rule&rdquo; to automate task progression.
              </Card>
            )}
          </div>

          {/* Execution History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Workflow Executions</CardTitle>
              <CardDescription>Durable idempotent execution logs with retry diagnostics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-surface-secondary/50">
                      <th className="py-3 px-4">Rule Name</th>
                      <th className="py-3 px-4">Target Task</th>
                      <th className="py-3 px-4">Executed Actions</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workflowExecutions.map((e) => (
                      <tr key={e.id} className="text-xs">
                        <td className="py-3 px-4 font-semibold text-foreground">{e.workflowRuleName}</td>
                        <td className="py-3 px-4 text-muted-foreground">{e.targetTaskTitle}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{e.executedActions?.join(', ') || 'None'}</td>
                        <td className="py-3 px-4">
                          <Badge variant={e.status === 'SUCCESS' ? 'success' : 'destructive'}>{e.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString()}</td>
                        <td className="py-3 px-4 text-right">
                          {e.status === 'FAILED' && (
                            <Button size="sm" variant="outline" onClick={() => handleRetryExecution(e.id)} className="h-7 text-xs gap-1">
                              <RotateCcw className="h-3 w-3" /> Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {workflowExecutions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          No execution records recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          WORK ITEM DETAIL DRAWER / MODAL (REQUIREMENT 11)
          ========================================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedTask.project ? selectedTask.project.name : 'Standalone Work Item'}
                  </Badge>
                  <Badge variant={selectedTask.status === 'COMPLETED' ? 'success' : 'secondary'} className="text-xs">
                    {selectedTask.status}
                  </Badge>
                  <Badge variant={selectedTask.priority === 'URGENT' ? 'destructive' : 'outline'} className="text-xs">
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div className="pt-1">
                  {selectedTask.dueDate && new Date(selectedTask.dueDate) < new Date() && selectedTask.status !== 'COMPLETED' && (
                    <Badge variant="destructive" className="text-xs gap-1 font-semibold animate-pulse mb-1">
                      <AlertTriangle className="h-3 w-3" /> Deadline Missed (Officials Notified)
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-bold text-foreground">{selectedTask.title}</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedTask(null)} className="h-8 w-8 p-0">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Lifecycle Permitted Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-surface-secondary/40 border border-border">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Actions:</span>
              {selectedTask.status !== 'IN_REVIEW' && selectedTask.status !== 'COMPLETED' && (
                <Button size="sm" onClick={() => handleAction('review', {}, 'Submitted for review')} className="text-xs gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Submit for Review
                </Button>
              )}
              {!isManagerOrAdmin && selectedTask.status === 'IN_REVIEW' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Submitted • Awaiting Manager Review &amp; Approval</span>
                </div>
              )}
              {isManagerOrAdmin && selectedTask.status === 'IN_REVIEW' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    const r = prompt('Provide rework feedback / rejection reason:');
                    if (r) handleAction('rework', { reason: r }, 'Returned for rework');
                  }}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reject to Rework
                </Button>
              )}
              {isManagerOrAdmin && selectedTask.status !== 'COMPLETED' && (
                <Button
                  size="sm"
                  onClick={() => handleAction('complete', {}, 'Work Item Completed')}
                  className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Complete Work
                </Button>
              )}
              {isManagerOrAdmin && selectedTask.status === 'COMPLETED' && (
                <Button size="sm" variant="outline" onClick={() => handleAction('reopen', {}, 'Work Item Reopened')} className="text-xs gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Reopen Work
                </Button>
              )}
              {selectedTask.priority !== 'URGENT' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const r = prompt('Reason for escalation:');
                    if (r) handleAction('escalate', { reason: r }, 'Escalated to Urgent');
                  }}
                  className="text-xs gap-1 text-destructive border-destructive/40"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                </Button>
              )}
            </div>

            {/* Description & Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2 space-y-3 min-w-0">
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-surface-secondary/20 p-3.5 rounded-lg border border-border">
                  {selectedTask.description || 'No description provided for this work item.'}
                </div>

                {/* Progress Bar with Documented Meanings */}
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Work Progression</span>
                    <span>{selectedTask.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${selectedTask.progress || 0}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground flex justify-between pt-0.5">
                    <span>0% (Todo)</span>
                    <span>25% (In Progress)</span>
                    <span>75% (In Review)</span>
                    <span>100% (Completed)</span>
                  </div>
                </div>

                {/* Dependencies Section */}
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-primary" /> Blocking Dependencies
                    </div>
                  </div>
                  {selectedTask.dependenciesDetails?.length > 0 ? (
                    <div className="divide-y divide-border">
                      {selectedTask.dependenciesDetails.map((dep: any) => (
                        <div key={dep.id} className="py-1.5 flex items-center justify-between text-xs">
                          <span>{dep.title}</span>
                          <Badge variant={dep.status === 'COMPLETED' ? 'success' : 'destructive'} className="text-[10px]">
                            {dep.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs italic">No blocking dependencies defined.</div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border min-w-0">
                    <select
                      value={selectedNewDepId}
                      onChange={(e) => setSelectedNewDepId(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded border border-border bg-background text-foreground flex-1 min-w-0 truncate focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select task that must complete before this...</option>
                      {tasks
                        .filter((t) => t.id !== selectedTask.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({t.status})
                          </option>
                        ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={handleAddDependency}
                      disabled={!selectedNewDepId}
                      className="shrink-0 text-xs whitespace-nowrap"
                    >
                      Add Blocker
                    </Button>
                  </div>
                </div>

                {/* Discussions & Comments Thread */}
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3 min-w-0 overflow-hidden">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" /> Discussions &amp; Notes
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTask.comments?.map((c: any) => (
                      <div key={c.id} className="p-2.5 rounded bg-surface-secondary/40 border border-border text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span>{c.authorName}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {new Date(c.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-foreground">{c.text}</div>
                      </div>
                    ))}
                    {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                      <div className="text-muted-foreground text-xs italic">No comments yet. Start a discussion below.</div>
                    )}
                  </div>
                  <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-border min-w-0">
                    <input
                      type="text"
                      placeholder="Add an update or discuss with team..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 min-w-0 text-xs px-3 py-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button size="sm" type="submit" disabled={!newCommentText.trim()} className="shrink-0 gap-1 text-xs">
                      <Send className="h-3.5 w-3.5" /> Post
                    </Button>
                  </form>
                </div>
              </div>

              {/* Sidebar Metadata */}
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-card space-y-2 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">
                        Assignees ({getTaskAssignees(selectedTask).length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEditAssignees(!showEditAssignees)}
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        {showEditAssignees ? 'Cancel' : 'Edit'}
                      </button>
                    </div>

                    {!showEditAssignees ? (
                      <div className="text-foreground font-medium flex flex-wrap gap-1">
                        {getTaskAssignees(selectedTask).length > 0 ? (
                          getTaskAssignees(selectedTask).map((m: any) => (
                            <Badge key={m.id} variant="secondary" className="text-xs py-0.5 px-2">
                              {getMemberDisplayName(m)}
                              {getMemberDeptName(m) !== 'General' && (
                                <span className="text-[10px] text-muted-foreground ml-1">({getMemberDeptName(m)})</span>
                              )}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Unassigned</span>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-border bg-surface-secondary/40 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-muted-foreground">Select team members:</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const safeList = Array.isArray(teamMembers) ? teamMembers.filter(Boolean) : [];
                                setEditAssigneeIds(safeList.map((m) => m.id));
                              }}
                              className="text-primary hover:underline"
                            >
                              All
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setEditAssigneeIds([])}
                              className="text-muted-foreground hover:underline"
                            >
                              None
                            </button>
                          </div>
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {(Array.isArray(teamMembers) ? teamMembers.filter(Boolean) : []).map((m) => {
                            const isChecked = Array.isArray(editAssigneeIds) && editAssigneeIds.includes(m.id);
                            return (
                              <label
                                key={m.id}
                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs ${
                                  isChecked ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-background text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const current = editAssigneeIds || [];
                                      setEditAssigneeIds(
                                        isChecked
                                          ? current.filter((id) => id !== m.id)
                                          : [...current, m.id],
                                      );
                                    }}
                                    className="h-3.5 w-3.5 rounded border-border text-primary"
                                  />
                                  <span>{getMemberDisplayName(m)}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {getMemberDeptName(m)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSaveAssignees}
                          disabled={savingAssignees}
                          className="w-full h-7 text-xs"
                        >
                          {savingAssignees ? 'Saving...' : 'Save Assignees'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Context / Project */}
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground font-semibold">Context / Project:</span>
                    <div className="mt-1">
                      {selectedTask.project ? (
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          {selectedTask.project.key}: {selectedTask.project.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          Standalone
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span>
                        Created: <span className="text-foreground/90 font-medium">
                          {selectedTask.project?.createdAt
                            ? new Date(selectedTask.project.createdAt).toLocaleDateString()
                            : new Date(selectedTask.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                    {/* Assigner under Created Date */}
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                      <UserCheck className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span>Assigner: <span className="text-foreground/90 font-medium">{getTaskAssigner(selectedTask) ? getMemberDisplayName(getTaskAssigner(selectedTask)) : 'Workspace Administrator'}</span></span>
                      {getTaskAssigner(selectedTask) && getMemberDeptName(getTaskAssigner(selectedTask)) !== 'General' && (
                        <span className="text-[10px] text-muted-foreground">
                          ({getMemberDeptName(getTaskAssigner(selectedTask))})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Work Item Date Created */}
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground font-semibold">Work Item Created:</span>
                    <div className="text-foreground mt-0.5 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>
                        {new Date(selectedTask.createdAt).toLocaleDateString()} at {new Date(selectedTask.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground font-semibold">Due Date:</span>
                    <div className="text-foreground mt-0.5 font-medium">
                      {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'None set'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Estimated / Actual:</span>
                    <div className="text-foreground mt-0.5 font-medium">
                      {selectedTask.estimatedHours || 0}h est / {selectedTask.actualHours || 0}h actual
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Rework Cycles:</span>
                    <div className="text-foreground mt-0.5 font-medium">
                      {selectedTask.reworkCount || 0} cycle(s)
                    </div>
                  </div>
                </div>

                {/* Activity Log Timeline */}
                <div className="p-3 rounded-lg border border-border bg-card space-y-2 text-xs">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary" /> Activity Timeline
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTask.activityLog?.map((a: any, i: number) => (
                      <div key={i} className="text-[11px] border-l-2 border-primary/40 pl-2 py-0.5">
                        <div className="font-semibold text-foreground">{a.action}</div>
                        <div className="text-muted-foreground">{a.details}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE WORK ITEM
          ========================================================================= */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Create Work Item</h3>
            <p className="text-xs text-muted-foreground">
              Define a standalone organizational task or link to an active project
            </p>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct annual security compliance review"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
              </div>

              {/* Standalone vs Project Toggle */}
              <div className="p-3 rounded-lg border border-border bg-surface-secondary/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">Standalone Work Item</div>
                  <div className="text-[11px] text-muted-foreground">Independent organizational task (no project required)</div>
                </div>
                <input
                  type="checkbox"
                  checked={isStandaloneTask}
                  onChange={(e) => setIsStandaloneTask(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
              </div>

              {!isStandaloneTask && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Select Project *</label>
                  <select
                    required
                    value={newTask.projectId}
                    onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  >
                    <option value="">Select target project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.key}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="8.0"
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
              </div>

              {/* Multi-Select Assignees Section */}
              <div className="space-y-2 border border-border rounded-lg p-3 bg-surface-secondary/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Assignees ({(newTask.assigneeMembershipIds || []).length} selected)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const safeList = Array.isArray(teamMembers) ? teamMembers.filter(Boolean) : [];
                        const allIds = safeList.map((m) => m.id);
                        setNewTask({
                          ...newTask,
                          assigneeMembershipIds: allIds,
                          assigneeMembershipId: allIds[0] || '',
                        });
                      }}
                      className="text-[11px] text-primary hover:underline px-1.5 py-0.5 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground text-xs">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setNewTask({
                          ...newTask,
                          assigneeMembershipIds: [],
                          assigneeMembershipId: '',
                        })
                      }
                      className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Selected members chips */}
                {Array.isArray(newTask.assigneeMembershipIds) && newTask.assigneeMembershipIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-background/80 rounded-md border border-border/60 max-h-24 overflow-y-auto">
                    {newTask.assigneeMembershipIds.map((id) => {
                      const m = Array.isArray(teamMembers) ? teamMembers.find((member) => member?.id === id) : null;
                      const name = m ? getMemberDisplayName(m) : id;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5 rounded-full border border-primary/20"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (newTask.assigneeMembershipIds || []).filter((item) => item !== id);
                              setNewTask({
                                ...newTask,
                                assigneeMembershipIds: updated,
                                assigneeMembershipId: updated[0] || '',
                              });
                            }}
                            className="hover:text-destructive transition-colors ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Filter input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search members by name, email, or dept..."
                    value={assigneeFilterText}
                    onChange={(e) => setAssigneeFilterText(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-border bg-background text-foreground"
                  />
                </div>

                {/* Scrollable member checklist */}
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {(Array.isArray(teamMembers) ? teamMembers.filter(Boolean) : [])
                    .filter((m) => {
                      if (!assigneeFilterText.trim()) return true;
                      const q = assigneeFilterText.toLowerCase();
                      const fullName = getMemberDisplayName(m).toLowerCase();
                      const email = (m.user?.email || m.email || '').toLowerCase();
                      const dept = getMemberDeptName(m).toLowerCase();
                      const role = getMemberRoleName(m).toLowerCase();
                      return (
                        fullName.includes(q) ||
                        email.includes(q) ||
                        dept.includes(q) ||
                        role.includes(q)
                      );
                    })
                    .map((m) => {
                      const isSelected = (newTask.assigneeMembershipIds || []).includes(m.id);
                      const fullName = getMemberDisplayName(m);
                      const dept = getMemberDeptName(m);
                      const role = getMemberRoleName(m);
                      const initial = (m.user?.firstName?.[0] || m.user?.email?.[0] || m.email?.[0] || 'U').toUpperCase();

                      return (
                        <label
                          key={m.id}
                          className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border-primary/40 text-foreground'
                              : 'bg-background hover:bg-muted/40 border-border/60 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const current = newTask.assigneeMembershipIds || [];
                                let updated: string[];
                                if (e.target.checked) {
                                  updated = [...current, m.id];
                                } else {
                                  updated = current.filter((id) => id !== m.id);
                                }
                                setNewTask({
                                  ...newTask,
                                  assigneeMembershipIds: updated,
                                  assigneeMembershipId: updated[0] || '',
                                });
                              }}
                              className="h-3.5 w-3.5 rounded border-border"
                            />
                            <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                              {initial}
                            </div>
                            <div>
                              <div className="font-medium text-foreground text-xs leading-none">{fullName}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {m.user?.email || m.email || 'No email'} • {dept}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                            {role}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  rows={3}
                  placeholder="Task scope and deliverables..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCreateTaskModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Create Work Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE WORKFLOW RULE
          ========================================================================= */}
      {showWorkflowModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Add Workflow Automation</h3>
            <p className="text-xs text-muted-foreground">
              Define safe rules triggered automatically upon work item lifecycle events
            </p>

            <form onSubmit={handleCreateWorkflowRule} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notify QA on Review Submission"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Trigger Event</label>
                <select
                  value={newRule.trigger}
                  onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                >
                  <option value="ON_STATUS_CHANGE">On Status Change</option>
                  <option value="ON_CREATE">On Task Created</option>
                  <option value="ON_REWORK">On Rework Rejection</option>
                  <option value="ON_DUE_DATE_APPROACHING">On Due Date Approaching</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Condition Field</label>
                  <input
                    type="text"
                    value={newRule.field}
                    onChange={(e) => setNewRule({ ...newRule, field: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Target Value</label>
                  <input
                    type="text"
                    value={newRule.value}
                    onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Action to Dispatch</label>
                <select
                  value={newRule.actionType}
                  onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                >
                  <option value="SEND_NOTIFICATION">Send Notification to Assignee</option>
                  <option value="CREATE_APPROVAL_REQUEST">Create Approval Request</option>
                  <option value="ESCALATE">Escalate Priority to Urgent</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowWorkflowModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save Workflow Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infrastructure Upgrade"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Project Key / Prefix *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MARKETING, IOS-DEV, APP-2026"
                  value={newProject.key}
                  onChange={(e) => setNewProject({ ...newProject, key: e.target.value.toUpperCase() })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1 font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Unique project prefix / identifier. No character limit restriction.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Scope details..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCreateProjectModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
