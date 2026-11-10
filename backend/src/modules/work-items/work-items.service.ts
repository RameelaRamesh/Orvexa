import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkItemStatus, PriorityLevel } from '@prisma/client';

@Injectable()
export class WorkItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    workspaceId: string,
    filter?: { clientId?: string; status?: WorkItemStatus; assignedMembershipId?: string },
  ) {
    const where: any = { workspaceId };
    if (filter?.clientId) where.clientId = filter.clientId;
    if (filter?.status) where.status = filter.status;
    if (filter?.assignedMembershipId) where.assignedMembershipId = filter.assignedMembershipId;

    return this.prisma.workItem.findMany({
      where,
      include: {
        client: true,
        assignedMembership: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        qualityReviews: { take: 1, orderBy: { reviewedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    workspaceId: string,
    data: {
      title: string;
      clientId?: string;
      batchId?: string;
      quantity?: number;
      targetStage?: string;
      currentStage?: string;
      priority?: PriorityLevel;
      slaDeadline?: Date;
      assignedMembershipId?: string;
      metadata?: any;
    },
  ) {
    return this.prisma.workItem.create({
      data: {
        workspaceId,
        title: data.title,
        clientId: data.clientId,
        batchId: data.batchId,
        quantity: data.quantity || 1,
        targetStage: data.targetStage || 'PROCESSING',
        currentStage: data.currentStage || 'PROCESSING',
        status: 'PENDING',
        priority: data.priority || 'MEDIUM',
        slaDeadline: data.slaDeadline,
        assignedMembershipId: data.assignedMembershipId,
        metadata: data.metadata || {},
      },
      include: { client: true },
    });
  }

  async updateStage(
    id: string,
    workspaceId: string,
    data: {
      currentStage?: string;
      status?: WorkItemStatus;
      processedQuantity?: number;
      assignedMembershipId?: string;
      qaScore?: number;
    },
  ) {
    return this.prisma.workItem.updateMany({
      where: { id, workspaceId },
      data,
    });
  }
}
