import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    return this.prisma.department.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { memberships: true, teams: true } },
      },
    });
  }

  async create(workspaceId: string, name: string, code?: string, description?: string) {
    return this.prisma.department.create({
      data: { workspaceId, name, code, description },
    });
  }

  async update(id: string, workspaceId: string, data: { name?: string; code?: string; description?: string }) {
    await this.prisma.department.updateMany({
      where: { id, workspaceId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code || null } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
      },
    });
    return this.prisma.department.findFirst({
      where: { id, workspaceId },
    });
  }

  async delete(id: string, workspaceId: string) {
    return this.prisma.department.deleteMany({
      where: { id, workspaceId },
    });
  }
}
