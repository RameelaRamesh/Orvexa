import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QualityPassStatus } from '@prisma/client';

@Injectable()
export class QualityService {
  constructor(private readonly prisma: PrismaService) {}

  async listReviews(workspaceId: string) {
    return this.prisma.qualityReview.findMany({
      where: { workspaceId },
      include: {
        workItem: { select: { id: true, title: true, batchId: true, currentStage: true } },
        reviewer: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { reviewedAt: 'desc' },
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
  ) {
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
