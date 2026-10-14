import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SLAService {
  constructor(private readonly prisma: PrismaService) {}

  async listConfigs(workspaceId: string) {
    return this.prisma.sLAConfig.findMany({
      where: { workspaceId },
    });
  }

  async createConfig(
    workspaceId: string,
    data: {
      entityType: string;
      priority?: string;
      maxResolutionMinutes: number;
      warningThresholdPercent?: number;
      escalationOwnerMembershipId?: string;
    },
  ) {
    return this.prisma.sLAConfig.create({
      data: {
        workspaceId,
        entityType: data.entityType,
        priority: data.priority,
        maxResolutionMinutes: Number(data.maxResolutionMinutes),
        warningThresholdPercent: Number(data.warningThresholdPercent || 80),
        escalationOwnerMembershipId: data.escalationOwnerMembershipId,
      },
    });
  }

  async listEscalations(workspaceId: string) {
    return this.prisma.sLAEscalation.findMany({
      where: { workspaceId },
      include: {
        slaConfig: true,
        escalatedTo: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { triggeredAt: 'desc' },
    });
  }
}
