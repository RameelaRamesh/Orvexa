import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProjectStatus, PriorityLevel } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, status?: ProjectStatus) {
    const where: any = { workspaceId };
    if (status) where.status = status;

    return this.prisma.project.findMany({
      where,
      include: {
        client: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(
    workspaceId: string,
    data: {
      name: string;
      key: string;
      clientId?: string;
      description?: string;
      priority?: PriorityLevel;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.prisma.project.create({
      data: {
        workspaceId,
        name: data.name,
        key: data.key.toUpperCase(),
        clientId: data.clientId,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        startDate: data.startDate,
        endDate: data.endDate,
      },
      include: { client: true },
    });
  }

  async update(
    id: string,
    workspaceId: string,
    data: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      priority?: PriorityLevel;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.prisma.project.updateMany({
      where: { id, workspaceId },
      data,
    });
  }
}
