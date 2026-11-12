/**
 * Centralized Permission Evaluation Helper
 * Evaluates fine-grained module permissions across Workspace Roles & Memberships.
 */

export interface PermissionContext {
  id?: string;
  accessRole?: string | null;
  dataScope?: string | null;
  effectivePermissions?: string[];
  role?: {
    id?: string;
    name?: string;
    isSystemRole?: boolean;
    description?: string;
    permissions?: Array<string | { code?: string; permission?: { code: string } }>;
  } | null;
  workspace?: {
    id?: string;
    name?: string;
    settings?: {
      enabledModules?: string[];
      roleDataScopes?: Record<string, string>;
      memberDataScopes?: Record<string, string>;
      memberPermissionOverrides?: Record<string, { added?: string[]; revoked?: string[] }>;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
}

export const DEFAULT_ENABLED_MODULES: string[] = [
  'people',
  'projects',
  'tasks',
  'work_queue',
  'time',
  'attendance',
  'leave',
  'approvals',
  'payroll',
];

/**
 * Resolves the workspace's currently enabled modules, falling back to DEFAULT_ENABLED_MODULES.
 */
export function getEnabledModules(ctx?: PermissionContext | null): string[] {
  const configured = ctx?.workspace?.settings?.enabledModules;
  if (Array.isArray(configured)) {
    return configured;
  }
  return DEFAULT_ENABLED_MODULES;
}

/**
 * Checks strictly whether a module key is enabled in the active workspace's settings.
 */
export function isModuleEnabled(
  ctx: PermissionContext | null | undefined,
  moduleKey: string,
): boolean {
  return getEnabledModules(ctx).includes(moduleKey);
}

/**
 * Extracts the data access scope configured for the active membership or role.
 */
export function getDataScope(ctx?: PermissionContext | null): string {
  const accessRole = (ctx?.accessRole || ctx?.role?.name || '').toUpperCase();
  if (accessRole === 'OWNER') return 'GLOBAL';
  if (ctx?.id && ctx?.workspace?.settings?.memberDataScopes?.[ctx.id]) {
    return ctx.workspace.settings.memberDataScopes[ctx.id];
  }
  if (ctx?.dataScope) return ctx.dataScope;
  const roleId = ctx?.role?.id;
  const roleScopes = ctx?.workspace?.settings?.roleDataScopes || {};
  if (roleId && roleScopes[roleId]) {
    return roleScopes[roleId];
  }
  if (accessRole === 'ADMIN') return 'GLOBAL';
  // LEGACY_ROLE_COMMENTED_OUT: legacy MANAGER carrier defaults to TEAM; all other staff default to ASSIGNED unless configured on their role
  if (accessRole === 'MANAGER') return 'TEAM';
  return 'ASSIGNED';
}

/**
 * Extracts granted permission codes from a user/membership context, merging per-member overrides.
 */
export function extractPermissionCodes(ctx?: PermissionContext | null): string[] {
  if (!ctx) return [];

  if (Array.isArray(ctx.effectivePermissions) && ctx.effectivePermissions.length > 0) {
    return Array.from(new Set(ctx.effectivePermissions.filter(Boolean)));
  }

  if (!ctx.role) return [];

  // Deactivated roles have all permissions suspended
  if (ctx.role.description?.startsWith('[DEACTIVATED]')) {
    return [];
  }

  const rawPermissions = ctx.role.permissions || [];
  const base = rawPermissions
    .map((p: any) => {
      if (typeof p === 'string') return p;
      if (p?.code) return p.code;
      if (p?.permission?.code) return p.permission.code;
      return null;
    })
    .filter((code): code is string => Boolean(code));

  const override = ctx.id
    ? ctx.workspace?.settings?.memberPermissionOverrides?.[ctx.id]
    : undefined;
  if (!override) return base;

  const set = new Set(base);
  if (Array.isArray(override.added)) {
    override.added.forEach((c) => { if (c) set.add(c); });
  }
  if (Array.isArray(override.revoked)) {
    override.revoked.forEach((c) => { set.delete(c); });
  }
  return Array.from(set);
}

/**
 * Checks whether a user context satisfies a required permission.
 * - Platform OWNER holds absolute authority (all permissions granted).
 * - System ADMIN holds platform authority for non-billing operations or assigned permissions.
 * - Module managers (e.g. assets:manage) automatically hold sub-action permissions for that module.
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

  // Platform system ADMIN with no explicit permissions row retains operational defaults (custom roles must match explicit permissions)
  if (
    accessRole === 'ADMIN' &&
    ctx.role?.isSystemRole !== false &&
    grantedCodes.length === 0 &&
    requiredPerm !== 'billing:manage'
  ) {
    return true;
  }

  if (grantedCodes.includes(requiredPerm)) {
    return true;
  }

  if (requiredPerm === 'tasks:complete' && grantedCodes.includes('tasks:review')) {
    return true;
  }

  // Check module-level manage or administer wildcard
  const [mod] = requiredPerm.split(':');
  if (grantedCodes.includes(`${mod}:manage`) || grantedCodes.includes(`${mod}:administer`)) {
    return true;
  }

  // Inter-module administrative aliases
  if (requiredPerm === 'settings:manage' && (grantedCodes.includes('org:manage') || grantedCodes.includes('workspace:manage'))) {
    return true;
  }
  if (requiredPerm === 'org:manage' && (grantedCodes.includes('settings:manage') || grantedCodes.includes('workspace:manage'))) {
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
