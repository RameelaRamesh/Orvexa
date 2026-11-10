import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QualityPassStatus } from '@prisma/client';
import {
  isTargetWithinScope,
  resolveEffectiveScope,
  resolveLedTeamIds,
} from '../../common/utils/access-scope.util';

@Injectable()
export class QualityService {
  constructor(private readonly prisma: PrismaService) {}

  async listReviews(workspaceId: string, userContext?: any) {
    const reviews = await this.prisma.qualityReview.findMany({
      where: { workspaceId },
      include: {
        workItem: {
          include: {
            assignedMembership: {
              select: { id: true, departmentId: true, teamId: true, reportsToId: true },
            },
          },
        },
        reviewer: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { reviewedAt: 'desc' },
    });

    if (!userContext || resolveEffectiveScope(userContext) === 'GLOBAL') return reviews;
    const ledTeamIds = await resolveLedTeamIds(this.prisma, workspaceId, userContext.membershipId);
    return reviews.filter((r: any) => {
      if (r.reviewerMembershipId === userContext.membershipId) return true;
      const wiMem = r.workItem?.assignedMembership;
      if (wiMem && isTargetWithinScope(userContext, wiMem, ledTeamIds)) return true;
      return r.reviewer ? isTargetWithinScope(userContext, r.reviewer, ledTeamIds) : false;
    });
  }

  async submitReview(
    workspaceId: string,
    reviewerMembershipId: string,
    data: {
      workItemId: string;
      score: number;
      maxScore?: number;
      passStatus: QualityPassStatus;
      defects?: any;
      feedback?: string;
    },
    userContext?: any,
  ) {
    if (userContext && resolveEffectiveScope(userContext) !== 'GLOBAL') {
      const workItem = await this.prisma.workItem.findFirst({
        where: { id: data.workItemId, workspaceId },
        include: { assignedMembership: true },
      });
      if (workItem?.assignedMembership) {
        const ledTeamIds = await resolveLedTeamIds(this.prisma, workspaceId, userContext.membershipId);
        if (!isTargetWithinScope(userContext, workItem.assignedMembership, ledTeamIds)) {
          throw new ForbiddenException('Access denied: Cannot review a work item outside your visibility scope');
        }
      }
    }
    const review = await this.prisma.qualityReview.create({
      data: {
        workspaceId,
        workItemId: data.workItemId,
        reviewerMembershipId,
        score: Number(data.score),
        maxScore: Number(data.maxScore || 100),
        passStatus: data.passStatus,
        defects: data.defects || [],
        feedback: data.feedback,
      },
    });

    // Update WorkItem status & QA score
    await this.prisma.workItem.update({
      where: { id: data.workItemId },
      data: {
        qaScore: Number(data.score),
        status: data.passStatus === 'PASSED' ? 'COMPLETED' : 'REWORK',
      },
    });

    return review;
  }
}
