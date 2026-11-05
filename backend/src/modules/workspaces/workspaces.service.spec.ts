import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { PlanTier } from '@prisma/client';

describe('WorkspacesService (Phase 3 Entitlement & Creation Tests)', () => {
  let service: WorkspacesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      workspace: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      membership: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      plan: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  describe('createWorkspace', () => {
    it('should provision initial Free Tier subscription upon organization creation', async () => {
      const mockWorkspace = { id: 'ws_new', name: 'Acme Corp', slug: 'acme-corp-1234' };
      const mockOwnerRole = { id: 'role_owner', name: 'OWNER' };
      const mockFreePlan = { id: 'plan_free', code: PlanTier.FREE };

      prisma.workspace.create.mockResolvedValue(mockWorkspace);
      prisma.role.findFirst.mockResolvedValue(mockOwnerRole);
      prisma.plan.findFirst.mockResolvedValue(mockFreePlan);
      prisma.subscription.create.mockResolvedValue({ id: 'sub_free', workspaceId: 'ws_new' });
      prisma.membership.create.mockResolvedValue({ id: 'mem_owner' });

      const res = await service.createWorkspace('usr_1', 'Acme Corp');

      expect(prisma.workspace.create).toHaveBeenCalled();
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws_new',
            planId: mockFreePlan.id,
            status: 'ACTIVE',
            seatCount: 5,
          }),
        }),
      );
      expect(res.workspace).toBeDefined();
    });
  });

  describe('updateSettings module entitlements', () => {
    it('should throw BadRequestException when Free tier attempts to enable unauthorized modules', async () => {
      const activeFreeSub = {
        id: 'sub_free',
        plan: {
          name: 'Free Tier',
          code: PlanTier.FREE,
          entitlements: { features: ['people', 'projects', 'tasks', 'time'] },
        },
      };

      prisma.subscription.findFirst.mockResolvedValue(activeFreeSub);

      await expect(
        service.updateSettings('ws_1', {
          settings: {
            enabledModules: ['people', 'projects', 'quality', 'sla'],
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow module update when all requested modules are within plan entitlements', async () => {
      const activeFreeSub = {
        id: 'sub_free',
        plan: {
          name: 'Free Tier',
          code: PlanTier.FREE,
          entitlements: { features: ['people', 'projects', 'tasks', 'time'] },
        },
      };

      prisma.subscription.findFirst.mockResolvedValue(activeFreeSub);
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', settings: {} });
      prisma.workspace.update.mockResolvedValue({ id: 'ws_1' });

      await service.updateSettings('ws_1', {
        settings: {
          enabledModules: ['people', 'tasks', 'time'],
        },
      });

      expect(prisma.workspace.update).toHaveBeenCalled();
    });

    it('should allow all modules when plan entitlements feature is "all" (Business Pro)', async () => {
      const activeBusinessSub = {
        id: 'sub_biz',
        plan: {
          name: 'Business Pro',
          code: PlanTier.BUSINESS,
          entitlements: { features: ['all'] },
        },
      };

      prisma.subscription.findFirst.mockResolvedValue(activeBusinessSub);
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', settings: {} });
      prisma.workspace.update.mockResolvedValue({ id: 'ws_1' });

      await service.updateSettings('ws_1', {
        settings: {
          enabledModules: ['people', 'projects', 'tasks', 'work_queue', 'time', 'attendance', 'quality', 'sla'],
        },
      });

      expect(prisma.workspace.update).toHaveBeenCalled();
    });
  });
});
