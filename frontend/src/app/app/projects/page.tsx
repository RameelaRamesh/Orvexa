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

  // Filters
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
    priority: 'MEDIUM',
    dueDate: '',
    startDate: '',
    estimatedHours: '',
  });

  // Selected Work Item Detail View
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedNewDepId, setSelectedNewDepId] = useState('');

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
      const [projRes, taskRes, memRes, wfRulesRes, wfExecsRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/projects`, { headers }),
        fetch(`${BRANDING.apiUrl}/tasks`, { headers }),
        fetch(`${BRANDING.apiUrl}/people`, { headers }),
        fetch(`${BRANDING.apiUrl}/tasks/workflows/rules`, { headers }),
        fetch(`${BRANDING.apiUrl}/tasks/workflows/executions`, { headers }),
      ]);

      const [projData, taskData, memData, wfRulesData, wfExecsData] = await Promise.all([
        projRes.json(),
        taskRes.json(),
        memRes.json(),
        wfRulesRes.json(),
        wfExecsRes.json(),
      ]);

      setProjects(projData?.data !== undefined ? projData.data : (Array.isArray(projData) ? projData : []));
      setTasks(taskData?.data !== undefined ? taskData.data : (Array.isArray(taskData) ? taskData : []));
      setTeamMembers(memData?.data !== undefined ? memData.data : (Array.isArray(memData) ? memData : []));
      setWorkflowRules(wfRulesData?.data !== undefined ? wfRulesData.data : (Array.isArray(wfRulesData) ? wfRulesData : []));
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
    } catch (err: any) {
      toast.error(err.message || 'Error loading work item details');
    } finally {
      setTaskDetailLoading(false);
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
        assigneeMembershipId: newTask.assigneeMembershipId || undefined,
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
        priority: 'MEDIUM',
        dueDate: '',
        startDate: '',
        estimatedHours: '',
      });
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
  const filteredTasks = tasks.filter((t) => {
    if (selectedProjectId === 'STANDALONE' && t.projectId) return false;
    if (selectedProjectId !== 'ALL' && selectedProjectId !== 'STANDALONE' && t.projectId !== selectedProjectId) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
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
          <CheckSquare className="h-4 w-4" /> Work Items &amp; Tasks ({tasks.length})
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
              All Work Items ({tasks.length})
            </button>
            <button
              onClick={() => setSelectedProjectId('STANDALONE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedProjectId === 'STANDALONE'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:bg-surface-secondary'
              }`}
            >
              Standalone Tasks ({tasks.filter((t) => !t.projectId).length})
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedProjectId === p.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-foreground hover:bg-surface-secondary'
                }`}
              >
                {p.key}: {p.name}
              </button>
            ))}
          </div>

          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground w-60"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
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
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
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
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-surface-secondary/50">
                      <th className="py-3.5 px-4">Work Item Title</th>
                      <th className="py-3.5 px-4">Context / Project</th>
                      <th className="py-3.5 px-4">Assignee</th>
                      <th className="py-3.5 px-4">Progress</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-secondary/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                            {t.title}
                            {t.isRework && (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                REWORK #{t.reworkCount}
                              </Badge>
                            )}
                          </div>
                          {t.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {t.project ? (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              {t.project.key}: {t.project.name}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[11px]">
                              Standalone
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-foreground">
                          {t.assignee?.user ? (
                            <span>{t.assignee.user.firstName} {t.assignee.user.lastName}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all"
                              style={{ width: `${t.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">{t.progress || 0}%</span>
                        </td>
                        <td className="py-3.5 px-4">
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
                        </td>
                        <td className="py-3.5 px-4">
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
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openTaskDetail(t.id)} className="text-xs gap-1">
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
              {selectedTask.status === 'IN_REVIEW' && (
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
              {selectedTask.status !== 'COMPLETED' && (
                <Button
                  size="sm"
                  onClick={() => handleAction('complete', {}, 'Work Item Completed')}
                  className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Complete Work
                </Button>
              )}
              {selectedTask.status === 'COMPLETED' && (
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
              <div className="md:col-span-2 space-y-3">
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
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
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

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <select
                      value={selectedNewDepId}
                      onChange={(e) => setSelectedNewDepId(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded border border-border bg-background text-foreground flex-1"
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
                    <Button size="sm" onClick={handleAddDependency} disabled={!selectedNewDepId} className="text-xs">
                      Add Blocker
                    </Button>
                  </div>
                </div>

                {/* Discussions & Comments Thread */}
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
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
                  <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-border">
                    <input
                      type="text"
                      placeholder="Add an update or discuss with team..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 rounded border border-border bg-background text-foreground"
                    />
                    <Button size="sm" type="submit" disabled={!newCommentText.trim()} className="gap-1 text-xs">
                      <Send className="h-3.5 w-3.5" /> Post
                    </Button>
                  </form>
                </div>
              </div>

              {/* Sidebar Metadata */}
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-card space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold">Assignee:</span>
                    <div className="text-foreground mt-0.5 font-medium">
                      {selectedTask.assignee?.user ? (
                        `${selectedTask.assignee.user.firstName} ${selectedTask.assignee.user.lastName}`
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </div>
                  </div>
                  <div>
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
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
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
                        {p.key}: {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-xs font-semibold text-muted-foreground">Assignee</label>
                  <select
                    value={newTask.assigneeMembershipId}
                    onChange={(e) => setNewTask({ ...newTask, assigneeMembershipId: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.firstName} {m.user?.lastName} ({m.department?.name || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <label className="text-xs font-semibold text-muted-foreground">Project Key (Short Prefix) *</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="INFRA"
                  value={newProject.key}
                  onChange={(e) => setNewProject({ ...newProject, key: e.target.value.toUpperCase() })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground mt-1"
                />
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
