import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('WorkspacesService - Organization Onboarding (Phase 4 Acceptance Tests)', () => {
  let service: WorkspacesService;
  let prisma: any;

  const mockWorkspace = {
    id: 'ws_demo_1',
    name: 'Acme Global Services',
    businessType: 'GENERAL',
    settings: {
      country: 'United States',
      timezone: 'UTC-05:00 (Eastern Time)',
      orgSize: '10-50',
      onboarding: {
        completedSteps: ['profile'],
        isCompleted: false,
      },
    },
    departments: [],
    memberships: [
      { id: 'mem_1', accessRole: 'OWNER', user: { email: 'owner@acme.com', firstName: 'Owner' } },
    ],
    invitations: [],
  };

  beforeEach(async () => {
    prisma = {
      workspace: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      shift: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      department: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      subscription: {
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

  describe('1. Incomplete Setup & Mandatory vs Optional Step Distinction', () => {
    it('should distinguish mandatory (profile, schedule) from optional steps', async () => {
      prisma.workspace.findUnique.mockResolvedValue({
        ...mockWorkspace,
        settings: {
          country: 'United States',
          timezone: 'UTC-05:00 (Eastern Time)',
          onboarding: { completedSteps: ['profile'] },
        },
      });
      prisma.shift.count.mockResolvedValue(0);

      const status = await service.getOnboardingStatus('ws_demo_1');

      expect(status.mandatorySteps).toEqual(['profile', 'schedule']);
      expect(status.optionalSteps).toEqual(['holidays', 'locations', 'departments', 'team_invite']);
      expect(status.incompleteMandatorySteps).toEqual(['schedule']);
      expect(status.isCompleted).toBe(false);
      expect(status.currentStep).toBe('schedule');
    });

    it('should calculate progress percentage accurately (60% mandatory weight, 40% optional)', async () => {
      // 1 of 2 mandatory completed = 30%, 0 optional completed = 0% -> 30%
      prisma.workspace.findUnique.mockResolvedValue({
        ...mockWorkspace,
        settings: {
          country: 'United States',
          timezone: 'UTC-05:00 (Eastern Time)',
          onboarding: { completedSteps: ['profile'] },
        },
      });
      prisma.shift.count.mockResolvedValue(0);

      const status = await service.getOnboardingStatus('ws_demo_1');
      expect(status.progressPercentage).toBe(30);
    });

    it('should mark setup isCompleted: true when mandatory steps are complete, without blocking on optional steps', async () => {
      prisma.workspace.findUnique.mockResolvedValue({
        ...mockWorkspace,
        settings: {
          country: 'United States',
          timezone: 'UTC-05:00 (Eastern Time)',
          schedule: {
            workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
            startTime: '09:00',
            endTime: '17:00',
            workHoursPerDay: 8,
          },
          onboarding: { completedSteps: ['profile', 'schedule'] },
        },
      });
      prisma.shift.count.mockResolvedValue(1);

      const status = await service.getOnboardingStatus('ws_demo_1');

      expect(status.incompleteMandatorySteps).toHaveLength(0);
      expect(status.isCompleted).toBe(true);
      // Mandatory 60% complete, optional 0% -> 60%
      expect(status.progressPercentage).toBe(60);
    });
  });

  describe('2. Resumable Setup Journey & Step Data Preservation', () => {
    it('should update profile step and preserve organization settings across refreshes', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspace.update.mockResolvedValue({});
      prisma.shift.count.mockResolvedValue(0);

      await service.updateOnboardingStep(
        'ws_demo_1',
        'profile',
        {
          name: 'Acme International',
          businessType: 'CORE_OPS',
          country: 'United Kingdom',
          timezone: 'UTC+00:00 (London)',
          orgSize: '50-250',
        },
        true,
      );

      expect(prisma.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ws_demo_1' },
          data: expect.objectContaining({
            name: 'Acme International',
            businessType: 'CORE_OPS',
            settings: expect.objectContaining({
              country: 'United Kingdom',
              timezone: 'UTC+00:00 (London)',
              orgSize: '50-250',
              onboarding: expect.objectContaining({
                completedSteps: expect.arrayContaining(['profile']),
              }),
            }),
          }),
        }),
      );
    });

    it('should upsert default Shift record when saving schedule step', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.shift.findFirst.mockResolvedValue(null);
      prisma.shift.create.mockResolvedValue({});
      prisma.workspace.update.mockResolvedValue({});
      prisma.shift.count.mockResolvedValue(1);

      await service.updateOnboardingStep(
        'ws_demo_1',
        'schedule',
        {
          workingDays: ['MON', 'TUE', 'WED', 'THU'],
          startTime: '08:30',
          endTime: '16:30',
          workHoursPerDay: 8,
        },
        true,
      );

      expect(prisma.shift.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws_demo_1',
          name: 'Standard Shift',
          startTime: '08:30',
          endTime: '16:30',
          workDays: ['MON', 'TUE', 'WED', 'THU'],
        },
      });
    });

    it('should persist optional holidays and locations lists in workspace settings', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.workspace.update.mockResolvedValue({});
      prisma.shift.count.mockResolvedValue(0);

      const holidayList = [
        { name: 'New Year', date: '2026-01-01', type: 'PUBLIC' },
        { name: 'Independence Day', date: '2026-07-04', type: 'PUBLIC' },
      ];

      await service.updateOnboardingStep('ws_demo_1', 'holidays', holidayList, true);

      expect(prisma.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              holidays: holidayList,
              onboarding: expect.objectContaining({
                completedSteps: expect.arrayContaining(['profile', 'holidays']),
              }),
            }),
          }),
        }),
      );
    });

    it('should create department records when saving departments step without duplicating existing units', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.department.findFirst.mockImplementation(({ where }) => {
        if (where.name === 'Operations') return Promise.resolve({ id: 'dept_1', name: 'Operations' });
        return Promise.resolve(null);
      });
      prisma.department.create.mockResolvedValue({});
      prisma.workspace.update.mockResolvedValue({});
      prisma.shift.count.mockResolvedValue(0);

      await service.updateOnboardingStep(
        'ws_demo_1',
        'departments',
        [
          { name: 'Operations', code: 'OPS' },
          { name: 'Customer Success', code: 'CS' },
        ],
        true,
      );

      // Operations existed, so only Customer Success should be created
      expect(prisma.department.create).toHaveBeenCalledTimes(1);
      expect(prisma.department.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws_demo_1',
          name: 'Customer Success',
          code: 'CS',
        },
      });
    });
  });

  describe('3. Pre-Stepper Onboarding, Recommendations & Shareable Invite Link', () => {
    it('returns exactly 8 employee brackets ending with Above 1,000 and multi-industry recommendations', () => {
      const rec = service.getOnboardingRecommendations(['IT_SOFTWARE', 'MARKETING_AGENCY'], '26-50');
      expect(rec.orgSizeBrackets).toHaveLength(8);
      expect(rec.orgSizeBrackets[0]).toMatchObject({ key: '0-10', label: '0 - 10' });
      expect(rec.orgSizeBrackets[7]).toMatchObject({ key: '1000+', label: 'Above 1,000' });
      expect(rec.recommendedModules).toEqual(expect.arrayContaining(['people', 'projects', 'tasks', 'time']));
      expect(Object.values(rec.recommendedFeatureToggles).filter(Boolean).length).toBeGreaterThan(5);
      expect(rec.starterRoleTemplates.map((r) => r.name)).not.toContain('Manager');
      expect(rec.starterRoleTemplates.map((r) => r.name)).not.toContain('Member');
    });

    it('stores pre-stepper industries_size, recommended_modules, and org_structure_choice without marking stepper steps complete', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ ...mockWorkspace, settings: { onboarding: { completedSteps: [] } } });
      prisma.workspace.update.mockResolvedValue({});
      prisma.shift.count.mockResolvedValue(0);

      await service.updateOnboardingStep(
        'ws_demo_1',
        'industries_size',
        { industries: ['IT_SOFTWARE', 'FINANCE_ACCOUNTING'], orgSize: '1000+' },
        true,
      );

      expect(prisma.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessType: 'IT_SOFTWARE',
            settings: expect.objectContaining({
              industries: ['IT_SOFTWARE', 'FINANCE_ACCOUNTING'],
              orgSize: '1000+',
              preStepper: expect.objectContaining({ welcomeDone: true, industriesDone: true }),
              onboarding: expect.objectContaining({
                completedSteps: [],
              }),
            }),
          }),
        }),
      );

      await service.updateOnboardingStep('ws_demo_1', 'org_structure_choice', { choice: 'skip_later' }, true);
      expect(prisma.workspace.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              preStepper: expect.objectContaining({ orgStructureChoice: 'skip_later', skipped: true }),
            }),
          }),
        }),
      );
    });

    it('generates shareable invite link and prevents configuring Owner or Admin as auto-assigned join role', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ ...mockWorkspace, settings: {} });
      prisma.workspace.update.mockResolvedValue({});
      const share = await service.getShareInviteLink('ws_demo_1');
      expect(share.joinUrl).toContain('/join?code=');
      expect(share.enabled).toBe(true);

      prisma.role = {
        findFirst: jest.fn().mockResolvedValue({ id: 'role_sys_admin', name: 'Admin', isSystemRole: true }),
      };
      await expect(
        service.updateShareInviteLink('ws_demo_1', { defaultRoleId: 'role_sys_admin' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
