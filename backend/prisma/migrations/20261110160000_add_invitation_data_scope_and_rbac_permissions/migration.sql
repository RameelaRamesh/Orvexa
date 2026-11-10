-- =====================================================================
-- Migration: 20261110160000_add_invitation_data_scope_and_rbac_permissions
-- Description: Adds dataScope to Invitation, and seeds Scope, Onboarding,
--              Sensitive PII, and Calendar permissions with system defaults.
-- =====================================================================

-- 1. Add dataScope column to Invitation
ALTER TABLE "Invitation"
ADD COLUMN IF NOT EXISTS "dataScope" TEXT DEFAULT 'ASSIGNED';

-- 2. Seed Scope, Onboarding, Sensitive PII, and Calendar Permissions
INSERT INTO "Permission" ("id", "code", "name", "module", "description")
VALUES
    -- Scope (4 permissions)
    ('perm_scope_own', 'scope:own', 'View Own Records Only', 'Scope', 'Restrict visibility to records assigned to or created by the user'),
    ('perm_scope_team', 'scope:team', 'View Assigned Team & Direct Reports Records', 'Scope', 'Allow visibility across the user team and direct reports'),
    ('perm_scope_department', 'scope:department', 'View Assigned Department Records', 'Scope', 'Allow visibility across the user entire department'),
    ('perm_scope_workspace', 'scope:workspace', 'View Entire Workspace Records', 'Scope', 'Allow visibility across all departments and teams in the workspace'),

    -- People Granular Permissions (2 additions)
    ('perm_onboarding_manage', 'onboarding:manage', 'Manage Employee Onboarding & Checklists', 'People', 'Manage onboarding checklists, completeness reminders, and pre-joining setup'),
    ('perm_people_view_sensitive', 'people:view_sensitive', 'View Bank Account, PAN, Aadhaar & Compensation PII', 'People', 'View restricted personal banking and identity verification fields'),

    -- Calendar Permissions (8 permissions)
    ('perm_calendar_view_all', 'calendar:view:all', 'View All Company Calendar Events', 'Calendar', 'View all company calendar events across departments'),
    ('perm_calendar_view_department', 'calendar:view:department', 'View Department Calendar Events', 'Calendar', 'View department calendar events'),
    ('perm_calendar_view_team', 'calendar:view:team', 'View Team Calendar Events', 'Calendar', 'View team calendar events'),
    ('perm_calendar_view_schedules', 'calendar:view:schedules', 'View Individual Employee Schedules', 'Calendar', 'View individual employee schedules'),
    ('perm_calendar_create', 'calendar:create', 'Create Calendar Events & Meetings', 'Calendar', 'Create calendar events and meetings'),
    ('perm_calendar_invite', 'calendar:invite', 'Invite Participants to Meetings', 'Calendar', 'Invite participants to meetings'),
    ('perm_calendar_manage', 'calendar:manage', 'Edit and Cancel Events', 'Calendar', 'Edit and cancel calendar events'),
    ('perm_calendar_holidays_manage', 'calendar:holidays:manage', 'Manage Company Holidays', 'Calendar', 'Create, update, and remove company holidays')
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "module" = EXCLUDED."module",
    "description" = EXCLUDED."description";

-- 3. Backfill System Roles without touching Custom Roles
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
    'rp_' || md5(r."id" || '_' || p."id"),
    r."id",
    p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."isSystemRole" = true
  AND (
    (r."name" IN ('OWNER', 'ADMIN') AND p."code" IN (
      'scope:workspace', 'onboarding:manage', 'people:view_sensitive',
      'calendar:view:all', 'calendar:view:department', 'calendar:view:team', 'calendar:view:schedules',
      'calendar:create', 'calendar:invite', 'calendar:manage', 'calendar:holidays:manage'
    ))
    OR
    (r."name" = 'MANAGER' AND p."code" IN (
      'scope:team',
      'calendar:view:team', 'calendar:view:schedules', 'calendar:create', 'calendar:invite', 'calendar:manage'
    ))
    OR
    (r."name" = 'MEMBER' AND p."code" IN (
      'scope:own', 'calendar:create', 'calendar:invite'
    ))
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
