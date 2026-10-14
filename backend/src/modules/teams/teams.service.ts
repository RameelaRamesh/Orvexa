import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    return this.prisma.team.findMany({
      where: { workspaceId },
      include: {
        department: true,
        leadMembership: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        _count: { select: { memberships: true } },
      },
    });
  }

  async create(
    workspaceId: string,
    data: { name: string; departmentId?: string; description?: string; leadMembershipId?: string },
  ) {
    return this.prisma.team.create({
      data: {
        workspaceId,
        name: data.name,
        departmentId: data.departmentId,
        description: data.description,
        leadMembershipId: data.leadMembershipId,
      },
    });
  }

  async update(
    id: string,
    workspaceId: string,
    data: { name?: string; departmentId?: string; description?: string; leadMembershipId?: string },
  ) {
    return this.prisma.team.updateMany({
      where: { id, workspaceId },
      data,
    });
  }

  async delete(id: string, workspaceId: string) {
    return this.prisma.team.deleteMany({
      where: { id, workspaceId },
    });
  }
}
