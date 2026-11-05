-- =====================================================================
-- Migration: 20261103160000_add_assets_inventory_docs_permissions
-- Description: Adds Assets, Inventory, Ledger, and Documents permission
--              catalog keys and backfills defaults for system roles.
-- =====================================================================

-- 1. Insert New Permissions into "Permission" Table
INSERT INTO "Permission" ("id", "code", "name", "module", "description")
VALUES
    -- Assets (5 permissions)
    ('perm_assets_view', 'assets:view', 'View company assets', 'Assets', 'View company assets'),
    ('perm_assets_create', 'assets:create', 'Register new assets', 'Assets', 'Register new assets'),
    ('perm_assets_edit', 'assets:edit', 'Edit asset details', 'Assets', 'Edit asset details'),
    ('perm_assets_assign', 'assets:assign', 'Assign assets to people', 'Assets', 'Assign assets to people'),
    ('perm_assets_delete', 'assets:delete', 'Delete assets', 'Assets', 'Delete assets'),

    -- Inventory (3 permissions)
    ('perm_inventory_view', 'inventory:view', 'View stock and locations', 'Inventory', 'View stock and locations'),
    ('perm_inventory_move', 'inventory:move', 'Move stock between locations', 'Inventory', 'Move stock between locations'),
    ('perm_inventory_manage', 'inventory:manage', 'Manage locations and low-stock rules', 'Inventory', 'Manage locations and low-stock rules'),

    -- Ledger (2 permissions)
    ('perm_ledger_view', 'ledger:view', 'View movement ledger', 'Ledger', 'View movement ledger'),
    ('perm_ledger_export', 'ledger:export', 'Export ledger', 'Ledger', 'Export ledger'),

    -- Documents (4 permissions)
    ('perm_documents_view', 'documents:view', 'View document vault', 'Documents', 'View document vault'),
    ('perm_documents_upload', 'documents:upload', 'Upload documents', 'Documents', 'Upload documents'),
    ('perm_documents_download', 'documents:download', 'Download documents', 'Documents', 'Download documents'),
    ('perm_documents_delete', 'documents:delete', 'Delete documents', 'Documents', 'Delete documents')
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "module" = EXCLUDED."module",
    "description" = EXCLUDED."description";

-- 2. Backfill Defaults for OWNER and ADMIN System Roles (All 14 New Permissions)
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
    'rp_' || md5(r."id" || '_' || p."id"),
    r."id",
    p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" IN ('OWNER', 'ADMIN')
  AND p."code" IN (
    'assets:view', 'assets:create', 'assets:edit', 'assets:assign', 'assets:delete',
    'inventory:view', 'inventory:move', 'inventory:manage',
    'ledger:view', 'ledger:export',
    'documents:view', 'documents:upload', 'documents:download', 'documents:delete'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 3. Backfill Defaults for MANAGER System Role (11 Permissions; Excludes delete and manage)
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
    'rp_' || md5(r."id" || '_' || p."id"),
    r."id",
    p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'MANAGER'
  AND p."code" IN (
    'assets:view', 'assets:create', 'assets:edit', 'assets:assign',
    'inventory:view', 'inventory:move',
    'ledger:view', 'ledger:export',
    'documents:view', 'documents:upload', 'documents:download'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- NOTE: MEMBER and custom roles receive NO new permissions by default.
-- All existing role permissions remain completely untouched.
