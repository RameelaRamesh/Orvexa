import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { InMemoryDatabase } from './in-memory-db';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isDatabaseConnected = false;
  private readonly inMemoryDb = new InMemoryDatabase();

  constructor() {
    const dbUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:vattara%40123@localhost:5432/orvexa_db?schema=public';

    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });

    // Wrap this instance in a Proxy to seamlessly fallback to in-memory collections
    // if the PostgreSQL service is unavailable or rejected credentials.
    return new Proxy(this, {
      get: (target: any, prop: string | symbol, receiver: any) => {
        if (target.isDatabaseConnected) {
          return Reflect.get(target, prop, receiver);
        }

        // Collection proxies for In-Memory Fallback
        const modelMap: Record<string, string> = {
          user: 'users',
          workspace: 'workspaces',
          membership: 'memberships',
          invitation: 'invitations',
          plan: 'plans',
          subscription: 'subscriptions',
          role: 'roles',
          permission: 'permissions',
          rolePermission: 'rolePermissions',
          team: 'teams',
          department: 'departments',
          designation: 'designations',
          notification: 'notifications',
          ticket: 'tickets',
          file: 'files',
          auditLog: 'auditLogs',
          asset: 'assets',
          task: 'tasks',
          workItem: 'workItems',
          project: 'projects',
          leaveRequest: 'leaveRequests',
          leavePolicy: 'leavePolicies',
          leaveBalance: 'leaveBalances',
          shift: 'shifts',
          holiday: 'holidays',
          attendance: 'attendances',
          qualityReview: 'qualityReviews',
          calendarEvent: 'calendarEvents',
          approvalRequest: 'approvalRequests',
          overtimeRequest: 'overtimeRequests',
          invoice: 'invoices',
          payment: 'payments',
          timesheet: 'timesheets',
        };

        if (typeof prop === 'string' && modelMap[prop]) {
          return target.inMemoryDb.makeModelHandler(modelMap[prop]);
        }

        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit() {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.isDatabaseConnected = true;
        this.logger.log('✔ Prisma connected to PostgreSQL successfully');
        await this.autoSyncOwnerCredentials();
        await this.cleanupTestProjects();
        await this.cleanupUnwantedWorkspaces();
        return;
      } catch (error: any) {
        if (attempt === maxRetries) {
          this.isDatabaseConnected = false;
          this.logger.warn(
            `PostgreSQL connection unavailable (${error?.message || 'Auth/Network'}). Active in Local High-Availability In-Memory Mode (Vattara Solutions organization pre-seeded with all roles).`,
          );
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  }

  private async autoSyncOwnerCredentials() {
    try {
      const oldOwner = await this.user.findFirst({
        where: { email: { equals: 'operations@vattara.com', mode: 'insensitive' } },
      });
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('vattara@123', 10);

      if (oldOwner) {
        await this.user.update({
          where: { id: oldOwner.id },
          data: {
            email: 'vattaraofficial@gmail.com',
            passwordHash,
            status: 'ACTIVE',
            isEmailVerified: true,
            mustChangePassword: false,
          },
        });
        this.logger.log('✔ Migrated operations@vattara.com to vattaraofficial@gmail.com');
      }
    } catch (err: any) {
      this.logger.warn(`Owner sync check note: ${err?.message || err}`);
    }
  }

  private async cleanupTestProjects() {
    try {
      const testKeys = ['JUJIJI', 'LK0IHB'];
      const testNames = ['ABC', 'gf4f4tr'];

      const testProjects = await (this as any).project.findMany({
        where: {
          OR: [
            { key: { in: testKeys, mode: 'insensitive' } },
            { name: { in: testNames, mode: 'insensitive' } },
          ],
        },
      });

      if (testProjects && testProjects.length > 0) {
        for (const proj of testProjects) {
          await (this as any).task.updateMany({
            where: { projectId: proj.id },
            data: { projectId: null },
          });
          await (this as any).project.delete({
            where: { id: proj.id },
          });
          this.logger.log(`✔ Automatically cleaned up live test project: [${proj.key}] ${proj.name} (ID: ${proj.id})`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Test project cleanup note: ${err?.message || err}`);
    }
  }

  private async cleanupUnwantedWorkspaces() {
    try {
      const targetWorkspaces = await (this as any).workspace.findMany({
        where: {
          OR: [
            { name: { contains: 'KB Construction', mode: 'insensitive' } },
            { slug: { contains: 'kb-construction', mode: 'insensitive' } },
          ],
        },
      });

      if (targetWorkspaces && targetWorkspaces.length > 0) {
        for (const ws of targetWorkspaces) {
          await (this as any).membership.deleteMany({
            where: { workspaceId: ws.id },
          });
          await (this as any).task.deleteMany({
            where: { workspaceId: ws.id },
          });
          await (this as any).project.deleteMany({
            where: { workspaceId: ws.id },
          });
          await (this as any).role.deleteMany({
            where: { workspaceId: ws.id },
          });
          await (this as any).workspace.delete({
            where: { id: ws.id },
          });
          this.logger.log(`✔ Automatically cleaned up unwanted workspace from live database: ${ws.name} (ID: ${ws.id})`);
        }
      }

      await (this as any).membership.deleteMany({
        where: {
          workspace: {
            OR: [
              { name: { contains: 'KB Construction', mode: 'insensitive' } },
              { slug: { contains: 'kb-construction', mode: 'insensitive' } },
            ],
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Workspace cleanup note: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    if (this.isDatabaseConnected) {
      await this.$disconnect();
    }
  }
}
