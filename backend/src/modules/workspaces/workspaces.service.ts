import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PlanTier } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkspace(
    userId: string,
    name: string,
    businessType?: string,
    country?: string,
    orgSize?: string,
  ) {
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

    // Initial default modules for Free tier
    const defaultModules = ['people', 'projects', 'tasks', 'time'];

    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        slug,
        businessType: businessType || 'GENERAL',
        settings: {
          country: country || 'US',
          orgSize: orgSize || '1-10',
          enabledModules: defaultModules,
        },
      },
    });

    // Auto-provision initial Free Tier subscription
    let freePlan = await this.prisma.plan.findFirst({ where: { code: PlanTier.FREE } });
    if (!freePlan) {
      freePlan = await this.prisma.plan.create({
        data: {
          name: 'Free Tier',
          code: PlanTier.FREE,
          priceMonthly: 0,
          priceYearly: 0,
          entitlements: {
            maxUsers: 5,
            maxStorageMb: 1000,
            features: defaultModules,
            description: 'Essential organization and core work tracking for small teams.',
            conditions: 'Up to 5 team members. 1 GB storage. Core work management.',
          },
        },
      });
    }

    await this.prisma.subscription.create({
      data: {
        workspaceId: workspace.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        seatCount: 5,
      },
    });

    let ownerRole = await this.prisma.role.findFirst({
      where: { name: 'OWNER', isSystemRole: true },
    });

    if (!ownerRole) {
      ownerRole = await this.prisma.role.create({
        data: {
          name: 'OWNER',
          description: 'Workspace Owner',
          isSystemRole: true,
        },
      });
    }

    const membership = await this.prisma.membership.create({
      data: {
        userId,
        workspaceId: workspace.id,
        roleId: ownerRole.id,
        accessRole: 'OWNER',
        status: 'ACTIVE',
      },
    });

    return { workspace, membership };
  }

  async getUserWorkspaces(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        workspace: true,
        role: true,
        department: true,
        team: true,
        designation: true,
      },
    });
  }

  async getWorkspaceDetails(workspaceId: string, userId?: string) {
    if (userId) {
      const membership = await this.prisma.membership.findFirst({
        where: { workspaceId, userId, status: 'ACTIVE' },
      });

      if (!membership) {
        throw new ForbiddenException('Tenant access denied or inactive membership');
      }
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: {
          select: {
            id: true,
            accessRole: true,
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
            department: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
            designation: { select: { id: true, title: true } },
          },
        },
        departments: true,
        teams: true,
        designations: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async updateSettings(workspaceId: string, payload: any) {
    const dataToUpdate: any = {};
    if (payload?.name) dataToUpdate.name = payload.name;
    if (payload?.businessType) dataToUpdate.businessType = payload.businessType;

    const newSettings = payload?.settings !== undefined ? payload.settings : (payload?.name || payload?.businessType ? undefined : payload);

    if (newSettings) {
      if (Array.isArray(newSettings.enabledModules)) {
        // Enforce subscription plan module entitlements
        const activeSub = await this.prisma.subscription.findFirst({
          where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
          include: { plan: true },
        });

        const allowedFeatures: string[] = (activeSub?.plan?.entitlements as any)?.features || ['people', 'projects', 'tasks', 'time'];
        if (!allowedFeatures.includes('all')) {
          const unauthorizedModules = newSettings.enabledModules.filter(
            (mod: string) => !allowedFeatures.includes(mod),
          );
          if (unauthorizedModules.length > 0) {
            throw new BadRequestException(
              `Module(s) [${unauthorizedModules.join(', ')}] are not permitted on the ${activeSub?.plan?.name || 'Free'} plan. Upgrade your subscription to unlock these capabilities.`,
            );
          }
        }
      }

      const current = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      const currentSettings = (current?.settings as object) || {};
      dataToUpdate.settings = { ...currentSettings, ...newSettings };
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: dataToUpdate,
    });
  }

  /**
   * Track resumable organization onboarding progress, separating mandatory from optional steps
   */
  async getOnboardingStatus(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        departments: { select: { id: true, name: true, code: true } },
        memberships: {
          where: { status: 'ACTIVE' },
          select: { id: true, accessRole: true, user: { select: { email: true, firstName: true } } },
        },
        invitations: {
          where: { status: 'PENDING' },
          select: { id: true, email: true, firstName: true, accessRole: true },
        },
      },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    const settings: any = (workspace.settings as object) || {};
    const onboarding: any = settings.onboarding || {};

    const mandatorySteps = ['profile', 'schedule'];
    const optionalSteps = ['holidays', 'locations', 'departments', 'team_invite'];

    const completedSteps: string[] = Array.isArray(onboarding.completedSteps)
      ? [...onboarding.completedSteps]
      : [];

    // Dynamically verify step completions
    const hasProfile = Boolean(workspace.name && settings.country && settings.timezone);
    if (hasProfile && !completedSteps.includes('profile')) {
      completedSteps.push('profile');
    }

    const shiftsCount = await this.prisma.shift.count({ where: { workspaceId } });
    const hasSchedule = Boolean(settings.schedule || shiftsCount > 0);
    if (hasSchedule && !completedSteps.includes('schedule')) {
      completedSteps.push('schedule');
    }

    if (Array.isArray(settings.holidays) && settings.holidays.length > 0 && !completedSteps.includes('holidays')) {
      completedSteps.push('holidays');
    }

    if (Array.isArray(settings.locations) && settings.locations.length > 0 && !completedSteps.includes('locations')) {
      completedSteps.push('locations');
    }

    if (workspace.departments.length > 0 && !completedSteps.includes('departments')) {
      completedSteps.push('departments');
    }

    if ((workspace.invitations.length > 0 || workspace.memberships.length > 1) && !completedSteps.includes('team_invite')) {
      completedSteps.push('team_invite');
    }

    // Check mandatory completion
    const incompleteMandatorySteps = mandatorySteps.filter((s) => !completedSteps.includes(s));
    const isCompleted = incompleteMandatorySteps.length === 0;

    // Next actionable step
    const allSteps = [...mandatorySteps, ...optionalSteps];
    const currentStep = allSteps.find((s) => !completedSteps.includes(s)) || 'completed';

    // Calculate progress: mandatory steps carry 60% weight, optional carry 40% weight
    const mandatoryCompletedCount = mandatorySteps.filter((s) => completedSteps.includes(s)).length;
    const optionalCompletedCount = optionalSteps.filter((s) => completedSteps.includes(s)).length;
    const progressPercentage = Math.round(
      (mandatoryCompletedCount / mandatorySteps.length) * 60 +
        (optionalCompletedCount / optionalSteps.length) * 40,
    );

    return {
      workspaceId,
      isCompleted,
      progressPercentage,
      currentStep,
      completedSteps,
      mandatorySteps,
      optionalSteps,
      incompleteMandatorySteps,
      setupData: {
        profile: {
          name: workspace.name,
          businessType: workspace.businessType,
          country: settings.country || 'US',
          timezone: settings.timezone || 'UTC',
          orgSize: settings.orgSize || '1-10',
        },
        schedule: settings.schedule || {
          workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
          startTime: '09:00',
          endTime: '17:00',
          workHoursPerDay: 8,
        },
        holidays: settings.holidays || [],
        locations: settings.locations || [],
        departments: workspace.departments,
        membersCount: workspace.memberships.length,
        pendingInvitesCount: workspace.invitations.length,
      },
    };
  }

  /**
   * Resumable organization setup journey: preserves data per step and updates workspace configuration
   */
  async updateOnboardingStep(workspaceId: string, step: string, data: any, markCompleted: boolean = true) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const currentSettings: any = (workspace.settings as object) || {};
    const onboarding: any = currentSettings.onboarding || {};
    const completedSteps: string[] = Array.isArray(onboarding.completedSteps)
      ? [...onboarding.completedSteps]
      : [];

    const workspaceDataToUpdate: any = {};
    const updatedSettings: any = { ...currentSettings };

    if (step === 'profile') {
      if (data?.name) workspaceDataToUpdate.name = data.name.trim();
      if (data?.businessType) workspaceDataToUpdate.businessType = data.businessType;
      if (data?.country) updatedSettings.country = data.country;
      if (data?.timezone) updatedSettings.timezone = data.timezone;
      if (data?.orgSize) updatedSettings.orgSize = data.orgSize;
    } else if (step === 'schedule') {
      updatedSettings.schedule = {
        workingDays: data?.workingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        startTime: data?.startTime || '09:00',
        endTime: data?.endTime || '17:00',
        workHoursPerDay: data?.workHoursPerDay || 8,
      };

      // Upsert default Shift record
      const existingShift = await this.prisma.shift.findFirst({ where: { workspaceId } });
      if (existingShift) {
        await this.prisma.shift.update({
          where: { id: existingShift.id },
          data: {
            name: 'Standard Shift',
            startTime: updatedSettings.schedule.startTime,
            endTime: updatedSettings.schedule.endTime,
            workDays: updatedSettings.schedule.workingDays,
          },
        });
      } else {
        await this.prisma.shift.create({
          data: {
            workspaceId,
            name: 'Standard Shift',
            startTime: updatedSettings.schedule.startTime,
            endTime: updatedSettings.schedule.endTime,
            workDays: updatedSettings.schedule.workingDays,
          },
        });
      }
    } else if (step === 'holidays') {
      updatedSettings.holidays = Array.isArray(data?.holidays) ? data.holidays : (Array.isArray(data) ? data : []);
    } else if (step === 'locations') {
      updatedSettings.locations = Array.isArray(data?.locations) ? data.locations : (Array.isArray(data) ? data : []);
    } else if (step === 'departments') {
      const depts = Array.isArray(data?.departments) ? data.departments : (Array.isArray(data) ? data : []);
      for (const d of depts) {
        if (d?.name) {
          const existing = await this.prisma.department.findFirst({
            where: { workspaceId, name: d.name.trim() },
          });
          if (!existing) {
            await this.prisma.department.create({
              data: {
                workspaceId,
                name: d.name.trim(),
                code: d.code ? d.code.trim().toUpperCase() : undefined,
              },
            });
          }
        }
      }
    }

    if (markCompleted && !completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    const mandatorySteps = ['profile', 'schedule'];
    const isCompleted = mandatorySteps.every((s) => completedSteps.includes(s));

    updatedSettings.onboarding = {
      ...onboarding,
      completedSteps,
      isCompleted,
      lastUpdatedStep: step,
      updatedAt: new Date(),
    };

    workspaceDataToUpdate.settings = updatedSettings;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: workspaceDataToUpdate,
    });

    return this.getOnboardingStatus(workspaceId);
  }
}
