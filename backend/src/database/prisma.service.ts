import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

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
  }

  async onModuleInit() {
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Prisma connected to PostgreSQL successfully');
        await this.autoSyncOwnerCredentials();
        return;
      } catch (error: any) {
        if (attempt === maxRetries) {
          this.logger.error(
            `Prisma failed to connect to PostgreSQL after ${maxRetries} attempts: ${error?.message || error}`,
          );
        } else {
          this.logger.warn(
            `Prisma connection attempt ${attempt}/${maxRetries} failed, retrying in 2s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
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
      } else {
        const currentOwner = await this.user.findFirst({
          where: { email: { equals: 'vattaraofficial@gmail.com', mode: 'insensitive' } },
        });
        if (currentOwner) {
          await this.user.update({
            where: { id: currentOwner.id },
            data: {
              passwordHash,
              status: 'ACTIVE',
              isEmailVerified: true,
              mustChangePassword: false,
            },
          });
          this.logger.log('✔ Synchronized password for vattaraofficial@gmail.com');
        }
      }
    } catch (err: any) {
      this.logger.warn(`Owner sync check note: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
