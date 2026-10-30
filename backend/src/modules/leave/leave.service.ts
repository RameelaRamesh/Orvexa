import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaveType, LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // POLICIES

  async listPolicies(workspaceId: string) {
    let policies = await this.prisma.leavePolicy.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });

    if (policies.length === 0) {
      // Seed default leave policies
      const defaultTypes: Array<{ type: LeaveType; name: string; alloc: number }> = [
        { type: LeaveType.ANNUAL, name: 'Annual Paid Leave', alloc: 15 },
        { type: LeaveType.SICK, name: 'Sick Leave', alloc: 10 },
        { type: LeaveType.CASUAL, name: 'Casual Leave', alloc: 7 },
        { type: LeaveType.UNPAID, name: 'Unpaid Leave', alloc: 30 },
      ];

      for (const t of defaultTypes) {
        await this.prisma.leavePolicy.create({
          data: {
            workspaceId,
            leaveType: t.type,
            name: t.name,
            annualAllocation: t.alloc,
            paid: t.type !== LeaveType.UNPAID,
          },
        });
      }

      policies = await this.prisma.leavePolicy.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
      });
    }

    return policies;
  }

  async upsertPolicy(workspaceId: string, data: { leaveType: LeaveType; name: string; annualAllocation: number; paid?: boolean; allowNegativeBalance?: boolean; requireDocument?: boolean }) {
    return this.prisma.leavePolicy.upsert({
      where: { workspaceId_leaveType: { workspaceId, leaveType: data.leaveType } },
      update: {
        name: data.name,
        annualAllocation: Number(data.annualAllocation),
        paid: data.paid !== undefined ? data.paid : true,
        allowNegativeBalance: !!data.allowNegativeBalance,
        requireDocument: !!data.requireDocument,
      },
      create: {
        workspaceId,
        leaveType: data.leaveType,
        name: data.name,
        annualAllocation: Number(data.annualAllocation),
        paid: data.paid !== undefined ? data.paid : true,
        allowNegativeBalance: !!data.allowNegativeBalance,
        requireDocument: !!data.requireDocument,
      },
    });
  }

  // BALANCES

  async getMemberBalances(workspaceId: string, membershipId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const policies = await this.listPolicies(workspaceId);

    // Ensure balance record exists for each policy
    for (const policy of policies) {
      await this.prisma.leaveBalance.upsert({
        where: {
          membershipId_leaveType_year: {
            membershipId,
            leaveType: policy.leaveType,
            year: currentYear,
          },
        },
        update: {},
        create: {
          workspaceId,
          membershipId,
          leaveType: policy.leaveType,
          year: currentYear,
          allocated: policy.annualAllocation,
        },
      });
    }

    return this.prisma.leaveBalance.findMany({
      where: { workspaceId, membershipId, year: currentYear },
    });
  }

  async adjustBalance(
    workspaceId: string,
    membershipId: string,
    leaveType: LeaveType,
    allocated: number,
  ) {
    const currentYear = new Date().getFullYear();
    return this.prisma.leaveBalance.upsert({
      where: {
        membershipId_leaveType_year: {
          membershipId,
          leaveType,
          year: currentYear,
        },
      },
      update: { allocated: Number(allocated) },
      create: {
        workspaceId,
        membershipId,
        leaveType,
        year: currentYear,
        allocated: Number(allocated),
      },
    });
  }

  // LEAVE REQUESTS

  async list(
    workspaceId: string,
    query?: { membershipId?: string; status?: string; departmentId?: string },
  ) {
    const where: any = { workspaceId };
    if (query?.membershipId) where.membershipId = query.membershipId;
    if (query?.status) where.status = query.status as LeaveStatus;

    if (query?.departmentId) {
      where.membership = { departmentId: query.departmentId };
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        membership: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
            department: true,
            designation: true,
          },
        },
        approvedBy: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    workspaceId: string,
    membershipId: string,
    data: { leaveType: LeaveType; startDate: Date | string; endDate: Date | string; totalDays: number; reason?: string },
  ) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start date or end date');
    }

    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const totalDays = Number(data.totalDays) || Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

    // Overlap check
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        workspaceId,
        membershipId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('You already have a pending or approved leave request during these dates');
    }

    // Policy & balance check
    const policy = await this.prisma.leavePolicy.findUnique({
      where: { workspaceId_leaveType: { workspaceId, leaveType: data.leaveType } },
    });

    const currentYear = start.getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        membershipId_leaveType_year: {
          membershipId,
          leaveType: data.leaveType,
          year: currentYear,
        },
      },
    });

    const available = (balance ? balance.allocated + balance.carriedOver - balance.used - balance.pending : (policy?.annualAllocation || 0));

    if (available < totalDays && !policy?.allowNegativeBalance && data.leaveType !== 'UNPAID') {
      throw new BadRequestException(
        `Insufficient leave balance. Requested ${totalDays} days, but only ${available} days available.`,
      );
    }

    // Create request and update pending balance in transaction
    const createdRequest = await this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.create({
        data: {
          workspaceId,
          membershipId,
          leaveType: data.leaveType || 'ANNUAL',
          startDate: start,
          endDate: end,
          totalDays,
          reason: data.reason,
          status: 'PENDING',
        },
      });

      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { pending: { increment: totalDays } },
        });
      }

      return request;
    });

    // Notify appropriate approvers
    try {
      const applicant = await this.prisma.membership.findUnique({
        where: { id: membershipId },
        include: { user: true, designation: true },
      });
      const applicantName = applicant?.user
        ? `${applicant.user.firstName || ''} ${applicant.user.lastName || ''}`.trim()
        : 'Team Member';

      const isApplicantHR =
        applicant?.accessRole === 'ADMIN' ||
        (applicant?.designation?.title && /hr/i.test(applicant.designation.title));

      // If HR applies for leave, only OWNER is notified to approve/disapprove
      // Otherwise, both OWNER and HR (ADMIN) are notified
      const approverMembers = await this.prisma.membership.findMany({
        where: {
          workspaceId,
          status: 'ACTIVE',
          accessRole: isApplicantHR ? 'OWNER' : { in: ['OWNER', 'ADMIN'] },
        },
      });

      for (const approver of approverMembers) {
        if (approver.id === membershipId) continue;
        await this.prisma.notification.create({
          data: {
            workspaceId,
            recipientMembershipId: approver.id,
            title: isApplicantHR
              ? `🔔 HR Leave Request (Owner Approval Required): ${applicantName}`
              : `🔔 New Leave Request: ${applicantName}`,
            message: `${applicantName} applied for ${totalDays} day(s) of ${data.leaveType} leave (${start.toLocaleDateString()} - ${end.toLocaleDateString()}). ${
              isApplicantHR ? 'As an HR Executive request, Owner review is required.' : 'Review and take action.'
            }`,
            link: '/app/time?tab=leave',
          },
        });
      }
    } catch {
      // Non-blocking notification
    }

    return createdRequest;
  }

  async updateStatus(
    id: string,
    workspaceId: string,
    approverMembershipId: string,
    status: LeaveStatus,
  ) {
    const approver = await this.prisma.membership.findFirst({
      where: { id: approverMembershipId, workspaceId, status: 'ACTIVE' },
      include: { user: true, designation: true },
    });

    if (!approver) {
      throw new ForbiddenException('Approver membership not found or inactive');
    }

    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, workspaceId },
      include: {
        membership: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            designation: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Rule 1: Strict self-approval prevention (no user can approve/reject their own leave)
    if (request.membershipId === approverMembershipId) {
      throw new ForbiddenException('You cannot approve or reject your own leave application.');
    }

    // Rule 2: Team Leads / Managers have view-only access, cannot approve or reject
    const isApproverTeamLeadOrManager =
      approver.accessRole === 'MANAGER' ||
      (approver.designation?.title && /lead/i.test(approver.designation.title) && approver.accessRole !== 'OWNER' && approver.accessRole !== 'ADMIN');

    if (isApproverTeamLeadOrManager || approver.accessRole === 'MEMBER') {
      throw new ForbiddenException(
        'Team Leads and Managers have view-only access to leave applications. Approvals can only be performed by HR Executives or the Organization Owner.',
      );
    }

    // Rule 3: HR leave applications must ONLY be approved or disapproved by the OWNER
    const isApplicantHR =
      request.membership.accessRole === 'ADMIN' ||
      (request.membership.designation?.title && /hr/i.test(request.membership.designation.title)) ||
      (request.membership.user?.email && /hr/i.test(request.membership.user.email));

    if (isApplicantHR && approver.accessRole !== 'OWNER') {
      throw new ForbiddenException(
        'Leave applications for HR Executives can only be approved or rejected by the Organization Owner.',
      );
    }

    // Rule 4: For regular team members, only OWNER and ADMIN (HR Executive) are authorized
    if (approver.accessRole !== 'OWNER' && approver.accessRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Only HR Executives and the Organization Owner are authorized to approve or reject leave applications.',
      );
    }

    if (request.status === status) {
      return request;
    }

    const currentYear = request.startDate.getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        membershipId_leaveType_year: {
          membershipId: request.membershipId,
          leaveType: request.leaveType,
          year: currentYear,
        },
      },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const prevStatus = request.status;
      const res = await tx.leaveRequest.update({
        where: { id },
        data: {
          status,
          approvedByMembershipId: approverMembershipId,
        },
      });

      if (balance) {
        if (prevStatus === 'PENDING' && status === 'APPROVED') {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pending: { decrement: request.totalDays },
              used: { increment: request.totalDays },
            },
          });
        } else if (prevStatus === 'PENDING' && status === 'REJECTED') {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pending: { decrement: request.totalDays },
            },
          });
        } else if (prevStatus === 'PENDING' && status === 'CANCELLED') {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pending: { decrement: request.totalDays },
            },
          });
        } else if (prevStatus === 'APPROVED' && status === 'CANCELLED') {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              used: { decrement: request.totalDays },
            },
          });
        }
      }

      return res;
    });

    // Notify the applicant of approval or rejection
    try {
      const approverName = approver.user?.firstName
        ? `${approver.user.firstName} ${approver.user.lastName || ''}`.trim()
        : 'Management';
      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId: request.membershipId,
          title: status === 'APPROVED' ? '✅ Leave Request Approved' : '❌ Leave Request Rejected',
          message: `Your ${request.leaveType} leave request (${new Date(
            request.startDate,
          ).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()}) was ${status.toLowerCase()} by ${approverName}.`,
          link: '/app/time?tab=leave',
        },
      });
    } catch {
      // Non-blocking notification
    }

    return updated;
  }

  async getLeaveCalendar(workspaceId: string, month?: number, year?: number) {
    const y = year || new Date().getFullYear();
    const m = month !== undefined ? month : new Date().getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59);

    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        workspaceId,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
      include: {
        membership: {
          include: {
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
            department: true,
            team: true,
          },
        },
      },
    });

    const holidays = await this.prisma.holiday.findMany({
      where: {
        workspaceId,
        date: { gte: start, lte: end },
      },
    });

    return { leaves, holidays };
  }
}
