import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let AuthGuard handle unauthenticated requests first
    }

    const rawWorkspaceId =
      request.headers['x-workspace-id'] ||
      request.params?.workspaceId ||
      request.query?.workspaceId;

    const workspaceId =
      rawWorkspaceId &&
      rawWorkspaceId !== 'undefined' &&
      rawWorkspaceId !== 'null' &&
      rawWorkspaceId !== ''
        ? (rawWorkspaceId as string)
        : undefined;

    if (!workspaceId) {
      const defaultMembership = await this.prisma.membership.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          department: true,
          team: true,
          designation: true,
        },
      });

      if (!defaultMembership) {
        throw new ForbiddenException('No active workspace membership found');
      }

      request.workspaceId = defaultMembership.workspaceId;
      request.membershipId = defaultMembership.id;
      request.membership = defaultMembership;

      return true;
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        workspaceId,
        status: 'ACTIVE',
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        department: true,
        team: true,
        designation: true,
      },
    });

    if (!membership) {
      // STRICT TENANT ISOLATION: No cross-tenant fallback allowed
      throw new ForbiddenException('Tenant access denied or inactive membership');
    }

    request.workspaceId = membership.workspaceId;
    request.membershipId = membership.id;
    request.membership = membership;

    return true;
  }
}
