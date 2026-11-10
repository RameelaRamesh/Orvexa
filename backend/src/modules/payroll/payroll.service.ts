import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PayrollConfig {
  currency: string;
  payFrequency: 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY';
  workingDaysPerMonth: number;
  workingDaysInMonth?: number;
  enableUnpaidLeaveDeduction: boolean;
  deductUnpaidLeave?: boolean;
  enableOvertimePay: boolean;
  calculateOvertime?: boolean;
  overtimeMultiplier: number;
  standardAllowances: Array<{ name: string; amount: number }>;
  standardDeductions: Array<{ name: string; amount: number }>;
}

export interface MemberSalaryStructure {
  membershipId: string;
  baseSalary: number;
  currency: string;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  paymentMethod?: string;
  bankAccountMasked?: string;
  taxIdentifier?: string;
}

export interface Payslip {
  id: string;
  periodId: string;
  membershipId: string;
  employeeName: string;
  employeeEmail: string;
  employeeId?: string;
  designationTitle?: string;
  departmentName?: string;
  currency: string;
  baseSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  totalAllowances: number;
  overtimeHours: number;
  overtimePay: number;
  grossSalary: number;
  grossPay?: number;
  deductions: Array<{ name: string; amount: number }>;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  netPay?: number;
  calculationBreakdown: {
    workingDaysInPeriod: number;
    dailyRate: number;
    hourlyRate: number;
    unpaidLeaveFormula: string;
    overtimeFormula: string;
    calculatedAt: Date;
  };
  locked: boolean;
  createdAt: Date;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  paymentDate: string; // YYYY-MM-DD
  status: 'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'APPROVED' | 'PAID';
  currency: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  payslips: Payslip[];
  approvedByMembershipId?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // CONFIGURATION & JURISDICTION-AGNOSTIC RULES (REQUIREMENTS 5, 11)
  // ---------------------------------------------------------------------------

  async getConfig(workspaceId: string): Promise<PayrollConfig> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const config: PayrollConfig = settings.payrollConfig || {
      currency: 'USD',
      payFrequency: 'MONTHLY',
      workingDaysPerMonth: 22,
      enableUnpaidLeaveDeduction: true,
      enableOvertimePay: true,
      overtimeMultiplier: 1.5,
      standardAllowances: [
        { name: 'Housing & Remote Work Stipend', amount: 500 },
        { name: 'Utility & Internet Allowance', amount: 150 },
      ],
      standardDeductions: [
        { name: 'Voluntary Healthcare Contribution', amount: 200 },
      ],
    };
    return config;
  }

  async updateConfig(workspaceId: string, data: Partial<PayrollConfig>): Promise<PayrollConfig> {
    const current = await this.getConfig(workspaceId);
    const updated: PayrollConfig = {
      ...current,
      ...data,
      enableUnpaidLeaveDeduction: data.deductUnpaidLeave ?? data.enableUnpaidLeaveDeduction ?? current.enableUnpaidLeaveDeduction,
      enableOvertimePay: data.calculateOvertime ?? data.enableOvertimePay ?? current.enableOvertimePay,
      workingDaysPerMonth: (data.workingDaysInMonth ?? data.workingDaysPerMonth) ? Number(data.workingDaysInMonth ?? data.workingDaysPerMonth) : current.workingDaysPerMonth,
      overtimeMultiplier: data.overtimeMultiplier ? Number(data.overtimeMultiplier) : current.overtimeMultiplier,
    };

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, payrollConfig: updated } },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // MEMBER SALARY STRUCTURE
  // ---------------------------------------------------------------------------

  async getMemberSalary(workspaceId: string, membershipId: string): Promise<MemberSalaryStructure> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const structures: Record<string, any> = settings.memberSalaryStructures || {};
    const config = await this.getConfig(workspaceId);

    const member = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: { designation: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    const level = member.designation?.level || 1;
    const existing = structures[membershipId];

    if (existing) {
      return {
        membershipId,
        baseSalary: Number(existing.baseSalary),
        currency: existing.currency || config.currency,
        allowances: existing.allowances || config.standardAllowances,
        deductions: existing.deductions || config.standardDeductions,
        paymentMethod: existing.paymentMethod || 'Direct Deposit / Bank Transfer',
        bankAccountMasked: existing.bankAccount ? `****${existing.bankAccount.slice(-4)}` : '****7890',
        taxIdentifier: existing.taxIdentifier || 'TAX-***-99',
      };
    }

    // Default structure proportional to seniority level
    return {
      membershipId,
      baseSalary: 4500 + level * 1000,
      currency: config.currency,
      allowances: config.standardAllowances,
      deductions: config.standardDeductions,
      paymentMethod: 'Direct Deposit / Bank Transfer',
      bankAccountMasked: '****7890',
      taxIdentifier: 'TAX-***-99',
    };
  }

  async updateMemberSalary(
    workspaceId: string,
    membershipId: string,
    data: {
      baseSalary: number;
      currency?: string;
      allowances?: Array<{ name: string; amount: number }>;
      deductions?: Array<{ name: string; amount: number }>;
      customDeductions?: Array<{ name: string; amount: number }>;
      paymentMethod?: string;
      bankAccount?: string;
      taxIdentifier?: string;
    },
  ): Promise<MemberSalaryStructure> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const structures: Record<string, any> = settings.memberSalaryStructures || {};

    structures[membershipId] = {
      baseSalary: Number(data.baseSalary),
      currency: data.currency || 'USD',
      allowances: data.allowances || [],
      deductions: data.deductions || data.customDeductions || [],
      paymentMethod: data.paymentMethod,
      bankAccount: data.bankAccount,
      taxIdentifier: data.taxIdentifier,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, memberSalaryStructures: structures } },
    });

    return this.getMemberSalary(workspaceId, membershipId);
  }

  async setMemberSalary(
    workspaceId: string,
    membershipId: string,
    data: any,
  ): Promise<MemberSalaryStructure> {
    return this.updateMemberSalary(workspaceId, membershipId, data);
  }

  async calculatePeriod(workspaceId: string, periodId: string): Promise<PayrollPeriod> {
    return this.calculatePeriodPayroll(workspaceId, periodId);
  }

  // ---------------------------------------------------------------------------
  // PAYROLL PERIODS & REPRODUCIBLE CALCULATION (REQUIREMENTS 5, 6, 7, 10)
  // ---------------------------------------------------------------------------

  async listPeriods(workspaceId: string): Promise<PayrollPeriod[]> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    return settings.payrollPeriods || [];
  }

  async getPeriodById(workspaceId: string, periodId: string): Promise<PayrollPeriod> {
    const periods = await this.listPeriods(workspaceId);
    const period = periods.find((p) => p.id === periodId);
    if (!period) throw new NotFoundException('Payroll period not found');
    return period;
  }

  async createPeriod(
    workspaceId: string,
    data: { name: string; startDate: string; endDate: string; paymentDate?: string },
  ): Promise<PayrollPeriod> {
    if (!data.name?.trim() || !data.startDate || !data.endDate) {
      throw new BadRequestException('Period name, start date, and end date are required');
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start > end) throw new BadRequestException('Start date cannot be after end date');

    const config = await this.getConfig(workspaceId);
    const periods = await this.listPeriods(workspaceId);

    const newPeriod: PayrollPeriod = {
      id: `pyr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: data.name.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      paymentDate: data.paymentDate || data.endDate,
      status: 'DRAFT',
      currency: config.currency,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      payslips: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, payrollPeriods: [newPeriod, ...periods] } },
    });

    return newPeriod;
  }

  /**
   * Deterministic, reproducible payroll calculation integrating attendance & approved unpaid leave.
   */
  async calculatePeriodPayroll(workspaceId: string, periodId: string): Promise<PayrollPeriod> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const periods: PayrollPeriod[] = settings.payrollPeriods || [];
    const pIndex = periods.findIndex((p) => p.id === periodId);
    if (pIndex === -1) throw new NotFoundException('Payroll period not found');

    const period = periods[pIndex];
    if (period.status === 'APPROVED' || period.status === 'PAID') {
      throw new BadRequestException(`Cannot recalculate an ${period.status} payroll period. Calculations are locked.`);
    }

    const config = await this.getConfig(workspaceId);
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Fetch active workspace members
    const members = await this.prisma.membership.findMany({
      where: { workspaceId, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      include: { user: true, designation: true, department: true },
    });

    // Query approved leave requests in period for LOP calculations
    const approvedLeaves = await this.prisma.leaveRequest.findMany({
      where: {
        workspaceId,
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    // Query approved overtime requests in period
    const approvedOvertime = await this.prisma.overtimeRequest.findMany({
      where: {
        workspaceId,
        status: 'APPROVED',
        date: { gte: startDate, lte: endDate },
      },
    });

    const payslips: Payslip[] = [];
    let periodTotalGross = 0;
    let periodTotalDeductions = 0;
    let periodTotalNet = 0;

    for (const m of members) {
      const salaryStruct = await this.getMemberSalary(workspaceId, m.id);
      const baseSalary = salaryStruct.baseSalary;
      const workingDays = config.workingDaysPerMonth || 22;

      // Deterministic rate calculations
      const dailyRate = Math.round((baseSalary / workingDays) * 100) / 100;
      const hourlyRate = Math.round((dailyRate / 8) * 100) / 100;

      // 1. Calculate Unpaid Leave Days (Loss of Pay)
      const memberUnpaidLeaves = approvedLeaves.filter(
        (l) => l.membershipId === m.id && l.leaveType === 'UNPAID',
      );
      const unpaidLeaveDays = memberUnpaidLeaves.reduce((sum, l) => sum + (l.totalDays || 0), 0);
      const unpaidLeaveDeduction = config.enableUnpaidLeaveDeduction
        ? Math.round(unpaidLeaveDays * dailyRate * 100) / 100
        : 0;

      // 2. Calculate Approved Overtime Pay
      const memberOvertime = approvedOvertime.filter((o) => o.membershipId === m.id);
      const overtimeHours = memberOvertime.reduce((sum, o) => sum + (o.hours || 0), 0);
      const overtimePay = config.enableOvertimePay
        ? Math.round(overtimeHours * hourlyRate * config.overtimeMultiplier * 100) / 100
        : 0;

      // 3. Allowances
      const totalAllowances = salaryStruct.allowances.reduce((sum, a) => sum + Number(a.amount || 0), 0);

      // 4. Standard Deductions
      const standardDeductionsTotal = salaryStruct.deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const totalDeductions = standardDeductionsTotal + unpaidLeaveDeduction;

      // 5. Gross and Net
      const grossSalary = baseSalary + totalAllowances + overtimePay;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      periodTotalGross += grossSalary;
      periodTotalDeductions += totalDeductions;
      periodTotalNet += netSalary;

      payslips.push({
        id: `ps_${Date.now()}_${m.id.slice(-6)}`,
        periodId: period.id,
        membershipId: m.id,
        employeeName: `${m.user.firstName} ${m.user.lastName}`,
        employeeEmail: m.user.email,
        employeeId: m.employeeId || `EMP-${m.id.slice(0, 5)}`,
        designationTitle: m.designation?.title || 'Member',
        departmentName: m.department?.name || 'General',
        currency: salaryStruct.currency || config.currency,
        baseSalary,
        allowances: salaryStruct.allowances,
        totalAllowances,
        overtimeHours,
        overtimePay,
        grossSalary,
        grossPay: grossSalary,
        deductions: salaryStruct.deductions,
        unpaidLeaveDays,
        unpaidLeaveDeduction,
        totalDeductions,
        netSalary,
        netPay: netSalary,
        calculationBreakdown: {
          workingDaysInPeriod: workingDays,
          dailyRate,
          hourlyRate,
          unpaidLeaveFormula: `${unpaidLeaveDays} unpaid days × $${dailyRate}/day = $${unpaidLeaveDeduction}`,
          overtimeFormula: `${overtimeHours} hrs × $${hourlyRate}/hr × ${config.overtimeMultiplier} multiplier = $${overtimePay}`,
          calculatedAt: new Date(),
        },
        locked: false,
        createdAt: new Date(),
      });
    }

    periods[pIndex] = {
      ...period,
      status: 'CALCULATED',
      totalGross: Math.round(periodTotalGross * 100) / 100,
      totalDeductions: Math.round(periodTotalDeductions * 100) / 100,
      totalNet: Math.round(periodTotalNet * 100) / 100,
      payslips,
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, payrollPeriods: periods } },
    });

    return periods[pIndex];
  }

  async approvePeriod(
    workspaceId: string,
    periodId: string,
    approverMembershipId: string,
  ): Promise<PayrollPeriod> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const periods: PayrollPeriod[] = settings.payrollPeriods || [];
    const pIndex = periods.findIndex((p) => p.id === periodId);
    if (pIndex === -1) throw new NotFoundException('Payroll period not found');

    const period = periods[pIndex];
    if (period.status === 'DRAFT') {
      throw new BadRequestException('Please calculate payroll before approval');
    }

    // Permanently lock all payslips
    const lockedPayslips = period.payslips.map((ps) => ({ ...ps, locked: true }));

    periods[pIndex] = {
      ...period,
      status: 'APPROVED',
      payslips: lockedPayslips,
      approvedByMembershipId: approverMembershipId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, payrollPeriods: periods } },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorMembershipId: approverMembershipId,
        action: 'PAYROLL_APPROVED',
        entity: 'PayrollPeriod',
        entityId: periodId,
        metadata: {
          periodName: period.name,
          totalNet: period.totalNet,
          payslipsCount: lockedPayslips.length,
        },
      },
    }).catch(() => null);

    return periods[pIndex];
  }

  // ---------------------------------------------------------------------------
  // SECURE PAYSLIP RETRIEVAL & HISTORICAL REPORTS (REQUIREMENTS 8, 9, 10)
  // ---------------------------------------------------------------------------

  async getPayslip(
    workspaceId: string,
    periodId: string,
    payslipId: string,
    userContext?: { membershipId?: string; accessRole?: string },
  ): Promise<Payslip> {
    const period = await this.getPeriodById(workspaceId, periodId);
    const payslip = period.payslips.find((p) => p.id === payslipId);
    if (!payslip) throw new NotFoundException('Payslip not found');

    // Strict record permission check
    if (
      userContext &&
      userContext.accessRole !== 'OWNER' &&
      userContext.accessRole !== 'ADMIN' &&
      userContext.accessRole !== 'HR'
    ) {
      if (userContext.membershipId !== payslip.membershipId) {
        throw new ForbiddenException('Access denied: You can only view your own payslip');
      }
    }

    return payslip;
  }

  async getHistoricalReports(
    workspaceId: string,
    query?: { membershipId?: string; startDate?: string; endDate?: string },
    userContext?: { membershipId?: string; accessRole?: string },
  ) {
    const periods = await this.listPeriods(workspaceId);

    // Only include calculated or approved periods
    let eligiblePeriods = periods.filter((p) => p.status === 'CALCULATED' || p.status === 'APPROVED' || p.status === 'PAID');

    if (query?.startDate) {
      eligiblePeriods = eligiblePeriods.filter((p) => p.startDate >= query.startDate!);
    }
    if (query?.endDate) {
      eligiblePeriods = eligiblePeriods.filter((p) => p.endDate <= query.endDate!);
    }

    // Role-based filtering
    const isRestricted =
      userContext &&
      userContext.accessRole !== 'OWNER' &&
      userContext.accessRole !== 'ADMIN' &&
      userContext.accessRole !== 'HR';

    const targetMembershipId = isRestricted ? userContext?.membershipId : query?.membershipId;

    const reportEntries: Array<{
      periodName: string;
      startDate: string;
      endDate: string;
      status: string;
      currency: string;
      membershipId: string;
      employeeName: string;
      baseSalary: number;
      grossSalary: number;
      deductions: number;
      netSalary: number;
      unpaidLeaveDays: number;
      overtimeHours: number;
    }> = [];

    for (const p of eligiblePeriods) {
      for (const ps of p.payslips) {
        if (!targetMembershipId || ps.membershipId === targetMembershipId) {
          reportEntries.push({
            periodName: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
            status: p.status,
            currency: ps.currency,
            membershipId: ps.membershipId,
            employeeName: ps.employeeName,
            baseSalary: ps.baseSalary,
            grossSalary: ps.grossSalary,
            deductions: ps.totalDeductions,
            netSalary: ps.netSalary,
            unpaidLeaveDays: ps.unpaidLeaveDays,
            overtimeHours: ps.overtimeHours,
          });
        }
      }
    }

    return {
      totalRecords: reportEntries.length,
      currency: eligiblePeriods[0]?.currency || 'USD',
      totalDisbursedNet: Math.round(reportEntries.reduce((s, r) => s + r.netSalary, 0) * 100) / 100,
      entries: reportEntries,
    };
  }
}
