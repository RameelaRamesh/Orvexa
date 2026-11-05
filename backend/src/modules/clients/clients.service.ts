import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    return this.prisma.client.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { projects: true, workItems: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    workspaceId: string,
    data: { name: string; code?: string; companyName?: string; contactEmail?: string; contactPhone?: string },
  ) {
    return this.prisma.client.create({
      data: {
        workspaceId,
        name: data.name,
        code: data.code,
        companyName: data.companyName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
    });
  }
}
