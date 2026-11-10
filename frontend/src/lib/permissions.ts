/**
 * Centralized Permission Evaluation Helper
 * Evaluates fine-grained module permissions and data scopes across Workspace Roles & Memberships.
 */

export type EffectiveScope = 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'GLOBAL';

export interface PermissionContext {
  id?: string | null;
  membershipId?: string | null;
  accessRole?: string | null;
  dataScope?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  reportsToId?: string | null;
  role?: {
    id?: string;
    name?: string;
    isSystemRole?: boolean;
    description?: string;
    permissions?: Array<string | { code?: string; permission?: { code: string } }>;
  } | null;
}

/**
 * Extracts granted permission codes from a user/membership context.
 */
export function extractPermissionCodes(ctx?: PermissionContext | null): string[] {
  if (!ctx || !ctx.role) return [];

  // Deactivated roles have all permissions suspended
  if (ctx.role.description?.startsWith('[DEACTIVATED]')) {
    return [];
  }

  const rawPermissions = ctx.role.permissions || [];
  return rawPermissions
    .map((p: any) => {
      if (typeof p === 'string') return p;
      if (p?.code) return p.code;
      if (p?.permission?.code) return p.permission.code;
      return null;
    })
    .filter((code): code is string => Boolean(code));
}

/**
 * Normalizes data scope strings into the 4 canonical tiers.
 */
export function normalizeScope(scope?: string | null): EffectiveScope {
  const s = (scope || '').trim().toUpperCase();
  if (s === 'ALL' || s === 'GLOBAL' || s === 'WORKSPACE' || s === 'ENTIRE_WORKSPACE') return 'GLOBAL';
  if (s === 'DEPARTMENT' || s === 'MY_DEPARTMENT') return 'DEPARTMENT';
  if (s === 'TEAM' || s === 'MY_TEAM' || s === 'TEAM_WORK') return 'TEAM';
  return 'ASSIGNED';
}

/**
 * Computes effective visibility scope:
 * - Only OWNER resolves automatically to GLOBAL.
 * - Everyone else (including distinct ADMIN sub-personas & MANAGER team/department leads)
 *   derives scope from explicit scope:* permissions on their role, or falls back to membership.dataScope.
 */
export function getEffectiveScope(ctx?: PermissionContext | null): EffectiveScope {
  if (!ctx) return 'ASSIGNED';
  const accessRole = (ctx.accessRole || ctx.role?.name || '').toUpperCase();
  if (accessRole === 'OWNER') return 'GLOBAL';
  if (ctx.role?.description?.startsWith('[DEACTIVATED]')) return 'ASSIGNED';

  const codes = extractPermissionCodes(ctx);
  if (codes.includes('scope:workspace')) return 'GLOBAL';
  if (codes.includes('scope:department')) return 'DEPARTMENT';
  if (codes.includes('scope:team')) return 'TEAM';
  if (codes.includes('scope:own')) return 'ASSIGNED';

  return normalizeScope(ctx.dataScope);
}

/**
 * Determines whether actor can view/act upon target membership based on effective scope.
 */
export function canTargetWithinScope(
  actor: PermissionContext | null | undefined,
  target: { id?: string; departmentId?: string | null; teamId?: string | null; reportsToId?: string | null } | null | undefined,
  ledTeamIds: string[] = [],
): boolean {
  if (!actor || !target) return false;
  if (actor.role?.description?.startsWith('[DEACTIVATED]')) return false;

  const scope = getEffectiveScope(actor);
  if (scope === 'GLOBAL') return true;

  const actorId = actor.id || actor.membershipId;
  if (actorId && target.id === actorId) return true;

  if (scope === 'DEPARTMENT') {
    return Boolean(actor.departmentId && target.departmentId === actor.departmentId);
  }
  if (scope === 'TEAM') {
    if (actor.teamId && target.teamId === actor.teamId) return true;
    if (target.teamId && ledTeamIds.includes(target.teamId)) return true;
    if (actorId && target.reportsToId === actorId) return true;
    return false;
  }
  return Boolean(actorId && target.id === actorId);
}

/**
 * Returns user-friendly display role label, preferring custom role names (e.g. "Payroll Admin", "Tech TL").
 */
export function getDisplayRoleName(ctx?: PermissionContext | null): string {
  if (!ctx) return 'Member';
  if (ctx.role?.name && !ctx.role?.isSystemRole) {
    return ctx.role.name;
  }
  const r = (ctx.accessRole || ctx.role?.name || 'MEMBER').toUpperCase();
  if (r === 'OWNER') return 'Owner';
  if (r === 'ADMIN') return 'Admin';
  if (r === 'MANAGER') return 'Manager';
  return 'Member';
}

/**
 * Checks whether a user context satisfies a required permission.
 * - Only OWNER holds unrestricted automatic bypass.
 * - ADMIN, MANAGER, and MEMBER evaluate strictly against granted role permissions.
 * - Module managers (e.g. assets:manage) satisfy sub-action permissions within that module.
 */
export function checkPermission(ctx: PermissionContext | null | undefined, requiredPerm: string): boolean {
  if (!ctx) return false;

  const accessRole = (ctx.accessRole || ctx.role?.name || '').toUpperCase();

  // Platform OWNER has unrestricted authority
  if (accessRole === 'OWNER') {
    return true;
  }

  // Deactivated role check
  if (ctx.role?.description?.startsWith('[DEACTIVATED]')) {
    return false;
  }

  const grantedCodes = extractPermissionCodes(ctx);

  if (grantedCodes.includes(requiredPerm)) {
    return true;
  }

  // Check module-level manage or administer wildcard (except explicit scope:*, sensitive PII, or calendar visibility/holiday scopes)
  const [mod] = requiredPerm.split(':');
  const isSensitiveOrScopedPerm =
    requiredPerm === 'people:view_sensitive' ||
    requiredPerm.startsWith('calendar:view:') ||
    requiredPerm === 'calendar:holidays:manage';
  if (
    mod &&
    mod !== 'scope' &&
    !isSensitiveOrScopedPerm &&
    (grantedCodes.includes(`${mod}:manage`) || grantedCodes.includes(`${mod}:administer`))
  ) {
    return true;
  }

  // Inter-module administrative aliases (aligned strictly with backend access-scope.util.ts)
  if (requiredPerm === 'settings:manage' && (grantedCodes.includes('org:manage') || grantedCodes.includes('workspace:manage'))) {
    return true;
  }
  if (requiredPerm === 'org:manage' && (grantedCodes.includes('settings:manage') || grantedCodes.includes('workspace:manage'))) {
    return true;
  }
  if (requiredPerm === 'quality:manage' && grantedCodes.includes('quality:review')) {
    return true;
  }
  if (requiredPerm === 'quality:review' && grantedCodes.includes('quality:manage')) {
    return true;
  }
  if (requiredPerm === 'departments:manage' && grantedCodes.includes('people:manage')) {
    return true;
  }
  if (requiredPerm === 'onboarding:manage' && grantedCodes.includes('people:manage')) {
    return true;
  }

  return false;
}

/**
 * Checks whether a user context satisfies ANY of the specified permissions.
 */
export function hasAnyPermission(ctx: PermissionContext | null | undefined, perms: string[]): boolean {
  if (!perms || perms.length === 0) return true;
  return perms.some((perm) => checkPermission(ctx, perm));
}

/**
 * Checks whether a user context satisfies ALL of the specified permissions.
 */
export function hasAllPermissions(ctx: PermissionContext | null | undefined, perms: string[]): boolean {
  if (!perms || perms.length === 0) return true;
  return perms.every((perm) => checkPermission(ctx, perm));
}
