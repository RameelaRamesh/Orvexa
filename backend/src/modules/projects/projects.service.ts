import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProjectStatus, PriorityLevel } from '@prisma/client';
import { isTaskOverdue } from '../../common/utils/task-overdue.util';
import { getDefaultDataScopeForRole, resolveMemberScopeContext } from '../../common/utils/scope.util';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getWorkspaceProjectMetadata(workspaceId: string): Promise<Record<string, any>> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as Record<string, any>) || {};
    return settings.projectMetadata || {};
  }

  private async saveProjectMetadata(workspaceId: string, projectId: string, data: any) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as Record<string, any>) || {};
    const allMeta = settings.projectMetadata || {};
    allMeta[projectId] = {
      ...(allMeta[projectId] || {}),
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          projectMetadata: allMeta,
        },
      },
    });
    return allMeta[projectId];
  }

  async list(workspaceId: string, status?: ProjectStatus, userContext?: any) {
    const where: any = { workspaceId };
    if (status) where.status = status;

    const [projects, tasks, memberships, departments, allMeta] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          client: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.task.findMany({
        where: { workspaceId, projectId: { not: null } },
        select: { id: true, projectId: true, status: true, assigneeMembershipId: true, sla: true },
      }),
      this.prisma.membership.findMany({
        where: { workspaceId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          designation: { select: { title: true } },
          department: { select: { name: true } },
        },
      }),
      this.prisma.department.findMany({
        where: { workspaceId },
      }),
      this.getWorkspaceProjectMetadata(workspaceId),
    ]);

    const mapped = projects.map((proj) => {
      const meta = allMeta[proj.id] || {};
      const projTasks = tasks.filter((t) => t.projectId === proj.id);
      const totalTasks = projTasks.length;
      const completedTasks = projTasks.filter((t) => t.status === 'COMPLETED').length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const manager = meta.managerMembershipId
        ? memberships.find((m) => m.id === meta.managerMembershipId)
        : null;

      const department = meta.departmentId
        ? departments.find((d) => d.id === meta.departmentId)
        : null;

      const memberIds: string[] = meta.memberMembershipIds || [];
      const members = memberships.filter((m) => memberIds.includes(m.id));

      return {
        ...proj,
        departmentId: meta.departmentId || null,
        departmentName: department?.name || null,
        managerMembershipId: meta.managerMembershipId || null,
        managerName: manager?.user ? `${manager.user.firstName} ${manager.user.lastName}`.trim() : null,
        manager,
        memberMembershipIds: memberIds,
        members,
        progressPercentage,
        totalTasks,
        completedTasks,
        filesCount: (meta.files || []).length,
        _projTasks: projTasks,
        _activity: meta.activity || [],
      };
    });

    const roleUpper = (userContext?.accessRole || '').toUpperCase();
    const isGlobalAdmin = roleUpper === 'OWNER' || roleUpper === 'ADMIN';
    if (!userContext?.membershipId || isGlobalAdmin) {
      return mapped.map(({ _projTasks, _activity, ...p }) => p);
    }

    const resolved = await resolveMemberScopeContext(this.prisma, workspaceId, {
      id: userContext.membershipId,
      accessRole: userContext.accessRole,
      roleId: userContext.roleId,
      dataScope: userContext.dataScope,
      teamId: userContext.teamId,
      departmentId: userContext.departmentId,
      role: userContext.roleName ? { id: userContext.roleId, name: userContext.roleName } : undefined,
    });
    let effectiveScope =
      userContext.dataScope && userContext.dataScope !== 'ASSIGNED' && userContext.dataScope !== 'OWN'
        ? userContext.dataScope
        : resolved.effectiveDataScope || getDefaultDataScopeForRole(roleUpper, userContext.roleName);

    if (effectiveScope === 'GLOBAL' || effectiveScope === 'ALL') {
      return mapped.map(({ _projTasks, _activity, ...p }) => p);
    }

    const allowedTeamIds = Array.from(
      new Set([
        ...(Array.isArray(userContext.scopedTeamIds) ? userContext.scopedTeamIds : []),
        ...resolved.scopedTeamIds,
        ...(userContext.teamId ? [userContext.teamId] : []),
      ].filter(Boolean)),
    );
    const myId = userContext.membershipId;
    const allowedMemberIds = new Set<string>([myId]);
    if (effectiveScope === 'DEPARTMENT') {
      const deptId = userContext.departmentId;
      if (deptId) {
        for (const m of memberships) {
          if (m.departmentId === deptId) allowedMemberIds.add(m.id);
        }
      } else {
        for (const m of memberships) allowedMemberIds.add(m.id);
      }
    } else if (effectiveScope === 'TEAM') {
      for (const m of memberships) {
        if (
          m.reportsToId === myId ||
          (m.teamId && allowedTeamIds.includes(m.teamId)) ||
          (allowedTeamIds.length === 0 && userContext.departmentId && m.departmentId === userContext.departmentId) ||
          (allowedTeamIds.length === 0 && !userContext.departmentId)
        ) {
          allowedMemberIds.add(m.id);
        }
      }
    }

    return mapped
      .filter((p) => {
        if (p.managerMembershipId && allowedMemberIds.has(p.managerMembershipId)) return true;
        if (p.memberMembershipIds.some((id: string) => allowedMemberIds.has(id))) return true;
        if (
          p._activity.some(
            (a: any) => a?.action === 'PROJECT_CREATED' && a?.actorId && allowedMemberIds.has(a.actorId),
          )
        ) {
          return true;
        }
        if (effectiveScope === 'DEPARTMENT' && userContext.departmentId && p.departmentId === userContext.departmentId) {
          return true;
        }
        return p._projTasks.some((t: any) => {
          const sla = (t.sla as any) || {};
          const assignees = [
            t.assigneeMembershipId,
            ...(Array.isArray(sla.assigneeMembershipIds) ? sla.assigneeMembershipIds : []),
          ].filter(Boolean);
          return (
            assignees.some((aId) => allowedMemberIds.has(aId)) ||
            (sla.creatorMembershipId && allowedMemberIds.has(sla.creatorMembershipId)) ||
            (effectiveScope === 'TEAM' && sla.teamId && allowedTeamIds.includes(sla.teamId))
          );
        });
      })
      .map(({ _projTasks, _activity, ...p }) => p);
  }

  async getById(id: string, workspaceId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, workspaceId },
      include: { client: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [tasks, memberships, departments, allMeta] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId: id, workspaceId },
        include: {
          assignee: {
            include: {
              user: { select: { firstName: true, lastName: true, avatarUrl: true, email: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.membership.findMany({
        where: { workspaceId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          designation: { select: { title: true } },
          department: { select: { name: true } },
        },
      }),
      this.prisma.department.findMany({ where: { workspaceId } }),
      this.getWorkspaceProjectMetadata(workspaceId),
    ]);

    const meta = allMeta[id] || {};
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const inReviewTasks = tasks.filter((t) => t.status === 'IN_REVIEW').length;
    const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const manager = meta.managerMembershipId
      ? memberships.find((m) => m.id === meta.managerMembershipId)
      : null;

    const department = meta.departmentId
      ? departments.find((d) => d.id === meta.departmentId)
      : null;

    const memberIds: string[] = meta.memberMembershipIds || [];
    const members = memberships.filter((m) => memberIds.includes(m.id));

    return {
      ...project,
      departmentId: meta.departmentId || null,
      departmentName: department?.name || null,
      department,
      managerMembershipId: meta.managerMembershipId || null,
      managerName: manager?.user ? `${manager.user.firstName} ${manager.user.lastName}`.trim() : null,
      manager,
      memberMembershipIds: memberIds,
      members,
      progressPercentage,
      totalTasks,
      completedTasks,
      inProgressTasks,
      inReviewTasks,
      todoTasks,
      tasks: tasks.map((t) => ({ ...t, isOverdue: isTaskOverdue(t) })),
      files: meta.files || [],
      activity: meta.activity || [],
    };
  }

  async create(
    workspaceId: string,
    data: {
      name: string;
      key: string;
      clientId?: string;
      description?: string;
      departmentId?: string;
      managerMembershipId?: string;
      memberMembershipIds?: string[];
      priority?: PriorityLevel;
      status?: ProjectStatus;
      startDate?: Date | string;
      endDate?: Date | string;
    },
    creatorMembershipId?: string,
  ) {
    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: data.name.trim(),
        key: data.key.trim().toUpperCase(),
        clientId: data.clientId || null,
        description: data.description?.trim() || null,
        priority: data.priority || 'MEDIUM',
        status: data.status || 'ACTIVE',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: { client: true },
    });

    const initialActivity = [
      {
        id: `act_${Date.now()}`,
        action: 'PROJECT_CREATED',
        actorId: creatorMembershipId || 'SYSTEM',
        timestamp: new Date().toISOString(),
        details: `Project "${project.name}" was created`,
      },
    ];

    const memberIds = Array.isArray(data.memberMembershipIds)
      ? data.memberMembershipIds.filter(Boolean)
      : [];

    await this.saveProjectMetadata(workspaceId, project.id, {
      departmentId: data.departmentId || null,
      managerMembershipId: data.managerMembershipId || null,
      memberMembershipIds: memberIds,
      files: [],
      activity: initialActivity,
    });

    // Notify Project Manager
    if (data.managerMembershipId) {
      await this.sendNotification(
        workspaceId,
        data.managerMembershipId,
        'Project Manager Assignment',
        `You have been assigned as the Project Manager for "${project.name}".`,
        `/app/projects?projectId=${project.id}`,
      );
    }

    // Notify Members
    for (const memId of memberIds) {
      if (memId === data.managerMembershipId) continue;
      await this.sendNotification(
        workspaceId,
        memId,
        'Added to Project',
        `You have been added to project "${project.name}".`,
        `/app/projects?projectId=${project.id}`,
      );
    }

    return this.getById(project.id, workspaceId);
  }

  async update(
    id: string,
    workspaceId: string,
    data: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      priority?: PriorityLevel;
      startDate?: Date | string;
      endDate?: Date | string;
      departmentId?: string;
      managerMembershipId?: string;
      memberMembershipIds?: string[];
    },
    actorMembershipId?: string,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.project.updateMany({
        where: { id, workspaceId },
        data: updateData,
      });
    }

    const allMeta = await this.getWorkspaceProjectMetadata(workspaceId);
    const meta = allMeta[id] || {};
    const activity = meta.activity || [];

    if (data.status && data.status !== existing.status) {
      activity.push({
        id: `act_${Date.now()}`,
        action: 'STATUS_CHANGED',
        actorId: actorMembershipId || 'SYSTEM',
        timestamp: new Date().toISOString(),
        details: `Status changed from ${existing.status} to ${data.status}`,
      });
    }

    const updatedMeta: any = { ...meta, activity };
    if (data.departmentId !== undefined) updatedMeta.departmentId = data.departmentId;
    if (data.managerMembershipId !== undefined) updatedMeta.managerMembershipId = data.managerMembershipId;
    if (data.memberMembershipIds !== undefined) updatedMeta.memberMembershipIds = data.memberMembershipIds;

    await this.saveProjectMetadata(workspaceId, id, updatedMeta);

    return this.getById(id, workspaceId);
  }

  async addMember(id: string, workspaceId: string, memberMembershipId: string, actorMembershipId?: string) {
    const allMeta = await this.getWorkspaceProjectMetadata(workspaceId);
    const meta = allMeta[id] || {};
    const memberIds: string[] = meta.memberMembershipIds || [];

    if (!memberIds.includes(memberMembershipId)) {
      memberIds.push(memberMembershipId);
      const activity = meta.activity || [];
      activity.push({
        id: `act_${Date.now()}`,
        action: 'MEMBER_ADDED',
        actorId: actorMembershipId || 'SYSTEM',
        timestamp: new Date().toISOString(),
        details: `Member added to project`,
      });

      await this.saveProjectMetadata(workspaceId, id, {
        ...meta,
        memberMembershipIds: memberIds,
        activity,
      });

      const project = await this.prisma.project.findFirst({ where: { id, workspaceId } });
      await this.sendNotification(
        workspaceId,
        memberMembershipId,
        'Added to Project',
        `You have been added to project "${project?.name || 'Workspace Project'}".`,
        `/app/projects?projectId=${id}`,
      );
    }

    return this.getById(id, workspaceId);
  }

  async removeMember(id: string, workspaceId: string, memberMembershipId: string, actorMembershipId?: string) {
    const allMeta = await this.getWorkspaceProjectMetadata(workspaceId);
    const meta = allMeta[id] || {};
    const memberIds: string[] = (meta.memberMembershipIds || []).filter((m: string) => m !== memberMembershipId);
    const activity = meta.activity || [];
    activity.push({
      id: `act_${Date.now()}`,
      action: 'MEMBER_REMOVED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date().toISOString(),
      details: `Member removed from project`,
    });

    await this.saveProjectMetadata(workspaceId, id, {
      ...meta,
      memberMembershipIds: memberIds,
      activity,
    });

    return this.getById(id, workspaceId);
  }

  async addFile(
    id: string,
    workspaceId: string,
    file: { name: string; url: string; size?: string; type?: string },
    actorMembershipId?: string,
  ) {
    const allMeta = await this.getWorkspaceProjectMetadata(workspaceId);
    const meta = allMeta[id] || {};
    const files: any[] = meta.files || [];
    const newFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      url: file.url,
      size: file.size || '1.2 MB',
      type: file.type || 'DOCUMENT',
      uploadedBy: actorMembershipId || 'SYSTEM',
      uploadedAt: new Date().toISOString(),
    };
    files.push(newFile);

    const activity = meta.activity || [];
    activity.push({
      id: `act_${Date.now()}`,
      action: 'FILE_UPLOADED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date().toISOString(),
      details: `File "${file.name}" uploaded to project`,
    });

    await this.saveProjectMetadata(workspaceId, id, {
      ...meta,
      files,
      activity,
    });

    return newFile;
  }

  async remove(id: string, workspaceId: string) {
    await this.prisma.task.updateMany({
      where: { projectId: id, workspaceId },
      data: { projectId: null },
    });

    return this.prisma.project.deleteMany({
      where: { id, workspaceId },
    });
  }

  private async sendNotification(
    workspaceId: string,
    recipientMembershipId: string,
    title: string,
    message: string,
    link?: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId,
          title,
          message,
          link: link || '/app/projects',
          isRead: false,
        },
      });
    } catch {}
  }
}
