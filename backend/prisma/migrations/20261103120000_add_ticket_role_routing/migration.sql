-- =====================================================================
-- Migration: 20261103120000_add_ticket_role_routing
-- Description: Adds role-group routing columns, target assignment, and
--              claiming metadata to tickets / service requests table.
-- =====================================================================

-- 1. Create Target Role Enum
DO $$ BEGIN
    CREATE TYPE "TicketTargetRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tickets Table (if not exists)
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "category_name" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "target_role" "TicketTargetRole" NOT NULL DEFAULT 'ADMIN',
    "target_user_id" TEXT,
    "assigned_to" TEXT,
    "accepted_at" TIMESTAMP(3),
    "requester_membership_id" TEXT NOT NULL,
    "responsible_team_id" TEXT,
    "inventory_item" TEXT,
    "requested_quantity" INTEGER,
    "replenishment_items" JSONB,
    "activity_timeline" JSONB,
    "comments" JSONB,
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- 3. Add Columns to existing tickets table if it already existed
DO $$ BEGIN
    ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "target_role" "TicketTargetRole" NOT NULL DEFAULT 'ADMIN';
    ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "target_user_id" TEXT;
    ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assigned_to" TEXT;
    ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3);
END $$;

-- 4. Create Performance Indexes for Multi-Tenant Role Routing & Claiming
CREATE INDEX IF NOT EXISTS "tickets_workspace_id_idx" ON "tickets"("workspace_id");
CREATE INDEX IF NOT EXISTS "tickets_workspace_id_target_role_idx" ON "tickets"("workspace_id", "target_role");
CREATE INDEX IF NOT EXISTS "tickets_workspace_id_target_user_id_idx" ON "tickets"("workspace_id", "target_user_id");
CREATE INDEX IF NOT EXISTS "tickets_workspace_id_assigned_to_idx" ON "tickets"("workspace_id", "assigned_to");
CREATE INDEX IF NOT EXISTS "tickets_ticket_number_idx" ON "tickets"("ticket_number");

-- 5. Add Referential Integrity Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_workspace_id_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_workspace_id_fkey" 
            FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_requester_membership_id_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_membership_id_fkey" 
            FOREIGN KEY ("requester_membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_target_user_id_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_target_user_id_fkey" 
            FOREIGN KEY ("target_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assigned_to_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_fkey" 
            FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
