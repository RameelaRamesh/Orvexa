import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '../../database/prisma.service';

describe('LeaveService - Independent Permissions & Scope-Bounded Approvals', () => {
  let service: LeaveService;
  let prisma: any;

  const mockLeaveRequest = {
    id: 'lv_100',
    workspaceId: 'ws_alpha',
    membershipId: 'mem_applicant',
    leaveType: 'CASUAL',
    startDate: new Date('2026-12-01'),
    endDate: new Date('2026-12-02'),
    totalDays: 2,
    status: 'PENDING',
    membership: {
      id: 'mem_applicant',
      accessRole: 'MEMBER',
      departmentId: 'dept_eng',
      teamId: 'team_backend',
      reportsToId: 'mem_team_lead',
      designation: { title: 'Software Engineer' },
      user: { firstName: 'Alex', lastName: 'Dev', email: 'alex@alpha.com' },
      role: { permissions: [{ permission: { code: 'leave:apply' } }] },
    },
  };

  beforeEach(async () => {
    prisma = {
      membership: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValue(mockLeaveRequest),
        update: jest.fn(),
      },
      leaveBalance: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      workspace: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ws_alpha', settings: {} }),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (fn: any) =>
        fn({
          leaveRequest: {
            update: jest.fn().mockImplementation(async ({ data }) => ({
              ...mockLeaveRequest,
              ...data,
            })),
          },
          leaveBalance: { update: jest.fn() },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
  });

  it('allows an HR Specialist (non-Admin custom role with leave:approve & GLOBAL scope) to approve leave', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'mem_hr_spec',
      workspaceId: 'ws_alpha',
      accessRole: 'MEMBER',
      dataScope: 'GLOBAL',
      designation: { title: 'HR Specialist' },
      user: { firstName: 'Hannah', lastName: 'HR' },
      role: {
        id: 'role_hr_spec',
        name: 'HR Specialist',
        permissions: [{ permission: { code: 'leave:approve' } }],
      },
    });
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'ws_alpha',
      settings: { roleDataScopes: { role_hr_spec: 'GLOBAL' } },
    });

    const updated = await service.updateStatus('lv_100', 'ws_alpha', 'mem_hr_spec', 'APPROVED' as any);
    expect(updated.status).toBe('APPROVED');
    expect(updated.approvedByMembershipId).toBe('mem_hr_spec');
  });

  it('allows a Team Lead explicitly granted leave:approve (with TEAM scope) to approve their own team member', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'mem_team_lead',
      workspaceId: 'ws_alpha',
      accessRole: 'MEMBER',
      dataScope: 'TEAM',
      teamId: 'team_backend',
      designation: { title: 'Team Lead' },
      user: { firstName: 'Marcus', lastName: 'Lead' },
      role: {
        id: 'role_tl',
        name: 'Team Lead',
        permissions: [{ permission: { code: 'leave:approve' } }],
      },
    });
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'ws_alpha',
      settings: { roleDataScopes: { role_tl: 'TEAM' } },
    });

    const updated = await service.updateStatus('lv_100', 'ws_alpha', 'mem_team_lead', 'APPROVED' as any);
    expect(updated.status).toBe('APPROVED');
  });

  it('blocks Team Lead from approving a member outside their team boundary', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'mem_other_lead',
      workspaceId: 'ws_alpha',
      accessRole: 'MEMBER',
      dataScope: 'TEAM',
      teamId: 'team_marketing',
      designation: { title: 'Marketing Lead' },
      user: { firstName: 'Sophia', lastName: 'Mkt' },
      role: {
        id: 'role_mkt_tl',
        name: 'Team Lead',
        permissions: [{ permission: { code: 'leave:approve' } }],
      },
    });
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'ws_alpha',
      settings: { roleDataScopes: { role_mkt_tl: 'TEAM' } },
    });

    await expect(
      service.updateStatus('lv_100', 'ws_alpha', 'mem_other_lead', 'APPROVED' as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks actors without leave:approve (e.g., leave:view only) and enforces self-approval & Owner-only HR leave approval', async () => {
    // 1. View-only role cannot approve
    prisma.membership.findFirst.mockResolvedValue({
      id: 'mem_viewer',
      workspaceId: 'ws_alpha',
      accessRole: 'MEMBER',
      dataScope: 'TEAM',
      teamId: 'team_backend',
      user: { firstName: 'View', lastName: 'Only' },
      role: { id: 'role_view', permissions: [{ permission: { code: 'leave:view' } }] },
    });
    await expect(
      service.updateStatus('lv_100', 'ws_alpha', 'mem_viewer', 'APPROVED' as any),
    ).rejects.toThrow(ForbiddenException);

    // 2. Self-approval blocked
    prisma.membership.findFirst.mockResolvedValue({
      id: 'mem_applicant',
      workspaceId: 'ws_alpha',
      accessRole: 'ADMIN',
      dataScope: 'GLOBAL',
      user: { firstName: 'Alex', lastName: 'Dev' },
      role: { id: 'role_admin', permissions: [{ permission: { code: 'leave:approve' } }] },
    });
    await expect(
      service.updateStatus('lv_100', 'ws_alpha', 'mem_applicant', 'APPROVED' as any),
    ).rejects.toThrow(ForbiddenException);

    // 3. HR applicant leave can only be approved by Owner (not Admin)
    prisma.leaveRequest.findFirst.mockResolvedValue({
      ...mockLeaveRequest,
      membershipId: 'mem_hr_applicant',
      membership: {
        ...mockLeaveRequest.membership,
        id: 'mem_hr_applicant',
        designation: { title: 'HR Specialist' },
        user: { firstName: 'Hannah', lastName: 'HR', email: 'hr@alpha.com' },
        role: { permissions: [{ permission: { code: 'leave:approve' } }] },
      },
    });
    prisma.membership.findFirst.mockResolvedValue({
      id: 'mem_admin',
      workspaceId: 'ws_alpha',
      accessRole: 'ADMIN',
      dataScope: 'GLOBAL',
      user: { firstName: 'Elena', lastName: 'Admin' },
      role: { id: 'role_admin', permissions: [] },
    });
    await expect(
      service.updateStatus('lv_100', 'ws_alpha', 'mem_admin', 'APPROVED' as any),
    ).rejects.toThrow(ForbiddenException);
  });
});
