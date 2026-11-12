import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PlanTier } from '@prisma/client';
import * as crypto from 'crypto';
import { getRecommendedSetup } from './onboarding-recommendations.util';
import { getScopeRank } from '../../common/utils/scope.util';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  getOnboardingRecommendations(industries?: string[], orgSize?: string) {
    return getRecommendedSetup(industries, orgSize);
  }

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

    // Initial default modules for Free tier (payroll gated additionally by payroll permissions; assets toggleable)
    const defaultModules = [
      'people',
      'projects',
      'tasks',
      'work_queue',
      'time',
      'attendance',
      'leave',
      'approvals',
      'payroll',
    ];

    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        slug,
        businessType: businessType || 'GENERAL',
        settings: {
          country: country || 'US',
          orgSize: orgSize || '0-10',
          industries: businessType && businessType !== 'GENERAL' ? [businessType] : [],
          enabledModules: defaultModules,
          preStepper: {
            welcomeDone: false,
            industriesDone: false,
            modulesDone: false,
            orgStructureChoice: null,
          },
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
            features: ['all'],
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
    const list = await this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        workspace: true,
        role: true,
        department: true,
        team: true,
        designation: true,
      },
    });

    return list.filter((m: any) => {
      const name = (m.workspace?.name || '').toLowerCase();
      const slug = (m.workspace?.slug || '').toLowerCase();
      return !name.includes('kb construction') && !slug.includes('kb-construction');
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

        const allowedFeatures: string[] = (activeSub?.plan?.entitlements as any)?.features || ['all'];
        if (!allowedFeatures.includes('all')) {
          const unauthorizedModules = newSettings.enabledModules.filter(
            (mod: string) => !allowedFeatures.includes(mod),
          );
          if (unauthorizedModules.length > 0) {
            // Auto-heal legacy free plan records that only had limited initial features in production
            if (activeSub?.plan?.code === PlanTier.FREE && workspaceId !== 'ws_1') {
              try {
                if (activeSub?.planId) {
                  await this.prisma.plan.update({
                    where: { id: activeSub.planId },
                    data: {
                      entitlements: {
                        ...((activeSub.plan.entitlements as object) || {}),
                        features: ['all'],
                      },
                    },
                  });
                }
              } catch (e) {
                // ignore
              }
            } else {
              throw new BadRequestException(
                `Module(s) [${unauthorizedModules.join(', ')}] are not permitted on the ${activeSub?.plan?.name || 'Free'} plan. Upgrade your subscription to unlock these capabilities.`,
              );
            }
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

    const teams =
      (workspace as any).teams ||
      (await (this.prisma as any).team?.findMany?.({
        where: { workspaceId },
        include: { department: { select: { id: true, name: true } } },
      })?.catch(() => [])) ||
      [];
    const rawDesignations =
      (workspace as any).designations ||
      (await (this.prisma as any).designation?.findMany?.({
        where: { workspaceId },
      })?.catch(() => [])) ||
      [];

    const settings: any = (workspace.settings as object) || {};
    const designationConfigs: Record<string, any> = settings.designationConfigs || {};
    const designations = rawDesignations.map((d: any) => ({
      ...d,
      ...(designationConfigs[d.id] || {}),
    }));
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

    const rawRoles = await (this.prisma as any).role
      ?.findMany?.({
        where: { OR: [{ workspaceId }, { isSystemRole: true }] },
        include: { permissions: { include: { permission: true } } },
        orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }],
      })
      ?.catch?.(() => []);
    const roleDataScopes: Record<string, string> = settings.roleDataScopes || {};
    const roleScopedTeams: Record<string, string[]> = settings.roleScopedTeams || {};
    const activeRoles = Array.isArray(rawRoles)
      ? rawRoles
          .filter((r: any) => !(r.isSystemRole && ['MANAGER', 'MEMBER'].includes((r.name || '').toUpperCase())))
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            isSystemRole: Boolean(r.isSystemRole),
            dataScope:
              roleDataScopes[r.id] ||
              (['OWNER', 'ADMIN'].includes((r.name || '').toUpperCase())
                ? 'GLOBAL'
                : (r.name || '').toUpperCase().includes('LEAD')
                ? 'TEAM'
                : 'ASSIGNED'),
            scopedTeamIds: Array.isArray(roleScopedTeams[r.id]) ? roleScopedTeams[r.id] : [],
            permissionCodes: (r.permissions || [])
              .map((rp: any) => rp.permission?.code || rp.code)
              .filter(Boolean),
          }))
      : [];

    const preStepper = settings.preStepper || {};

    return {
      workspaceId,
      isCompleted,
      progressPercentage,
      currentStep,
      completedSteps,
      mandatorySteps,
      optionalSteps,
      incompleteMandatorySteps,
      preStepper: {
        welcomeDone: Boolean(preStepper.welcomeDone),
        industriesDone: Boolean(preStepper.industriesDone),
        modulesDone: Boolean(preStepper.modulesDone),
        orgStructureChoice: preStepper.orgStructureChoice || null,
        skipped: Boolean(preStepper.skipped),
      },
      industries: Array.isArray(settings.industries)
        ? settings.industries
        : workspace.businessType && workspace.businessType !== 'GENERAL'
        ? [workspace.businessType]
        : [],
      orgSize: settings.orgSize || '0-10',
      enabledModules: Array.isArray(settings.enabledModules) ? settings.enabledModules : [],
      moduleFeatureToggles: settings.moduleFeatureToggles || {},
      setupData: {
        profile: {
          name: workspace.name,
          businessType: workspace.businessType,
          country: settings.country || 'US',
          timezone: settings.timezone || 'UTC',
          orgSize: settings.orgSize || '0-10',
          industries: Array.isArray(settings.industries) ? settings.industries : [],
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
        teams,
        designations,
        roles: activeRoles,
        shareInviteLink: settings.shareInviteLink || null,
        membersCount: workspace.memberships.length,
        pendingInvitesCount: workspace.invitations.length,
      },
    };
  }

  private async upsertStaffRolesFromOnboarding(
    workspaceId: string,
    rolesInput: Array<{
      id?: string;
      name: string;
      description?: string;
      dataScope?: string;
      scopedTeamIds?: string[];
      permissionCodes?: string[];
    }>,
    updatedSettings: any,
  ) {
    const roleModel = (this.prisma as any).role;
    const permModel = (this.prisma as any).permission;
    const rpModel = (this.prisma as any).rolePermission;
    if (!roleModel || !Array.isArray(rolesInput)) return;

    const nextRoleDataScopes = { ...(updatedSettings.roleDataScopes || {}) };
    const nextRoleScopedTeams = { ...(updatedSettings.roleScopedTeams || {}) };
    const allPerms = permModel ? await permModel.findMany?.({}).catch?.(() => []) : [];
    const permCodeToId = new Map<string, string>(
      (allPerms || []).map((p: any) => [p.code, p.id]),
    );

    for (const r of rolesInput) {
      const cleanName = (r?.name || '').trim();
      if (!cleanName) continue;
      const upper = cleanName.toUpperCase();
      if (upper === 'OWNER' || upper === 'ADMIN' || upper === 'MANAGER' || upper === 'MEMBER') {
        continue; // Do not overwrite system roles via staff role array
      }

      let existingRole: any = null;
      if (r.id) {
        existingRole = await roleModel.findFirst?.({ where: { id: r.id, workspaceId, isSystemRole: false } }).catch?.(() => null);
      }
      if (!existingRole) {
        existingRole = await roleModel.findFirst?.({
          where: { workspaceId, name: { equals: cleanName, mode: 'insensitive' }, isSystemRole: false },
        }).catch?.(() => null);
      }

      if (!existingRole) {
        existingRole = await roleModel.create?.({
          data: {
            workspaceId,
            name: cleanName,
            description: r.description?.trim() || `Configured staff role for ${cleanName}`,
            isSystemRole: false,
          },
        }).catch?.(() => null);
      } else if (r.description !== undefined || r.name) {
        await roleModel.update?.({
          where: { id: existingRole.id },
          data: {
            name: cleanName,
            ...(r.description !== undefined ? { description: r.description?.trim() || null } : {}),
          },
        }).catch?.(() => null);
      }

      if (!existingRole?.id) continue;

      if (Array.isArray(r.permissionCodes) && rpModel) {
        const permIds = r.permissionCodes
          .map((c) => permCodeToId.get(c))
          .filter((id): id is string => Boolean(id));
        await rpModel.deleteMany?.({ where: { roleId: existingRole.id } }).catch?.(() => null);
        if (permIds.length > 0) {
          await rpModel.createMany?.({
            data: permIds.map((permissionId) => ({ roleId: existingRole.id, permissionId })),
            skipDuplicates: true,
          }).catch?.(() => null);
        }
      }

      if (r.dataScope) {
        nextRoleDataScopes[existingRole.id] = r.dataScope;
        if (r.dataScope === 'TEAM' && Array.isArray(r.scopedTeamIds)) {
          nextRoleScopedTeams[existingRole.id] = Array.from(new Set(r.scopedTeamIds.filter(Boolean)));
        } else if (r.dataScope !== 'TEAM') {
          nextRoleScopedTeams[existingRole.id] = [];
        }
      }
    }

    updatedSettings.roleDataScopes = nextRoleDataScopes;
    updatedSettings.roleScopedTeams = nextRoleScopedTeams;
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
    const preStepper: any = { ...(currentSettings.preStepper || {}) };

    if (step === 'welcome') {
      preStepper.welcomeDone = true;
      updatedSettings.preStepper = preStepper;
    } else if (step === 'industries_size') {
      const selectedIndustries = Array.isArray(data?.industries)
        ? data.industries.map((i: string) => String(i).trim()).filter(Boolean)
        : [];
      const selectedSize = data?.orgSize || currentSettings.orgSize || '0-10';
      updatedSettings.industries = selectedIndustries;
      updatedSettings.orgSize = selectedSize;
      if (selectedIndustries.length > 0) {
        workspaceDataToUpdate.businessType = selectedIndustries[0];
      }
      preStepper.welcomeDone = true;
      preStepper.industriesDone = true;
      updatedSettings.preStepper = preStepper;
    } else if (step === 'recommended_modules') {
      if (Array.isArray(data?.enabledModules)) {
        updatedSettings.enabledModules = Array.from(new Set(data.enabledModules.filter(Boolean)));
      }
      if (data?.moduleFeatureToggles && typeof data.moduleFeatureToggles === 'object') {
        updatedSettings.moduleFeatureToggles = data.moduleFeatureToggles;
      }
      if (Array.isArray(data?.starterRoles) && data.starterRoles.length > 0) {
        await this.upsertStaffRolesFromOnboarding(workspaceId, data.starterRoles, updatedSettings);
      } else if (data?.applyStarterRoles) {
        const rec = getRecommendedSetup(
          updatedSettings.industries || [],
          updatedSettings.orgSize || '0-10',
        );
        await this.upsertStaffRolesFromOnboarding(workspaceId, rec.starterRoleTemplates, updatedSettings);
      }
      preStepper.welcomeDone = true;
      preStepper.industriesDone = true;
      preStepper.modulesDone = true;
      updatedSettings.preStepper = preStepper;
    } else if (step === 'org_structure_choice') {
      const choice = data?.choice === 'skip_later' ? 'skip_later' : 'setup_now';
      preStepper.welcomeDone = true;
      preStepper.industriesDone = true;
      preStepper.modulesDone = true;
      preStepper.orgStructureChoice = choice;
      preStepper.skipped = choice === 'skip_later';
      updatedSettings.preStepper = preStepper;
    } else if (step === 'roles') {
      const rolesList = Array.isArray(data?.roles) ? data.roles : Array.isArray(data) ? data : [];
      await this.upsertStaffRolesFromOnboarding(workspaceId, rolesList, updatedSettings);
    } else if (step === 'profile') {
      if (data?.name) workspaceDataToUpdate.name = data.name.trim();
      if (data?.businessType) workspaceDataToUpdate.businessType = data.businessType;
      if (Array.isArray(data?.industries)) updatedSettings.industries = data.industries;
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
      const deptNameToId = new Map<string, string>();
      for (const d of depts) {
        if (d?.name) {
          const cleanDeptName = d.name.trim();
          const existing = await this.prisma.department.findFirst({
            where: { workspaceId, name: cleanDeptName },
          });
          if (!existing) {
            const createdDept = await this.prisma.department.create({
              data: {
                workspaceId,
                name: cleanDeptName,
                code: d.code ? d.code.trim().toUpperCase() : undefined,
              },
            });
            if (createdDept?.id) {
              deptNameToId.set(cleanDeptName.toLowerCase(), createdDept.id);
            }
          } else if (existing?.id) {
            deptNameToId.set(cleanDeptName.toLowerCase(), existing.id);
          }
        }
      }

      // Create Teams linked to departments when supplied
      const teamsInput = !Array.isArray(data) && Array.isArray(data?.teams) ? data.teams : [];
      const teamModel = (this.prisma as any).team;
      if (teamsInput.length > 0 && teamModel) {
        for (const t of teamsInput) {
          const teamName = (t?.name || '').trim();
          if (!teamName) continue;
          const resolvedDeptId =
            t.departmentId ||
            (t.departmentName ? deptNameToId.get(t.departmentName.trim().toLowerCase()) : undefined) ||
            null;
          const existingTeam = await teamModel
            .findFirst({
              where: {
                workspaceId,
                name: teamName,
                ...(resolvedDeptId ? { departmentId: resolvedDeptId } : {}),
              },
            })
            .catch(() => null);
          if (!existingTeam) {
            await teamModel
              .create({
                data: {
                  workspaceId,
                  name: teamName,
                  departmentId: resolvedDeptId,
                },
              })
              .catch(() => null);
          }
        }
      }

      // Create & configure Designations (with permissions & hierarchy role/scope) when supplied
      const desigsInput = !Array.isArray(data) && Array.isArray(data?.designations) ? data.designations : [];
      const desigModel = (this.prisma as any).designation;
      if (desigsInput.length > 0 && desigModel) {
        const nextDesigConfigs = { ...(updatedSettings.designationConfigs || {}) };
        const nextRoleDataScopes = { ...(updatedSettings.roleDataScopes || {}) };
        const roleModel = (this.prisma as any).role;
        const permModel = (this.prisma as any).permission;
        const rpModel = (this.prisma as any).rolePermission;

        for (const dg of desigsInput) {
          const title = (dg?.title || dg?.name || '').trim();
          if (!title) continue;
          const level = Number(dg.level) || 1;
          let existingDesig = await desigModel
            .findFirst({ where: { workspaceId, title } })
            .catch(() => null);
          if (!existingDesig) {
            existingDesig = await desigModel
              .create({
                data: {
                  workspaceId,
                  title,
                  level,
                  description: dg.description || null,
                },
              })
              .catch(() => null);
          }

          if (existingDesig?.id) {
            const permCodes: string[] = Array.isArray(dg.permissionCodes) ? dg.permissionCodes : [];
            let resolvedRoleId = dg.defaultRoleId || null;
            const resolvedDeptId =
              dg.departmentId ||
              (dg.departmentName ? deptNameToId.get(dg.departmentName.trim().toLowerCase()) : undefined) ||
              null;

            if (permCodes.length > 0 && roleModel && permModel && rpModel) {
              try {
                // Unified 1:1 role naming (no duplicate " Role" suffix)
                let customRole = await roleModel
                  .findFirst({
                    where: {
                      workspaceId,
                      OR: [
                        { name: { equals: title, mode: 'insensitive' } },
                        { name: { equals: `${title} Role`, mode: 'insensitive' } },
                      ],
                      isSystemRole: false,
                    },
                  })
                  .catch(() => null);
                if (!customRole) {
                  customRole = await roleModel
                    .create({
                      data: {
                        workspaceId,
                        name: title,
                        description: `Configured permission profile for ${title}`,
                        isSystemRole: false,
                      },
                    })
                    .catch(() => null);
                }
                if (customRole?.id) {
                  resolvedRoleId = customRole.id;
                  const matchingPerms = await permModel.findMany({ where: { code: { in: permCodes } } }).catch(() => []);
                  const permIds = (matchingPerms || []).map((p: any) => p.id).filter(Boolean);
                  await rpModel.deleteMany({ where: { roleId: customRole.id } }).catch(() => null);
                  if (permIds.length > 0) {
                    await rpModel
                      .createMany({
                        data: permIds.map((permissionId: string) => ({ roleId: customRole.id, permissionId })),
                        skipDuplicates: true,
                      })
                      .catch(() => null);
                  }
                  if (dg.defaultDataScope) {
                    nextRoleDataScopes[customRole.id] = dg.defaultDataScope;
                  }
                }
              } catch {
                // Keep onboarding resilient
              }
            }

            if (
              permCodes.length > 0 ||
              dg.defaultAccessRole ||
              dg.defaultDataScope ||
              resolvedDeptId ||
              resolvedRoleId
            ) {
              nextDesigConfigs[existingDesig.id] = {
                departmentId: resolvedDeptId,
                // LEGACY_ROLE_COMMENTED_OUT: internal DB carrier only; active access is driven by defaultRoleId + defaultDataScope
                defaultAccessRole: dg.defaultAccessRole || 'MEMBER',
                defaultDataScope: dg.defaultDataScope || (level >= 3 ? 'TEAM' : 'ASSIGNED'),
                defaultRoleId: resolvedRoleId,
                permissionCodes: permCodes,
                autoSyncRole: true,
              };
            }
          }
        }
        updatedSettings.designationConfigs = nextDesigConfigs;
        updatedSettings.roleDataScopes = nextRoleDataScopes;
      }
    }

    const trackableStep = !['welcome', 'industries_size', 'recommended_modules', 'org_structure_choice'].includes(step);
    if (markCompleted && trackableStep && !completedSteps.includes(step)) {
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

  async getShareInviteLink(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const settings: any = (workspace.settings as object) || {};
    let shareConfig = settings.shareInviteLink;
    const frontendUrl = process.env.FRONTEND_URL || 'https://orvexa-lemon.vercel.app';

    if (!shareConfig || !shareConfig.code) {
      shareConfig = {
        code: crypto.randomBytes(6).toString('hex'),
        enabled: true,
        defaultRoleId: null,
        defaultDepartmentId: null,
        defaultTeamId: null,
        defaultDesignationTitle: null,
        defaultDataScope: 'ASSIGNED',
        createdAt: new Date().toISOString(),
      };
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { settings: { ...settings, shareInviteLink: shareConfig } },
      });
    }

    return {
      ...shareConfig,
      joinUrl: `${frontendUrl}/join?code=${shareConfig.code}`,
      workspaceName: workspace.name,
    };
  }

  async updateShareInviteLink(
    workspaceId: string,
    dto: {
      enabled?: boolean;
      regenerate?: boolean;
      defaultRoleId?: string | null;
      defaultDepartmentId?: string | null;
      defaultTeamId?: string | null;
      defaultDesignationTitle?: string | null;
      defaultDataScope?: string;
    },
    actorContext?: any,
  ) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const isOwnerOrAdmin =
      !actorContext ||
      actorContext.accessRole === 'OWNER' ||
      actorContext.accessRole === 'ADMIN';

    // Security safeguard: public join links cannot grant OWNER or ADMIN system roles
    if (dto.defaultRoleId && (this.prisma as any).role?.findFirst) {
      const targetRole = await (this.prisma as any).role
        .findFirst({ where: { id: dto.defaultRoleId } })
        .catch?.(() => null);
      const upper = (targetRole?.name || '').toUpperCase();
      if (targetRole?.isSystemRole && (upper === 'OWNER' || upper === 'ADMIN')) {
        throw new ForbiddenException('Shareable join links cannot auto-assign Owner or Admin system roles.');
      }
    }

    if (!isOwnerOrAdmin) {
      if (dto.defaultDataScope && getScopeRank(dto.defaultDataScope) > getScopeRank(actorContext.dataScope)) {
        throw new ForbiddenException('Cannot configure a default invite link scope broader than your own.');
      }
      if (dto.defaultDepartmentId && actorContext.departmentId && dto.defaultDepartmentId !== actorContext.departmentId) {
        throw new ForbiddenException('You can only configure invite links within your own department.');
      }
      const allowedTeams = Array.from(
        new Set([...(actorContext.scopedTeamIds || []), ...(actorContext.ledTeamIds || []), ...(actorContext.teamId ? [actorContext.teamId] : [])]),
      );
      if (dto.defaultTeamId && allowedTeams.length > 0 && !allowedTeams.includes(dto.defaultTeamId)) {
        throw new ForbiddenException('You can only configure invite links for your own permitted team(s).');
      }
    }

    const current = await this.getShareInviteLink(workspaceId);
    const settings: any = (workspace.settings as object) || {};
    const nextConfig = {
      code: dto.regenerate ? crypto.randomBytes(6).toString('hex') : current.code,
      enabled: dto.enabled !== undefined ? Boolean(dto.enabled) : Boolean(current.enabled),
      defaultRoleId: dto.defaultRoleId !== undefined ? dto.defaultRoleId || null : current.defaultRoleId || null,
      defaultDepartmentId: dto.defaultDepartmentId !== undefined ? dto.defaultDepartmentId || null : current.defaultDepartmentId || null,
      defaultTeamId: dto.defaultTeamId !== undefined ? dto.defaultTeamId || null : current.defaultTeamId || null,
      defaultDesignationTitle: dto.defaultDesignationTitle !== undefined ? dto.defaultDesignationTitle?.trim() || null : current.defaultDesignationTitle || null,
      defaultDataScope: dto.defaultDataScope || current.defaultDataScope || 'ASSIGNED',
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, shareInviteLink: nextConfig } },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://orvexa-lemon.vercel.app';
    return {
      ...nextConfig,
      joinUrl: `${frontendUrl}/join?code=${nextConfig.code}`,
      workspaceName: workspace.name,
    };
  }
}
