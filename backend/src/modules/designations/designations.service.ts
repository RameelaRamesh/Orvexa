import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface DesignationPermissionConfig {
  departmentId?: string | null;
  defaultAccessRole?: string;
  defaultDataScope?: string;
  defaultRoleId?: string | null;
  permissionCodes?: string[];
  autoSyncRole?: boolean;
}

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getWorkspaceDesignationConfigs(workspaceId: string): Promise<{ settings: any; configs: Record<string, DesignationPermissionConfig> }> {
    const ws = await (this.prisma as any).workspace?.findUnique?.({
      where: { id: workspaceId },
      select: { settings: true },
    })?.catch(() => null);
    const settings = (ws?.settings as any) || {};
    const configs: Record<string, DesignationPermissionConfig> = settings.designationConfigs || {};
    return { settings, configs };
  }

  private async syncDesignationCustomRole(
    workspaceId: string,
    title: string,
    existingRoleId: string | null | undefined,
    permissionCodes: string[],
    dataScope?: string,
  ): Promise<string | null> {
    try {
      const roleModel = (this.prisma as any).role;
      const permModel = (this.prisma as any).permission;
      const rpModel = (this.prisma as any).rolePermission;
      if (!roleModel || !permModel || !rpModel) return existingRoleId || null;

      const allPerms = await permModel.findMany({
        where: { code: { in: permissionCodes } },
      }).catch(() => []);
      const permIds = (allPerms || []).map((p: any) => p.id).filter(Boolean);

      const desiredRoleName = `${title.trim()} Role`;
      let targetRole: any = null;

      if (existingRoleId) {
        targetRole = await roleModel.findFirst({
          where: { id: existingRoleId, workspaceId, isSystemRole: false },
        }).catch(() => null);
      }
      if (!targetRole) {
        targetRole = await roleModel.findFirst({
          where: { workspaceId, name: { equals: desiredRoleName, mode: 'insensitive' }, isSystemRole: false },
        }).catch(() => null);
      }

      if (!targetRole) {
        targetRole = await roleModel.create({
          data: {
            workspaceId,
            name: desiredRoleName,
            description: `Configured permission profile for ${title.trim()} designation`,
            isSystemRole: false,
          },
        }).catch(() => null);
      }

      if (!targetRole) return existingRoleId || null;

      await rpModel.deleteMany({ where: { roleId: targetRole.id } }).catch(() => null);
      if (permIds.length > 0) {
        await rpModel.createMany({
          data: permIds.map((permissionId: string) => ({
            roleId: targetRole.id,
            permissionId,
          })),
          skipDuplicates: true,
        }).catch(() => null);
      }

      if (dataScope && (this.prisma as any).workspace?.findUnique && (this.prisma as any).workspace?.update) {
        const ws = await (this.prisma as any).workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } }).catch(() => null);
        if (ws) {
          const settings = (ws.settings as any) || {};
          await (this.prisma as any).workspace.update({
            where: { id: workspaceId },
            data: {
              settings: {
                ...settings,
                roleDataScopes: {
                  ...(settings.roleDataScopes || {}),
                  [targetRole.id]: dataScope,
                },
              },
            },
          }).catch(() => null);
        }
      }

      return targetRole.id;
    } catch {
      return existingRoleId || null;
    }
  }

  private enrichDesignation(desig: any, configs: Record<string, DesignationPermissionConfig>) {
    const cfg = configs[desig.id] || {};
    return {
      ...desig,
      departmentId: cfg.departmentId ?? null,
      defaultAccessRole: cfg.defaultAccessRole || 'MEMBER',
      defaultDataScope: cfg.defaultDataScope || 'ASSIGNED',
      defaultRoleId: cfg.defaultRoleId ?? null,
      permissionCodes: Array.isArray(cfg.permissionCodes) ? cfg.permissionCodes : [],
      autoSyncRole: cfg.autoSyncRole !== false,
    };
  }

  async list(workspaceId: string) {
    const [list, { configs }] = await Promise.all([
      this.prisma.designation.findMany({
        where: { workspaceId },
        include: {
          _count: { select: { memberships: true } },
        },
      }),
      this.getWorkspaceDesignationConfigs(workspaceId),
    ]);

    return (list || []).map((d: any) => this.enrichDesignation(d, configs));
  }

  async create(
    workspaceId: string,
    title: string,
    level?: number,
    description?: string,
    config?: DesignationPermissionConfig,
  ) {
    const cleanTitle = (title || '').trim();
    const desig = await this.prisma.designation.create({
      data: { workspaceId, title: cleanTitle, level: Number(level) || 1, description },
    });

    const hasConfig =
      config &&
      (config.departmentId !== undefined ||
        config.defaultAccessRole !== undefined ||
        config.defaultDataScope !== undefined ||
        config.defaultRoleId !== undefined ||
        config.permissionCodes !== undefined);

    if (hasConfig && (this.prisma as any).workspace?.update) {
      let resolvedRoleId = config.defaultRoleId || null;
      const permCodes = Array.isArray(config.permissionCodes) ? config.permissionCodes : [];

      if (permCodes.length > 0) {
        resolvedRoleId = await this.syncDesignationCustomRole(
          workspaceId,
          cleanTitle,
          resolvedRoleId,
          permCodes,
          config.defaultDataScope,
        );
      }

      const { settings, configs } = await this.getWorkspaceDesignationConfigs(workspaceId);
      const nextCfg: DesignationPermissionConfig = {
        departmentId: config.departmentId || null,
        defaultAccessRole: config.defaultAccessRole || (Number(level) >= 3 ? 'MANAGER' : 'MEMBER'),
        defaultDataScope: config.defaultDataScope || (Number(level) >= 3 ? 'TEAM' : 'ASSIGNED'),
        defaultRoleId: resolvedRoleId,
        permissionCodes: permCodes,
        autoSyncRole: config.autoSyncRole !== false,
      };

      await (this.prisma as any).workspace.update({
        where: { id: workspaceId },
        data: {
          settings: {
            ...settings,
            designationConfigs: {
              ...configs,
              [desig.id]: nextCfg,
            },
          },
        },
      }).catch(() => null);

      return this.enrichDesignation(desig, { [desig.id]: nextCfg });
    }

    return desig;
  }

  async update(
    id: string,
    workspaceId: string,
    data: {
      title?: string;
      level?: number;
      description?: string;
      departmentId?: string | null;
      defaultAccessRole?: string;
      defaultDataScope?: string;
      defaultRoleId?: string | null;
      permissionCodes?: string[];
      autoSyncRole?: boolean;
    },
  ) {
    await this.prisma.designation.updateMany({
      where: { id, workspaceId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.level !== undefined ? { level: Number(data.level) || 1 } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
      },
    });

    const updated = await this.prisma.designation.findFirst({
      where: { id, workspaceId },
      include: {
        _count: { select: { memberships: true } },
      },
    });

    if (!updated) return null;

    const hasConfigUpdate =
      data.departmentId !== undefined ||
      data.defaultAccessRole !== undefined ||
      data.defaultDataScope !== undefined ||
      data.defaultRoleId !== undefined ||
      data.permissionCodes !== undefined ||
      data.autoSyncRole !== undefined;

    const { settings, configs } = await this.getWorkspaceDesignationConfigs(workspaceId);
    const prevCfg = configs[id] || {};

    if (hasConfigUpdate && (this.prisma as any).workspace?.update) {
      const nextPermCodes = data.permissionCodes !== undefined ? data.permissionCodes : (prevCfg.permissionCodes || []);
      const nextScope = data.defaultDataScope !== undefined ? data.defaultDataScope : (prevCfg.defaultDataScope || 'ASSIGNED');
      let resolvedRoleId = data.defaultRoleId !== undefined ? data.defaultRoleId : prevCfg.defaultRoleId;

      if (data.permissionCodes !== undefined && nextPermCodes.length > 0) {
        resolvedRoleId = await this.syncDesignationCustomRole(
          workspaceId,
          updated.title,
          resolvedRoleId,
          nextPermCodes,
          nextScope,
        );
      }

      const nextCfg: DesignationPermissionConfig = {
        ...prevCfg,
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
        ...(data.defaultAccessRole !== undefined ? { defaultAccessRole: data.defaultAccessRole } : {}),
        ...(data.defaultDataScope !== undefined ? { defaultDataScope: nextScope } : {}),
        defaultRoleId: resolvedRoleId ?? null,
        permissionCodes: nextPermCodes,
        ...(data.autoSyncRole !== undefined ? { autoSyncRole: data.autoSyncRole } : {}),
      };

      await (this.prisma as any).workspace.update({
        where: { id: workspaceId },
        data: {
          settings: {
            ...settings,
            designationConfigs: {
              ...configs,
              [id]: nextCfg,
            },
          },
        },
      }).catch(() => null);

      return this.enrichDesignation(updated, { [id]: nextCfg });
    }

    return this.enrichDesignation(updated, configs);
  }

  async delete(id: string, workspaceId: string) {
    const res = await this.prisma.designation.deleteMany({
      where: { id, workspaceId },
    });
    try {
      const { settings, configs } = await this.getWorkspaceDesignationConfigs(workspaceId);
      if (configs[id] && (this.prisma as any).workspace?.update) {
        const nextConfigs = { ...configs };
        delete nextConfigs[id];
        await (this.prisma as any).workspace.update({
          where: { id: workspaceId },
          data: { settings: { ...settings, designationConfigs: nextConfigs } },
        }).catch(() => null);
      }
    } catch {}
    return res;
  }
}
