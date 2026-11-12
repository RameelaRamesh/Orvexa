import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../database/prisma.service';
import {
  resolveMemberScopeContext,
  resolveMemberEffectivePermissions,
  satisfiesPermissionCode,
} from '../utils/scope.util';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private satisfiesPermission(userPermissionCodes: string[], perm: string): boolean {
    return satisfiesPermissionCode(userPermissionCodes, perm);
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

    if (membership) {
      const basePermissionCodes =
        membership.role?.permissions
          ?.map((rp: { permission?: { code: string }; code?: string }) => rp.permission?.code || rp.code)
          .filter((c): c is string => Boolean(c)) || [];

      const effectiveWsId = membership.workspaceId || request.workspaceId || '';
      let wsSettings: Record<string, any> | null = null;
      if (effectiveWsId && (this.prisma as any)?.workspace?.findUnique) {
        const wsRec = await (this.prisma as any).workspace
          .findUnique({
            where: { id: effectiveWsId },
            select: { settings: true },
          })
          ?.catch?.(() => null);
        if (wsRec?.settings && typeof wsRec.settings === 'object') {
          wsSettings = wsRec.settings as Record<string, any>;
        }
      }

      const userPermissionCodes = resolveMemberEffectivePermissions(
        basePermissionCodes,
        membership.id,
        wsSettings,
      );

      const resolvedScope = await resolveMemberScopeContext(
        this.prisma,
        effectiveWsId,
        membership,
        wsSettings,
      );
      const effectiveTeamId =
        membership.teamId || resolvedScope.ledTeamIds[0] || resolvedScope.scopedTeamIds[0] || undefined;

      // Attach userContext to request for downstream services and tenant-scoped queries
      request.userContext = {
        membershipId: membership.id,
        userId: membership.userId,
        accessRole: membership.accessRole,
        roleId: membership.roleId,
        roleName: membership.role?.name,
        dataScope: resolvedScope.effectiveDataScope,
        departmentId: membership.departmentId,
        teamId: effectiveTeamId,
        scopedTeamIds: resolvedScope.scopedTeamIds,
        ledTeamIds: resolvedScope.ledTeamIds,
        permissions: userPermissionCodes,
        memberPermissionOverrides: wsSettings?.memberPermissionOverrides?.[membership.id] || null,
      };
    }

    if (!hasRequiredAll && !hasRequiredAny) {
      return true;
    }

    if (!membership) {
      throw new ForbiddenException('Workspace membership context required for permission check');
    }

    const userPermissionCodes: string[] = request.userContext?.permissions || [];

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
