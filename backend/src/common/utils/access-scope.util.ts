export type EffectiveDataScope = 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL';

export interface UserAccessContext {
  membershipId?: string;
  userId?: string;
  accessRole?: string;
  roleId?: string;
  roleName?: string;
  isSystemRole?: boolean;
  isRoleActive?: boolean;
  dataScope?: string;
  effectiveScope?: EffectiveDataScope;
  departmentId?: string | null;
  teamId?: string | null;
  permissionCodes?: string[];
}

export function normalizeDataScope(scope?: string | null): EffectiveDataScope {
  const s = (scope || '').trim().toUpperCase();
  if (s === 'ALL' || s === 'GLOBAL' || s === 'WORKSPACE' || s === 'ENTIRE_WORKSPACE') {
    return 'GLOBAL';
  }
  if (s === 'DEPARTMENT' || s === 'MY_DEPARTMENT') {
    return 'DEPARTMENT';
  }
  if (s === 'TEAM' || s === 'MY_TEAM' || s === 'TEAM_WORK') {
    return 'TEAM';
  }
  return 'ASSIGNED';
}

export function extractPermissionInfo(membership: any): {
  permissionCodes: string[];
  isRoleActive: boolean;
} {
  if (!membership) {
    return { permissionCodes: [], isRoleActive: false };
  }
  const isRoleActive = !membership.role?.description?.startsWith('[DEACTIVATED]');
  if (!isRoleActive) {
    return { permissionCodes: [], isRoleActive: false };
  }
  const codes = (membership.role?.permissions || [])
    .map((rp: any) => rp.permission?.code || rp.code)
    .filter((code: any): code is string => typeof code === 'string' && code.length > 0);
  return { permissionCodes: Array.from(new Set(codes)), isRoleActive: true };
}

export function inferScopeFromPermissions(permissionCodes: string[], fallbackScope?: string | null): EffectiveDataScope {
  if (permissionCodes.includes('scope:workspace')) return 'GLOBAL';
  if (permissionCodes.includes('scope:department')) return 'DEPARTMENT';
  if (permissionCodes.includes('scope:team')) return 'TEAM';
  if (permissionCodes.includes('scope:own')) return 'ASSIGNED';
  return normalizeDataScope(fallbackScope);
}

export function matchesSinglePermission(grantedCodes: string[], perm: string): boolean {
  if (grantedCodes.includes(perm)) return true;

  const [mod] = perm.split(':');
  const isSensitiveOrScopedPerm =
    perm === 'people:view_sensitive' ||
    perm.startsWith('calendar:view:') ||
    perm === 'calendar:holidays:manage';
  if (mod && mod !== 'scope' && !isSensitiveOrScopedPerm) {
    if (grantedCodes.includes(`${mod}:manage`) || grantedCodes.includes(`${mod}:administer`)) {
      return true;
    }
  }

  if (
    perm === 'settings:manage' &&
    (grantedCodes.includes('org:manage') || grantedCodes.includes('workspace:manage'))
  ) {
    return true;
  }
  if (
    perm === 'org:manage' &&
    (grantedCodes.includes('settings:manage') || grantedCodes.includes('workspace:manage'))
  ) {
    return true;
  }
  if (perm === 'quality:manage' && grantedCodes.includes('quality:review')) return true;
  if (perm === 'quality:review' && grantedCodes.includes('quality:manage')) return true;
  if (perm === 'departments:manage' && grantedCodes.includes('people:manage')) return true;

  return false;
}

export function hasPermission(
  userContext: UserAccessContext | undefined,
  required: string | string[],
): boolean {
  if (!userContext) return false;
  if (userContext.isRoleActive === false) return false;
  if (userContext.accessRole === 'OWNER') return true;

  const list = Array.isArray(required) ? required : [required];
  if (list.length === 0) return true;

  const codes = userContext.permissionCodes;
  if (Array.isArray(codes)) {
    return list.some((perm) => matchesSinglePermission(codes, perm));
  }

  // Fallback for direct service unit calls that omit permissionCodes
  return userContext.accessRole === 'ADMIN';
}

export function hasAllPermissions(
  userContext: UserAccessContext | undefined,
  required: string[],
): boolean {
  if (!userContext) return false;
  if (userContext.isRoleActive === false) return false;
  if (userContext.accessRole === 'OWNER') return true;
  if (!required || required.length === 0) return true;

  const codes = userContext.permissionCodes;
  if (Array.isArray(codes)) {
    return required.every((perm) => matchesSinglePermission(codes, perm));
  }

  return userContext.accessRole === 'ADMIN';
}

/**
 * Resolves effective record visibility scope strictly from OWNER status and granted scope:* permissions,
 * falling back cleanly to normalized Membership.dataScope when a custom/legacy role omits explicit scope:* codes.
 */
export function resolveEffectiveScope(userContext?: UserAccessContext): EffectiveDataScope {
  if (!userContext) return 'ASSIGNED';
  if (userContext.isRoleActive === false) return 'ASSIGNED';
  if (userContext.accessRole === 'OWNER') return 'GLOBAL';

  const codes = userContext.permissionCodes;
  if (Array.isArray(codes)) {
    if (codes.includes('scope:workspace')) return 'GLOBAL';
    if (codes.includes('scope:department')) return 'DEPARTMENT';
    if (codes.includes('scope:team')) return 'TEAM';
    if (codes.includes('scope:own')) return 'ASSIGNED';
    return normalizeDataScope(userContext.dataScope);
  }

  // Fallback for direct unit-test calls without attached permissionCodes
  if (userContext.effectiveScope) {
    return userContext.effectiveScope;
  }
  if (userContext.dataScope) {
    return normalizeDataScope(userContext.dataScope);
  }
  return userContext.accessRole === 'ADMIN' ? 'GLOBAL' : 'ASSIGNED';
}

export function buildUserContextFromMembership(membership: any): UserAccessContext {
  const { permissionCodes, isRoleActive } = extractPermissionInfo(membership);
  const rawScope = normalizeDataScope(membership?.dataScope);
  const hasExplicitScopePerm =
    permissionCodes.includes('scope:workspace') ||
    permissionCodes.includes('scope:department') ||
    permissionCodes.includes('scope:team') ||
    permissionCodes.includes('scope:own');

  // OWNER always resolves to GLOBAL; otherwise explicit scope:* perm on role dictates scope, or fallback to membership.dataScope
  const effectiveScope: EffectiveDataScope =
    membership?.accessRole === 'OWNER'
      ? 'GLOBAL'
      : isRoleActive === false
      ? 'ASSIGNED'
      : hasExplicitScopePerm
      ? inferScopeFromPermissions(permissionCodes, rawScope)
      : rawScope;

  return {
    membershipId: membership?.id,
    userId: membership?.userId,
    accessRole: membership?.accessRole,
    roleId: membership?.roleId,
    roleName: membership?.role?.name,
    isSystemRole: Boolean(membership?.role?.isSystemRole),
    isRoleActive,
    dataScope: effectiveScope,
    effectiveScope,
    departmentId: membership?.departmentId || null,
    teamId: membership?.teamId || null,
    permissionCodes,
  };
}

export async function resolveLedTeamIds(prisma: any, workspaceId: string, membershipId?: string): Promise<string[]> {
  if (!membershipId || !prisma?.team?.findMany) return [];
  try {
    const ledTeams = await prisma.team.findMany({
      where: { workspaceId, leadMembershipId: membershipId },
      select: { id: true },
    });
    return Array.isArray(ledTeams) ? ledTeams.map((t: any) => t.id).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function isTargetWithinScope(
  actor: UserAccessContext | undefined,
  target: { id?: string; departmentId?: string | null; teamId?: string | null; reportsToId?: string | null } | null | undefined,
  ledTeamIds: string[] = [],
): boolean {
  if (!actor) return false;
  if (actor.isRoleActive === false) return false;
  const scope = resolveEffectiveScope(actor);
  if (scope === 'GLOBAL') return true;
  if (!target) return false;
  if (actor.membershipId && target.id === actor.membershipId) return true;

  if (scope === 'DEPARTMENT') {
    return Boolean(actor.departmentId && target.departmentId === actor.departmentId);
  }
  if (scope === 'TEAM') {
    if (actor.teamId && target.teamId === actor.teamId) return true;
    if (target.teamId && ledTeamIds.includes(target.teamId)) return true;
    if (actor.membershipId && target.reportsToId === actor.membershipId) return true;
    return false;
  }
  return Boolean(actor.membershipId && target.id === actor.membershipId);
}
