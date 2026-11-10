import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';
import { buildUserContextFromMembership, hasAllPermissions } from '../utils/access-scope.util';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    let membership = request.membership;

    if (!requiredPermissions || requiredPermissions.length === 0) {
      if (membership && !request.userContext) {
        request.userContext = buildUserContextFromMembership(membership);
      }
      return true;
    }

    if (!membership && request.user?.id) {
      const rawWsId =
        request.headers['x-workspace-id'] ||
        request.params?.workspaceId ||
        request.query?.workspaceId;

      const workspaceId =
        rawWsId && rawWsId !== 'undefined' && rawWsId !== 'null' && rawWsId !== ''
          ? (rawWsId as string)
          : undefined;

      membership = await this.prisma.membership.findFirst({
        where: {
          userId: request.user.id,
          ...(workspaceId ? { workspaceId } : {}),
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

      if (membership) {
        request.membership = membership;
        request.workspaceId = membership.workspaceId;
        request.membershipId = membership.id;
      }
    }

    if (!membership) {
      throw new ForbiddenException('Workspace membership context required for permission check');
    }

    // Attach unified userContext with permissionCodes & permission-derived effectiveScope
    const userContext = buildUserContextFromMembership(membership);
    request.userContext = userContext;

    // Platform-level security controls: OWNER holds root organization authority for recovery protection
    if (membership.accessRole === 'OWNER') {
      return true;
    }

    // Role lifecycle check: if role is deactivated, permissions are inactive
    if (!userContext.isRoleActive) {
      throw new ForbiddenException(
        `Role "${membership.role?.name || 'Assigned Role'}" is currently deactivated. Access denied.`,
      );
    }

    const hasPermission = hasAllPermissions(userContext, requiredPermissions);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient workspace permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
