'use client';

import React, { useEffect, useState } from 'react';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Plus,
  Play,
  CheckCircle2,
  Lock,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  User,
  Users,
  Settings,
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronRight,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<'periods' | 'reports' | 'config'>('periods');
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Form states
  const [periodForm, setPeriodForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    paymentDate: '',
  });

  const [configForm, setConfigForm] = useState({
    currency: 'USD',
    payFrequency: 'MONTHLY',
    workingDaysPerMonth: 22,
    enableUnpaidLeaveDeduction: true,
    enableOvertimePay: true,
    overtimeMultiplier: 1.5,
  });

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(wsId && wsId !== 'undefined' && wsId !== 'null' ? { 'x-workspace-id': wsId } : {}),
    };
  };

  const loadData = async () => {
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    if (!wsId) return;

    setLoading(true);
    try {
      const headers = getHeaders();
      const [periodsRes, configRes, reportsRes, peopleRes] = await Promise.all([
        fetch(`${BRANDING.apiUrl}/payroll/periods`, { headers }),
        fetch(`${BRANDING.apiUrl}/payroll/config`, { headers }),
        fetch(`${BRANDING.apiUrl}/payroll/reports`, { headers }),
        fetch(`${BRANDING.apiUrl}/people`, { headers }),
      ]);

      const periodsData = await periodsRes.json();
      const configData = await configRes.json();
      const reportsData = await reportsRes.json();
      const peopleData = await peopleRes.json();

      if (Array.isArray(periodsData)) {
        setPeriods(periodsData);
        if (periodsData.length > 0 && !selectedPeriod) {
          setSelectedPeriod(periodsData[0]);
        }
      }
      if (configData) {
        setConfig(configData);
        setConfigForm({
          currency: configData.currency || 'USD',
          payFrequency: configData.payFrequency || 'MONTHLY',
          workingDaysPerMonth: configData.workingDaysPerMonth || 22,
          enableUnpaidLeaveDeduction: !!configData.enableUnpaidLeaveDeduction,
          enableOvertimePay: !!configData.enableOvertimePay,
          overtimeMultiplier: configData.overtimeMultiplier || 1.5,
        });
      }
      if (reportsData) setReports(reportsData);
      if (Array.isArray(peopleData.data || peopleData)) setPeople(peopleData.data || peopleData);

      if (selectedPeriod) {
        const fresh = periodsData.find((p: any) => p.id === selectedPeriod.id);
        if (fresh) setSelectedPeriod(fresh);
      }
    } catch (err: any) {
      console.error('Failed to load payroll data:', err);
      toast.error('Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/payroll/periods`, {
        method: 'POST',
        headers,
        body: JSON.stringify(periodForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create period');

      toast.success(`Payroll period "${periodForm.name}" created`);
      setShowCreatePeriodModal(false);
      setPeriodForm({ name: '', startDate: '', endDate: '', paymentDate: '' });
      loadData();
      setSelectedPeriod(data);
    } catch (err: any) {
      toast.error(err.message || 'Error creating payroll period');
    }
  };

  const handleCalculatePeriod = async (periodId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/payroll/periods/${periodId}/calculate`, {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Calculation failed');

      toast.success('Payroll calculated! Unpaid leave & overtime records integrated.');
      loadData();
      setSelectedPeriod(data);
    } catch (err: any) {
      toast.error(err.message || 'Error calculating payroll');
    }
  };

  const handleApprovePeriod = async (periodId: string) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/payroll/periods/${periodId}/approve`, {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');

      toast.success('Payroll period approved and permanently locked');
      loadData();
      setSelectedPeriod(data);
    } catch (err: any) {
      toast.error(err.message || 'Error approving payroll');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = getHeaders();
      const res = await fetch(`${BRANDING.apiUrl}/payroll/config`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(configForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update config');

      toast.success('Payroll configuration updated');
      setConfig(data);
      setShowConfigModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Error updating configuration');
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'DRAFT':
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">DRAFT</Badge>;
      case 'CALCULATED':
        return <Badge className="bg-blue-600 text-white text-[10px]">CALCULATED</Badge>;
      case 'APPROVED':
        return <Badge className="bg-emerald-600 text-white text-[10px]">APPROVED & LOCKED</Badge>;
      case 'PAID':
        return <Badge className="bg-purple-600 text-white text-[10px]">DISBURSED / PAID</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Payroll, Compensation & Payslips
          </h1>
          <p className="text-sm text-muted-foreground">
            Configurable salary components, attendance integration, unpaid leave LOP calculations, and auditable payslips.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfigModal(true)}>
            <Settings className="mr-1.5 h-4 w-4" />
            Payroll Rules
          </Button>
          <Button size="sm" onClick={() => setShowCreatePeriodModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Payroll Period
          </Button>
        </div>
      </div>

      {/* Top Nav Tabs */}
      <div className="flex items-center gap-4 border-b border-border pb-2 text-sm">
        <button
          onClick={() => setActiveTab('periods')}
          className={`flex items-center gap-2 pb-1 font-medium transition-colors ${
            activeTab === 'periods'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Payroll Periods ({periods.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 pb-1 font-medium transition-colors ${
            activeTab === 'reports'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Historical Reports ({reports?.totalRecords || 0})
        </button>
      </div>

      {/* TAB 1: PERIODS & PROCESSING */}
      {activeTab === 'periods' && (
        <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Periods Column */}
          <div className="col-span-4 flex flex-col border-r border-border bg-muted/20">
            <div className="p-3 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configured Periods
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading periods...</div>
              ) : periods.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No payroll periods created yet. Click "New Payroll Period" above.
                </div>
              ) : (
                periods.map((p) => {
                  const isSelected = selectedPeriod?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPeriod(p);
                        setSelectedPayslip(null);
                      }}
                      className={`cursor-pointer rounded-lg p-3 border transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 shadow-xs'
                          : 'bg-background hover:bg-muted/40 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-foreground">{p.name}</h4>
                        {getStatusBadge(p.status)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.startDate} &rarr; {p.endDate}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[11px]">
                        <span className="text-muted-foreground">{p.payslips?.length || 0} Employees</span>
                        <span className="font-mono font-bold text-foreground">
                          {p.currency} {p.totalNet?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Period Details & Payslip Inspector */}
          <div className="col-span-8 flex flex-col h-full bg-background overflow-y-auto">
            {selectedPeriod ? (
              <div className="p-4 space-y-6">
                {/* Period Summary Header */}
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-bold text-foreground">{selectedPeriod.name}</h2>
                      {getStatusBadge(selectedPeriod.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Period: {selectedPeriod.startDate} to {selectedPeriod.endDate} • Payout: {selectedPeriod.paymentDate}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {selectedPeriod.status !== 'APPROVED' && selectedPeriod.status !== 'PAID' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCalculatePeriod(selectedPeriod.id)}
                          className="text-xs"
                        >
                          <Play className="mr-1 h-3.5 w-3.5 text-primary" />
                          {selectedPeriod.status === 'CALCULATED' ? 'Recalculate' : 'Run Calculation'}
                        </Button>
                        {selectedPeriod.status === 'CALCULATED' && (
                          <Button
                            size="sm"
                            onClick={() => handleApprovePeriod(selectedPeriod.id)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Approve & Lock
                          </Button>
                        )}
                      </>
                    )}
                    {selectedPeriod.status === 'APPROVED' && (
                      <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Locked & Approved
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <span className="text-[11px] text-muted-foreground block">Total Gross Salary</span>
                    <span className="text-lg font-bold font-mono text-foreground">
                      {selectedPeriod.currency} {selectedPeriod.totalGross?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <span className="text-[11px] text-muted-foreground block">Total Deductions & LOP</span>
                    <span className="text-lg font-bold font-mono text-destructive">
                      - {selectedPeriod.currency} {selectedPeriod.totalDeductions?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 bg-primary/5">
                    <span className="text-[11px] text-muted-foreground block">Total Net Payout</span>
                    <span className="text-lg font-bold font-mono text-primary">
                      {selectedPeriod.currency} {selectedPeriod.totalNet?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>

                {/* Selected Payslip Drawer if open */}
                {selectedPayslip && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">
                          Payslip: {selectedPayslip.employeeName} ({selectedPayslip.employeeId})
                        </h3>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPayslip(null)} className="h-7 text-xs">
                        Close Payslip
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {/* Earnings */}
                      <div className="space-y-2 border-r border-border pr-3">
                        <h4 className="font-semibold text-emerald-600 uppercase text-[10px] tracking-wider">
                          Earnings & Additions
                        </h4>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Salary:</span>
                          <span className="font-mono font-medium">${selectedPayslip.baseSalary}</span>
                        </div>
                        {selectedPayslip.allowances?.map((a: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-muted-foreground">{a.name}:</span>
                            <span className="font-mono">${a.amount}</span>
                          </div>
                        ))}
                        {selectedPayslip.overtimePay > 0 && (
                          <div className="flex justify-between text-primary">
                            <span>Overtime Pay ({selectedPayslip.overtimeHours} hrs):</span>
                            <span className="font-mono font-medium">+${selectedPayslip.overtimePay}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t font-semibold">
                          <span>Gross Salary:</span>
                          <span className="font-mono">${selectedPayslip.grossSalary}</span>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-destructive uppercase text-[10px] tracking-wider">
                          Deductions & Loss of Pay
                        </h4>
                        {selectedPayslip.deductions?.map((d: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-muted-foreground">{d.name}:</span>
                            <span className="font-mono">-${d.amount}</span>
                          </div>
                        ))}
                        {selectedPayslip.unpaidLeaveDays > 0 && (
                          <div className="flex justify-between text-destructive">
                            <span>Unpaid Leave ({selectedPayslip.unpaidLeaveDays} days LOP):</span>
                            <span className="font-mono font-medium">-${selectedPayslip.unpaidLeaveDeduction}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t font-semibold">
                          <span>Total Deductions:</span>
                          <span className="font-mono text-destructive">-${selectedPayslip.totalDeductions}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t-2 border-primary/20 text-sm font-bold text-primary">
                          <span>Net Disbursed Pay:</span>
                          <span className="font-mono">${selectedPayslip.netSalary}</span>
                        </div>
                      </div>
                    </div>

                    {/* Calculation Audit Breakdown Card */}
                    <div className="rounded-lg border border-border bg-card p-3 text-[11px] space-y-1">
                      <div className="font-semibold text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Reproducible Calculation Formula Audit
                      </div>
                      <p className="text-muted-foreground font-mono">
                        Daily Rate: ${selectedPayslip.calculationBreakdown?.dailyRate} / day • Hourly Rate: ${selectedPayslip.calculationBreakdown?.hourlyRate} / hr
                      </p>
                      <p className="text-muted-foreground font-mono">
                        LOP Formula: {selectedPayslip.calculationBreakdown?.unpaidLeaveFormula}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payslips Table */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Employee Payslips ({selectedPeriod.payslips?.length || 0})
                  </h3>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 uppercase text-muted-foreground text-[10px]">
                          <th className="py-2.5 px-3">Employee</th>
                          <th className="py-2.5 px-3">Designation</th>
                          <th className="py-2.5 px-3 text-right">Base</th>
                          <th className="py-2.5 px-3 text-right">Gross</th>
                          <th className="py-2.5 px-3 text-right">Deductions</th>
                          <th className="py-2.5 px-3 text-right">Net Salary</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(!selectedPeriod.payslips || selectedPeriod.payslips.length === 0) ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-muted-foreground">
                              No payslips calculated yet. Click "Run Calculation" above.
                            </td>
                          </tr>
                        ) : (
                          selectedPeriod.payslips.map((ps: any) => (
                            <tr key={ps.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-foreground">{ps.employeeName}</div>
                                <div className="text-[10px] text-muted-foreground">{ps.employeeEmail}</div>
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground">{ps.designationTitle}</td>
                              <td className="py-2.5 px-3 text-right font-mono">${ps.baseSalary}</td>
                              <td className="py-2.5 px-3 text-right font-mono">${ps.grossSalary}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-destructive">-${ps.totalDeductions}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">${ps.netSalary}</td>
                              <td className="py-2.5 px-3 text-center">
                                {ps.locked ? (
                                  <Badge className="bg-emerald-600 text-[9px] py-0">LOCKED</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] py-0">DRAFT</Badge>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedPayslip(ps)}
                                  className="h-6 text-xs px-2 text-primary"
                                >
                                  <Eye className="mr-1 h-3 w-3" />
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mb-3 opacity-30" />
                <h3 className="text-base font-semibold text-foreground">Select a payroll period</h3>
                <p className="text-xs max-w-sm mt-1">
                  Choose a payroll period on the left or create a new one to process compensation and view payslips.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORICAL REPORTS */}
      {activeTab === 'reports' && (
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Historical Compensation & Disbursement Reports</CardTitle>
              <CardDescription className="text-xs">
                Audited payroll history across periods, departments, and employees.
              </CardDescription>
            </div>
            <div className="text-xs font-mono font-bold text-foreground">
              Total Disbursed: {reports?.currency} {reports?.totalDisbursedNet?.toLocaleString() || '0'}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 uppercase text-muted-foreground text-[10px]">
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4 text-right">Base Salary</th>
                  <th className="py-2.5 px-4 text-right">Gross</th>
                  <th className="py-2.5 px-4 text-right">Deductions</th>
                  <th className="py-2.5 px-4 text-right">Net Disbursed</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!reports?.entries || reports.entries.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No historical payroll records available.
                    </td>
                  </tr>
                ) : (
                  reports.entries.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">{r.periodName}</td>
                      <td className="py-2.5 px-4">{r.employeeName}</td>
                      <td className="py-2.5 px-4 text-right font-mono">${r.baseSalary}</td>
                      <td className="py-2.5 px-4 text-right font-mono">${r.grossSalary}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-destructive">-${r.deductions}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-primary">${r.netSalary}</td>
                      <td className="py-2.5 px-4 text-center">{getStatusBadge(r.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* MODAL: CREATE PERIOD */}
      {showCreatePeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Create Payroll Period
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Set the payroll cycle dates for compensation calculation.
            </p>

            <form onSubmit={handleCreatePeriod} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Period Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026 Monthly Payroll"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Start Date</label>
                  <input
                    type="date"
                    required
                    value={periodForm.startDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">End Date</label>
                  <input
                    type="date"
                    required
                    value={periodForm.endDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Payout Date</label>
                <input
                  type="date"
                  value={periodForm.paymentDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, paymentDate: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreatePeriodModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Create Period
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE PAYROLL RULES */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Configure Organization Payroll Rules
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Jurisdiction-neutral settings. Configure working days, attendance/leave deductions, and overtime rules.
            </p>

            <form onSubmit={handleSaveConfig} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Currency</label>
                  <input
                    type="text"
                    required
                    value={configForm.currency}
                    onChange={(e) => setConfigForm({ ...configForm, currency: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Working Days Per Month</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={configForm.workingDaysPerMonth}
                    onChange={(e) => setConfigForm({ ...configForm, workingDaysPerMonth: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Pay Frequency</label>
                  <select
                    value={configForm.payFrequency}
                    onChange={(e) => setConfigForm({ ...configForm, payFrequency: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="BI_WEEKLY">Bi-Weekly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Overtime Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={configForm.overtimeMultiplier}
                    onChange={(e) => setConfigForm({ ...configForm, overtimeMultiplier: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.enableUnpaidLeaveDeduction}
                    onChange={(e) => setConfigForm({ ...configForm, enableUnpaidLeaveDeduction: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  <span>Enable Unpaid Leave (Loss of Pay / LOP) pro-rata daily deductions</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.enableOvertimePay}
                    onChange={(e) => setConfigForm({ ...configForm, enableOvertimePay: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  <span>Enable Overtime Pay calculations from approved overtime records</span>
                </label>
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Legal Notice:</strong> Calculations are strictly reproducible and rule-based. Tax and statutory deductions must be configured per applicable jurisdiction.
                </span>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Rules
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
