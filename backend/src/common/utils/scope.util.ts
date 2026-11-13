export interface MemberPermissionOverride {
  added?: string[];
  revoked?: string[];
}

export function resolveMemberEffectivePermissions(
  baseCodes: string[],
  membershipId: string,
  settings?: Record<string, any> | null,
): string[] {
  const base = Array.isArray(baseCodes) ? baseCodes.filter(Boolean) : [];
  const overridesMap: Record<string, MemberPermissionOverride> =
    (settings && typeof settings === 'object' ? settings.memberPermissionOverrides : null) || {};
  const override = membershipId ? overridesMap[membershipId] : undefined;
  if (!override) return Array.from(new Set(base));

  const revokedSet = new Set(Array.isArray(override.revoked) ? override.revoked.filter(Boolean) : []);
  const addedList = Array.isArray(override.added) ? override.added.filter(Boolean) : [];
  const merged = new Set<string>(base.filter((c) => !revokedSet.has(c)));
  for (const code of addedList) {
    if (!revokedSet.has(code)) merged.add(code);
  }
  return Array.from(merged);
}

export function satisfiesPermissionCode(userPermissionCodes: string[], perm: string): boolean {
  if (!Array.isArray(userPermissionCodes) || userPermissionCodes.length === 0) return false;
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
  if (perm === 'tasks:complete' && (userPermissionCodes.includes('tasks:review') || userPermissionCodes.includes('tasks:manage'))) return true;

  return false;
}

export function getScopeRank(scope?: string | null): number {
  const upper = (scope || 'ASSIGNED').toUpperCase();
  if (upper === 'GLOBAL' || upper === 'ALL' || upper === 'WORKSPACE') return 4;
  if (upper === 'DEPARTMENT') return 3;
  if (upper === 'TEAM') return 2;
  return 1; // OWN / ASSIGNED
}

export function getDefaultDataScopeForRole(accessRole?: string | null, roleName?: string | null): string {
  const accessUpper = (accessRole || '').toUpperCase();
  const roleUpper = (roleName || '').toUpperCase();
  if (accessUpper === 'OWNER' || accessUpper === 'ADMIN' || roleUpper === 'OWNER' || roleUpper === 'ADMIN') {
    return 'GLOBAL';
  }
  if (roleUpper.includes('DIRECTOR') || roleUpper.includes('HEAD')) {
    return 'DEPARTMENT';
  }
  if (
    accessUpper === 'MANAGER' ||
    roleUpper === 'MANAGER' ||
    roleUpper.includes('LEAD') ||
    roleUpper.includes('SUPERVISOR')
  ) {
    return 'TEAM';
  }
  return 'ASSIGNED';
}

export interface ResolvedScopeContext {
  effectiveDataScope: string;
  scopedTeamIds: string[];
  ledTeamIds: string[];
  isGlobalAdmin: boolean;
}

export async function resolveMemberScopeContext(
  prisma: any,
  workspaceId: string,
  membership: {
    id: string;
    accessRole?: string | null;
    roleId?: string | null;
    dataScope?: string | null;
    teamId?: string | null;
    departmentId?: string | null;
    role?: { id?: string; name?: string | null } | null;
  },
  preloadedSettings?: Record<string, any> | null,
): Promise<ResolvedScopeContext> {
  const accessUpper = (membership.accessRole || '').toUpperCase();
  const roleUpper = (membership.role?.name || '').toUpperCase();
  const isGlobalAdmin = accessUpper === 'OWNER' || accessUpper === 'ADMIN';

  let settings: Record<string, any> = preloadedSettings || {};
  if (!preloadedSettings && workspaceId && prisma?.workspace?.findUnique) {
    try {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      });
      if (ws?.settings && typeof ws.settings === 'object') {
        settings = ws.settings as Record<string, any>;
      }
    } catch {
      settings = {};
    }
  }

  let ledTeamIds: string[] = [];
  if (workspaceId && membership.id && prisma?.team?.findMany) {
    try {
      const ledTeams = await prisma.team.findMany({
        where: { workspaceId, leadMembershipId: membership.id },
        select: { id: true },
      });
      if (Array.isArray(ledTeams)) {
        ledTeamIds = ledTeams.map((t: any) => t?.id).filter((id): id is string => Boolean(id));
      }
    } catch {
      ledTeamIds = [];
    }
  }

  let deptTeamIds: string[] = [];
  if (workspaceId && membership.departmentId && prisma?.team?.findMany) {
    try {
      const deptTeams = await prisma.team.findMany({
        where: { workspaceId, departmentId: membership.departmentId },
        select: { id: true },
      });
      if (Array.isArray(deptTeams)) {
        deptTeamIds = deptTeams.map((t: any) => t?.id).filter((id): id is string => Boolean(id));
      }
    } catch {
      deptTeamIds = [];
    }
  }

  const memberDataScopes: Record<string, string> = settings.memberDataScopes || {};
  const roleDataScopes: Record<string, string> = settings.roleDataScopes || {};
  const memberScopedTeamsMap: Record<string, string[]> = settings.memberScopedTeams || {};
  const roleScopedTeamsMap: Record<string, string[]> = settings.roleScopedTeams || {};

  let effectiveDataScope: string;
  if (accessUpper === 'OWNER') {
    effectiveDataScope = 'GLOBAL';
  } else if (isGlobalAdmin) {
    effectiveDataScope = 'GLOBAL';
  } else {
    const memberOverride = memberDataScopes[membership.id];
    const roleScope = membership.roleId ? roleDataScopes[membership.roleId] : undefined;
    const defaultRoleScope = getDefaultDataScopeForRole(accessUpper, roleUpper);
    effectiveDataScope =
      memberOverride ||
      roleScope ||
      (defaultRoleScope && defaultRoleScope !== 'ASSIGNED' ? defaultRoleScope : undefined) ||
      (membership.dataScope && membership.dataScope !== 'ASSIGNED' && membership.dataScope !== 'OWN'
        ? membership.dataScope
        : undefined) ||
      'ASSIGNED';
  }

  const memberCustomTeams = Array.isArray(memberScopedTeamsMap[membership.id])
    ? memberScopedTeamsMap[membership.id]
    : [];
  const roleCustomTeams =
    membership.roleId && Array.isArray(roleScopedTeamsMap[membership.roleId])
      ? roleScopedTeamsMap[membership.roleId]
      : [];

  let scopedTeamIds = Array.from(
    new Set(
      [
        membership.teamId || '',
        ...ledTeamIds,
        ...deptTeamIds,
        ...memberCustomTeams,
        ...roleCustomTeams,
      ].filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
    ),
  );

  if (
    scopedTeamIds.length === 0 &&
    (roleUpper.includes('LEAD') || roleUpper.includes('MANAGER') || accessUpper === 'MANAGER') &&
    workspaceId &&
    prisma?.team?.findMany
  ) {
    try {
      const allWsTeams = await prisma.team.findMany({
        where: { workspaceId },
        select: { id: true },
      });
      if (Array.isArray(allWsTeams)) {
        for (const wt of allWsTeams) {
          if (wt?.id) scopedTeamIds.push(wt.id);
        }
      }
    } catch {}
  }

  return {
    effectiveDataScope,
    scopedTeamIds,
    ledTeamIds,
    isGlobalAdmin,
  };
}
