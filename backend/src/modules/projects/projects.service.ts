import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProjectStatus, PriorityLevel } from '@prisma/client';
import {
  isTargetWithinScope,
  resolveEffectiveScope,
  resolveLedTeamIds,
} from '../../common/utils/access-scope.util';

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

  private isProjectVisibleToActor(
    projectId: string,
    meta: any,
    memberships: any[],
    projTasks: any[],
    userContext: any,
    ledTeamIds: string[],
  ): boolean {
    if (!userContext) return true;
    const effectiveScope = resolveEffectiveScope(userContext);
    if (effectiveScope === 'GLOBAL') return true;

    const memId = userContext.membershipId;
    const memberIds: string[] = meta.memberMembershipIds || [];
    const isDirect =
      (memId && meta.managerMembershipId === memId) ||
      (memId && memberIds.includes(memId)) ||
      (memId && projTasks.some((t: any) => t.assigneeMembershipId === memId));
    if (isDirect) return true;
    if (effectiveScope === 'ASSIGNED') return false;

    if (effectiveScope === 'DEPARTMENT') {
      if (!userContext.departmentId) return false;
      if (meta.departmentId) return meta.departmentId === userContext.departmentId;
      const involvedMems = memberships.filter(
        (m) => m.id === meta.managerMembershipId || memberIds.includes(m.id) || projTasks.some((t: any) => t.assigneeMembershipId === m.id),
      );
      return involvedMems.some((m) => m.departmentId === userContext.departmentId);
    }

    // TEAM scope
    if (meta.departmentId && userContext.departmentId && meta.departmentId !== userContext.departmentId) {
      return false;
    }
    const managerMem = meta.managerMembershipId ? memberships.find((m) => m.id === meta.managerMembershipId) : null;
    if (managerMem && isTargetWithinScope(userContext, managerMem, ledTeamIds)) return true;
    const teamMembersInProj = memberships.filter((m) => memberIds.includes(m.id));
    if (teamMembersInProj.some((m) => isTargetWithinScope(userContext, m, ledTeamIds))) return true;
    const taskAssignees = memberships.filter((m) => projTasks.some((t: any) => t.assigneeMembershipId === m.id));
    return taskAssignees.some((m) => isTargetWithinScope(userContext, m, ledTeamIds));
  }

  async list(workspaceId: string, status?: ProjectStatus, userContext?: any) {
    const where: any = { workspaceId };
    if (status) where.status = status;

    const [projects, tasks, memberships, departments, allMeta, ledTeamIds] = await Promise.all([
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
        select: { id: true, projectId: true, status: true, assigneeMembershipId: true },
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
      userContext?.membershipId ? resolveLedTeamIds(this.prisma, workspaceId, userContext.membershipId) : Promise.resolve([]),
    ]);

    const visibleProjects = userContext
      ? projects.filter((proj) => {
          const meta = allMeta[proj.id] || {};
          const projTasks = tasks.filter((t) => t.projectId === proj.id);
          return this.isProjectVisibleToActor(proj.id, meta, memberships, projTasks, userContext, ledTeamIds);
        })
      : projects;

    return visibleProjects.map((proj) => {
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
      };
    });
  }

  async getById(id: string, workspaceId: string, userContext?: any) {
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
    if (userContext) {
      const ledTeamIds = await resolveLedTeamIds(this.prisma, workspaceId, userContext.membershipId);
      if (!this.isProjectVisibleToActor(id, meta, memberships, tasks, userContext, ledTeamIds)) {
        throw new ForbiddenException('Access denied: This project is outside your team or department visibility scope');
      }
    }
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
      tasks,
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
