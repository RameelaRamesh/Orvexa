import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private satisfiesPermission(userPermissionCodes: string[], perm: string): boolean {
    if (userPermissionCodes.includes(perm)) return true;

    const [mod] = perm.split(':');
    if (
      userPermissionCodes.includes(`${mod}:manage`) ||
      userPermissionCodes.includes(`${mod}:administer`)
    ) {
      return true;
    }

    if (perm === 'settings:manage' && (userPermissionCodes.includes('org:manage') || userPermissionCodes.includes('workspace:manage'))) return true;
    if (perm === 'org:manage' && (userPermissionCodes.includes('settings:manage') || userPermissionCodes.includes('workspace:manage'))) return true;
    if (perm === 'quality:manage' && userPermissionCodes.includes('quality:review')) return true;
    if (perm === 'quality:review' && userPermissionCodes.includes('quality:manage')) return true;

    return false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredAnyPermissions = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const hasRequiredAll = Array.isArray(requiredPermissions) && requiredPermissions.length > 0;
    const hasRequiredAny = Array.isArray(requiredAnyPermissions) && requiredAnyPermissions.length > 0;

    if (!hasRequiredAll && !hasRequiredAny) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let membership = request.membership;

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

    const userPermissionCodes =
      membership.role?.permissions
        ?.map((rp: { permission?: { code: string }; code?: string }) => rp.permission?.code || rp.code)
        .filter((c): c is string => Boolean(c)) || [];

    // Attach userContext to request for downstream services and tenant-scoped queries
    request.userContext = {
      membershipId: membership.id,
      userId: membership.userId,
      accessRole: membership.accessRole,
      roleId: membership.roleId,
      roleName: membership.role?.name,
      dataScope: membership.dataScope || 'ASSIGNED',
      departmentId: membership.departmentId,
      teamId: membership.teamId,
      permissions: userPermissionCodes,
    };

    // Platform-level security controls: OWNER holds root organization authority for recovery protection
    if (membership.accessRole === 'OWNER') {
      return true;
    }

    // Role lifecycle check: if role is deactivated, permissions are inactive
    const isRoleActive = !membership.role?.description?.startsWith('[DEACTIVATED]');
    if (!isRoleActive) {
      throw new ForbiddenException(
        `Role "${membership.role?.name || 'Assigned Role'}" is currently deactivated. Access denied.`,
      );
    }

    const allOk = !hasRequiredAll || requiredPermissions.every((perm) => this.satisfiesPermission(userPermissionCodes, perm));
    const anyOk = !hasRequiredAny || requiredAnyPermissions.some((perm) => this.satisfiesPermission(userPermissionCodes, perm));

    if (!allOk || !anyOk) {
      const needed = [...(requiredPermissions || []), ...(requiredAnyPermissions || [])];
      throw new ForbiddenException(
        `Insufficient workspace permissions. Required: ${needed.join(', ')}`,
      );
    }

    return true;
  }
}
