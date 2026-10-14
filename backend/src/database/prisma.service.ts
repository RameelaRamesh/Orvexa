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

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
