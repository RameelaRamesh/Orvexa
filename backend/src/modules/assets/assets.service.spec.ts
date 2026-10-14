import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { InventoryService } from '../inventory/inventory.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../../database/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider.interface';

describe('PHASE 9: Assets, Inventory and Native Document Storage Acceptance Suite', () => {
  let assetsService: AssetsService;
  let inventoryService: InventoryService;
  let filesService: FilesService;

  // In-memory mock storage
  let workspaceStorage: Record<string, any> = {};
  let fileStorageTable: any[] = [];
  let assetStorageTable: any[] = [];
  let auditLogTable: any[] = [];
  let notificationTable: any[] = [];

  const workspaceIdA = 'ws_alpha_corp';
  const workspaceIdB = 'ws_beta_corp';

  const memberAliceId = 'mem_alice_01'; // Admin
  const memberBobId = 'mem_bob_02';     // Employee
  const memberCharlieId = 'mem_charlie_03'; // Other employee

  const mockStorageProvider: StorageProvider = {
    uploadFile: jest.fn().mockImplementation(async (options) => {
      return {
        key: options.key,
        url: `https://storage.orvexa.io/${options.key}`,
      };
    }),
    deleteFile: jest.fn().mockImplementation(async (key) => {
      return true;
    }),
    getSignedDownloadUrl: jest.fn().mockImplementation(async (key, expiresInSeconds = 3600) => {
      return `https://storage.orvexa.io/${key}?signed_token=temp_secure_token_${Date.now()}&expires=${expiresInSeconds}`;
    }),
  };

  const mockPrisma: any = {
    workspace: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        const ws = workspaceStorage[where.id];
        return ws ? { id: where.id, settings: ws.settings } : null;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        if (!workspaceStorage[where.id]) {
          workspaceStorage[where.id] = { id: where.id, settings: {} };
        }
        workspaceStorage[where.id].settings = {
          ...workspaceStorage[where.id].settings,
          ...data.settings,
        };
        return workspaceStorage[where.id];
      }),
    },
    asset: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const record = {
          id: `ast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        assetStorageTable.push(record);
        return record;
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return assetStorageTable.filter((a) => {
          if (where.workspaceId && a.workspaceId !== where.workspaceId) return false;
          if (where.category && a.category !== where.category) return false;
          if (where.status && a.status !== where.status) return false;
          if (where.assignedToMembershipId && a.assignedToMembershipId !== where.assignedToMembershipId) return false;
          return true;
        });
      }),
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        return assetStorageTable.find((a) => {
          if (where.id && a.id !== where.id) return false;
          if (where.workspaceId && a.workspaceId !== where.workspaceId) return false;
          if (where.assetTag && a.assetTag !== where.assetTag) return false;
          return true;
        }) || null;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = assetStorageTable.findIndex((a) => a.id === where.id);
        if (idx === -1) throw new NotFoundException('Asset not found');
        assetStorageTable[idx] = { ...assetStorageTable[idx], ...data, updatedAt: new Date() };
        return assetStorageTable[idx];
      }),
    },
    file: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const record = {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          ...data,
          createdAt: new Date(),
        };
        fileStorageTable.push(record);
        return record;
      }),
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        return fileStorageTable.find((f) => {
          if (where.id && f.id !== where.id) return false;
          if (where.workspaceId && f.workspaceId !== where.workspaceId) return false;
          return true;
        }) || null;
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return fileStorageTable.filter((f) => {
          if (where.workspaceId && f.workspaceId !== where.workspaceId) return false;
          if (where.entityType && f.entityType !== where.entityType) return false;
          if (where.entityId && f.entityId !== where.entityId) return false;
          return true;
        });
      }),
      delete: jest.fn().mockImplementation(async ({ where }) => {
        const idx = fileStorageTable.findIndex((f) => f.id === where.id);
        if (idx !== -1) {
          const deleted = fileStorageTable[idx];
          fileStorageTable.splice(idx, 1);
          return deleted;
        }
        return null;
      }),
    },
    membership: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id === memberAliceId) {
          return { id: memberAliceId, workspaceId: workspaceIdA, accessRole: 'ADMIN', user: { firstName: 'Alice', lastName: 'Admin', email: 'alice@alpha.org' } };
        }
        if (where.id === memberBobId) {
          return { id: memberBobId, workspaceId: workspaceIdA, accessRole: 'MEMBER', user: { firstName: 'Bob', lastName: 'Engineer', email: 'bob@alpha.org' } };
        }
        if (where.id === memberCharlieId) {
          return { id: memberCharlieId, workspaceId: workspaceIdA, accessRole: 'MEMBER', user: { firstName: 'Charlie', lastName: 'Designer', email: 'charlie@alpha.org' } };
        }
        return null;
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id === memberAliceId) {
          return { id: memberAliceId, workspaceId: workspaceIdA, user: { firstName: 'Alice', lastName: 'Admin', email: 'alice@alpha.org' } };
        }
        if (where.id === memberBobId) {
          return { id: memberBobId, workspaceId: workspaceIdA, user: { firstName: 'Bob', lastName: 'Engineer', email: 'bob@alpha.org' } };
        }
        return null;
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return [
          { id: memberAliceId, workspaceId: workspaceIdA, accessRole: 'ADMIN', user: { firstName: 'Alice' } },
        ];
      }),
    },
    auditLog: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const log = { id: `audit_${Date.now()}`, ...data, createdAt: new Date() };
        auditLogTable.push(log);
        return log;
      }),
    },
    notification: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const notif = { id: `notif_${Date.now()}`, ...data, createdAt: new Date() };
        notificationTable.push(notif);
        return notif;
      }),
    },
  };

  beforeEach(async () => {
    // Reset state
    fileStorageTable = [];
    assetStorageTable = [];
    auditLogTable = [];
    notificationTable = [];

    workspaceStorage = {
      [workspaceIdA]: {
        id: workspaceIdA,
        settings: {
          assetCategories: [],
          assetMetadata: {},
          stockLocations: [
            { id: 'loc_main', name: 'Main Warehouse', code: 'MAIN', isDefault: true, createdAt: new Date() },
            { id: 'loc_floor2', name: 'Floor 2 IT Depot', code: 'IT_DEPOT', isDefault: false, createdAt: new Date() },
          ],
          inventoryItems: [
            {
              id: 'inv_laptop_dock',
              code: 'USB_C_DOCK',
              name: 'Universal Thunderbolt Docks',
              category: 'IT Peripherals',
              unit: 'units',
              reorderThreshold: 5,
              totalQuantityOnHand: 20,
              locationQuantities: { loc_main: 15, loc_floor2: 5 },
              isLowStock: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          stockMovements: [],
          serviceRequests: [],
        },
      },
      [workspaceIdB]: {
        id: workspaceIdB,
        settings: {
          assetCategories: [],
          stockLocations: [],
          inventoryItems: [],
          stockMovements: [],
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        InventoryService,
        FilesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: STORAGE_PROVIDER, useValue: mockStorageProvider },
      ],
    }).compile();

    assetsService = module.get<AssetsService>(AssetsService);
    inventoryService = module.get<InventoryService>(InventoryService);
    filesService = module.get<FilesService>(FilesService);
  });

  // ===========================================================================
  // SECTION 1: INVENTORY MOVEMENTS, CONCURRENCY GUARDS & REPLENISHMENT
  // ===========================================================================
  describe('1. Inventory Stock Movements, Concurrency & Low-Stock Alerts', () => {
    it('records INWARD stock movement and updates total balance accurately', async () => {
      const { movement, updatedItem } = await inventoryService.recordStockMovement(
        workspaceIdA,
        memberAliceId,
        {
          itemId: 'inv_laptop_dock',
          movementType: 'INWARD',
          quantity: 10,
          toLocationId: 'loc_main',
          reason: 'Supplier shipment PO-901 received',
        },
      );

      expect(movement.movementType).toBe('INWARD');
      expect(movement.quantity).toBe(10);
      expect(movement.balanceBefore).toBe(20);
      expect(movement.balanceAfter).toBe(30);
      expect(updatedItem.totalQuantityOnHand).toBe(30);
      expect(updatedItem.locationQuantities['loc_main']).toBe(25); // 15 + 10 = 25
    });

    it('rejects OUTWARD movement if requested quantity exceeds available location stock', async () => {
      // Attempting to consume 10 units from loc_floor2 when it only has 5
      await expect(
        inventoryService.recordStockMovement(workspaceIdA, memberAliceId, {
          itemId: 'inv_laptop_dock',
          movementType: 'OUTWARD',
          quantity: 10,
          fromLocationId: 'loc_floor2',
          reason: 'Deploying to squad',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('executes location TRANSFER movement conserving total stock quantity', async () => {
      const { movement, updatedItem } = await inventoryService.recordStockMovement(
        workspaceIdA,
        memberAliceId,
        {
          itemId: 'inv_laptop_dock',
          movementType: 'TRANSFER',
          quantity: 5,
          fromLocationId: 'loc_main',
          toLocationId: 'loc_floor2',
          reason: 'Restocking floor 2 depot from main warehouse',
        },
      );

      expect(movement.movementType).toBe('TRANSFER');
      expect(movement.balanceBefore).toBe(20);
      expect(movement.balanceAfter).toBe(20); // Conserved
      expect(updatedItem.locationQuantities['loc_main']).toBe(10); // 15 - 5 = 10
      expect(updatedItem.locationQuantities['loc_floor2']).toBe(10); // 5 + 5 = 10
    });

    it('triggers low-stock alert notifications when stock drops to or below threshold', async () => {
      // Current stock is 20, threshold is 5. Issue 16 units -> balance drops to 4 <= 5
      const { updatedItem } = await inventoryService.recordStockMovement(
        workspaceIdA,
        memberAliceId,
        {
          itemId: 'inv_laptop_dock',
          movementType: 'OUTWARD',
          quantity: 16,
          fromLocationId: 'loc_main',
          reason: 'Bulk team deployment',
        },
      );

      expect(updatedItem.totalQuantityOnHand).toBe(4);
      expect(updatedItem.isLowStock).toBe(true);

      // Verify low-stock notification was dispatched to workspace managers
      expect(notificationTable.some((n) => n.title.includes('Low Stock Warning'))).toBe(true);
    });

    it('initiates connected replenishment ticket for low stock items', async () => {
      const result = await inventoryService.createReplenishmentTicket(
        workspaceIdA,
        'inv_laptop_dock',
        memberAliceId,
        {
          requestedQuantity: 25,
          reason: 'Replenishing stock for Q4 expansion',
        },
      );

      expect(result.ticketNumber).toMatch(/^REQ-\d+$/);
      expect(result.request.inventoryItem).toBe('Universal Thunderbolt Docks');
      expect(result.request.requestedQuantity).toBe(25);
      expect(result.request.status).toBe('SUBMITTED');
    });
  });

  // ===========================================================================
  // SECTION 2: ASSET LIFECYCLE: ASSIGNMENT, TRANSFERS, RETURN & MAINTENANCE
  // ===========================================================================
  describe('2. Asset Lifecycle & Chain of Custody Audit Trail', () => {
    it('creates asset record and logs initial onboarding history', async () => {
      const asset = await assetsService.createAsset(workspaceIdA, memberAliceId, {
        name: 'MacBook Pro M3 Max 16"',
        assetTag: 'AST-LPT-001',
        serialNumber: 'C02G1234XYZ',
        category: 'IT Hardware & Workstations',
        condition: 'EXCELLENT',
        location: 'HQ IT Locker',
        cost: 3200,
      });

      expect(asset.assetTag).toBe('AST-LPT-001');
      expect(asset.status).toBe('AVAILABLE');
      expect(asset.condition).toBe('EXCELLENT');
      expect(asset.lifecycleHistory.length).toBe(1);

      // Verify AuditLog
      expect(auditLogTable.some((l) => l.action === 'ASSET_CREATED' && l.entityId === asset.id)).toBe(true);
    });

    it('assigns asset to member Bob, then transfers to Charlie, then returns to pool', async () => {
      // 1. Create asset
      const asset = await assetsService.createAsset(workspaceIdA, memberAliceId, {
        name: 'Dell UltraSharp 32" 4K Monitor',
        assetTag: 'AST-MON-002',
        condition: 'EXCELLENT',
      });

      // 2. Assign to Bob
      const assigned = await assetsService.assignAsset(workspaceIdA, asset.id, memberAliceId, {
        toMembershipId: memberBobId,
        condition: 'EXCELLENT',
        notes: 'Assigned for engineering workstation',
      });
      expect(assigned.status).toBe('ASSIGNED');
      expect(assigned.assignedToMembershipId).toBe(memberBobId);
      expect(assigned.lifecycleHistory[0].eventType).toBe('ASSIGNED');

      // 3. Transfer from Bob to Charlie
      const transferred = await assetsService.transferAsset(workspaceIdA, asset.id, memberAliceId, {
        toMembershipId: memberCharlieId,
        toLocation: 'Floor 3 Design Bay',
        reason: 'Project handover to UX team',
        condition: 'GOOD',
      });
      expect(transferred.assignedToMembershipId).toBe(memberCharlieId);
      expect(transferred.location).toBe('Floor 3 Design Bay');
      expect(transferred.lifecycleHistory[0].eventType).toBe('TRANSFERRED');

      // 4. Charlie returns asset to central pool
      const returned = await assetsService.returnAsset(workspaceIdA, asset.id, memberAliceId, {
        condition: 'GOOD',
        returnLocation: 'Central Inventory Storage',
        notes: 'Project completed, display returned in good condition',
      });
      expect(returned.status).toBe('AVAILABLE');
      expect(returned.assignedToMembershipId).toBeNull();
      expect(returned.lifecycleHistory[0].eventType).toBe('RETURNED');
      expect(returned.condition).toBe('GOOD');
    });

    it('records asset maintenance and retirement with salvage value', async () => {
      const asset = await assetsService.createAsset(workspaceIdA, memberAliceId, {
        name: 'LaserJet Enterprise Printer',
        assetTag: 'AST-PRN-003',
      });

      // Maintenance
      const underMaint = await assetsService.recordMaintenance(workspaceIdA, asset.id, memberAliceId, {
        action: 'START',
        issueDescription: 'Fuser roller jam and toner leakage',
        serviceProvider: 'HP Official Enterprise Support',
        cost: 250,
      });
      expect(underMaint.status).toBe('UNDER_MAINTENANCE');
      expect(underMaint.lifecycleHistory[0].eventType).toBe('MAINTENANCE_STARTED');

      // Retire / Dispose
      const retired = await assetsService.retireAsset(workspaceIdA, asset.id, memberAliceId, {
        reason: 'Beyond economical repair; decommissioned',
        salvageValue: 50,
      });
      expect(retired.status).toBe('DISPOSED');
      expect(retired.lifecycleHistory[0].eventType).toBe('DISPOSED');
      expect(retired.condition).toBe('POOR');
    });
  });

  // ===========================================================================
  // SECTION 3: NATIVE DOCUMENT STORAGE, VALIDATION & CREDENTIAL PROTECTION
  // ===========================================================================
  describe('3. Native Document Storage, Validation & Cross-Tenant Isolation', () => {
    it('uploads valid document and returns metadata without exposing storage credentials', async () => {
      const fakePdfBuffer = Buffer.from('%PDF-1.4 Mock PDF Document Content');

      const file = await filesService.uploadFile(
        workspaceIdA,
        memberAliceId,
        fakePdfBuffer,
        'quarterly_compliance_audit.pdf',
        'application/pdf',
        { entityType: 'asset', entityId: 'ast_101', isPublic: false },
      );

      expect(file.originalName).toBe('quarterly_compliance_audit.pdf');
      expect(file.mimeType).toBe('application/pdf');
      expect(file.entityType).toBe('asset');
      expect(file.entityId).toBe('ast_101');
      expect(file.isPublic).toBe(false);

      // Verify that secret credentials/keys are NEVER returned
      expect((file as any).secretAccessKey).toBeUndefined();
      expect((file as any).accessKeyId).toBeUndefined();

      // Verify AuditLog
      expect(auditLogTable.some((l) => l.action === 'FILE_UPLOADED' && l.entityId === file.id)).toBe(true);
    });

    it('rejects dangerous executable extensions and oversized files', async () => {
      const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');

      // 1. Rejects dangerous executable
      await expect(
        filesService.uploadFile(
          workspaceIdA,
          memberAliceId,
          fakeExeBuffer,
          'trojan_payload.exe',
          'application/octet-stream',
        ),
      ).rejects.toThrow(BadRequestException);

      // 2. Rejects oversized file (> 25 MB)
      const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024); // 26 MB
      await expect(
        filesService.uploadFile(
          workspaceIdA,
          memberAliceId,
          oversizedBuffer,
          'giant_video.mov',
          'video/quicktime',
        ),
      ).rejects.toThrow(BadRequestException);

      // 3. Rejects empty file
      await expect(
        filesService.uploadFile(
          workspaceIdA,
          memberAliceId,
          Buffer.alloc(0),
          'empty.txt',
          'text/plain',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('generates secure temporary pre-signed download URL for private files and audits access', async () => {
      const buffer = Buffer.from('Confidential financial statements');
      const uploaded = await filesService.uploadFile(
        workspaceIdA,
        memberAliceId,
        buffer,
        'financials.pdf',
        'application/pdf',
        { isPublic: false },
      );

      const retrieved = await filesService.getFile(workspaceIdA, uploaded.id, memberBobId);
      expect(retrieved.downloadUrl).toContain('signed_token');
      expect(retrieved.downloadUrl).toContain('expires=3600');

      // Verify access audit
      expect(auditLogTable.some((l) => l.action === 'FILE_ACCESSED' && l.entityId === uploaded.id)).toBe(true);
    });

    it('strictly isolates files across workspaces (cross-tenant security)', async () => {
      const buffer = Buffer.from('Workspace Alpha confidential trade secrets');
      const fileInA = await filesService.uploadFile(
        workspaceIdA,
        memberAliceId,
        buffer,
        'alpha_secrets.pdf',
        'application/pdf',
      );

      // Attempting to query fileInA from Workspace B must return NotFoundException
      await expect(
        filesService.getFile(workspaceIdB, fileInA.id, memberAliceId),
      ).rejects.toThrow(NotFoundException);
    });

    it('completes file deletion lifecycle and removes storage object and database record', async () => {
      const buffer = Buffer.from('Temporary file to be deleted');
      const file = await filesService.uploadFile(
        workspaceIdA,
        memberAliceId,
        buffer,
        'temp_notes.txt',
        'text/plain',
      );

      const deleteResult = await filesService.deleteFile(workspaceIdA, file.id, memberAliceId);
      expect(deleteResult.deletedId).toBe(file.id);

      // Verify file is gone
      await expect(
        filesService.getFile(workspaceIdA, file.id, memberAliceId),
      ).rejects.toThrow(NotFoundException);

      // Verify deletion audit
      expect(auditLogTable.some((l) => l.action === 'FILE_DELETED' && l.entityId === file.id)).toBe(true);
    });
  });
});
