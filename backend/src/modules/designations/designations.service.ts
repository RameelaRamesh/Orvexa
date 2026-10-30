import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    return this.prisma.designation.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { memberships: true } },
      },
    });
  }

  async create(workspaceId: string, title: string, level?: number, description?: string) {
    return this.prisma.designation.create({
      data: { workspaceId, title, level: level || 1, description },
    });
  }

  async update(id: string, workspaceId: string, data: { title?: string; level?: number; description?: string }) {
    await this.prisma.designation.updateMany({
      where: { id, workspaceId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.level !== undefined ? { level: Number(data.level) || 1 } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
      },
    });
    return this.prisma.designation.findFirst({
      where: { id, workspaceId },
      include: {
        _count: { select: { memberships: true } },
      },
    });
  }

  async delete(id: string, workspaceId: string) {
    return this.prisma.designation.deleteMany({
      where: { id, workspaceId },
    });
  }
}
