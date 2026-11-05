'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

export default function OnboardingJourneyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<string>('profile');

  // Step 1: Profile
  const [orgName, setOrgName] = useState('');
  const [businessType, setBusinessType] = useState('GENERAL');
  const [country, setCountry] = useState('United States');
  const [timezone, setTimezone] = useState('UTC-05:00 (Eastern Time)');
  const [orgSize, setOrgSize] = useState('10-50');

  // Step 2: Schedule
  const [workingDays, setWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);

  // Step 3: Holidays
  const [holidays, setHolidays] = useState<Array<{ name: string; date: string; type: string }>>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Step 4: Locations
  const [locations, setLocations] = useState<Array<{ name: string; city: string; country: string; isPrimary: boolean }>>([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [newLocCountry, setNewLocCountry] = useState('United States');

  // Step 5: Departments
  const [departments, setDepartments] = useState<Array<{ name: string; code: string }>>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  // Step 6: Team Invites
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [sentInvites, setSentInvites] = useState<string[]>([]);
  const [sendingInvite, setSendingInvite] = useState(false);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(wsId && wsId !== 'undefined' ? { 'x-workspace-id': wsId } : {}),
    };
  };

  const loadStatus = async () => {
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/status`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load status');

      const payload = data.data !== undefined ? data.data : data;
      setStatus(payload);

      // Hydrate forms with saved data
      const setup = payload.setupData || {};
      if (setup.profile) {
        setOrgName(setup.profile.name || '');
        setBusinessType(setup.profile.businessType || 'GENERAL');
        setCountry(setup.profile.country || 'United States');
        setTimezone(setup.profile.timezone || 'UTC-05:00 (Eastern Time)');
        setOrgSize(setup.profile.orgSize || '10-50');
      }

      if (setup.schedule) {
        setWorkingDays(setup.schedule.workingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
        setStartTime(setup.schedule.startTime || '09:00');
        setEndTime(setup.schedule.endTime || '17:00');
        setWorkHoursPerDay(setup.schedule.workHoursPerDay || 8);
      }

      if (Array.isArray(setup.holidays)) setHolidays(setup.holidays);
      if (Array.isArray(setup.locations)) setLocations(setup.locations);
      if (Array.isArray(setup.departments)) setDepartments(setup.departments);

      if (payload.currentStep && payload.currentStep !== 'completed') {
        setActiveStep(payload.currentStep);
      }
    } catch (err: any) {
      toast.error('Unable to load onboarding status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const saveStepData = async (step: string, data: any, markCompleted: boolean = true) => {
    setSaving(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/step`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ step, data, markCompleted }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Failed to save setup step');

      const updatedStatus = resData.data !== undefined ? resData.data : resData;
      setStatus(updatedStatus);
      return updatedStatus;
    } catch (err: any) {
      toast.error(err.message || 'Error saving step');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const stepsList = [
    { id: 'profile', name: 'Organisation Profile', icon: Building2, mandatory: true },
    { id: 'schedule', name: 'Working Schedule', icon: Clock, mandatory: true },
    { id: 'holidays', name: 'Company Holidays', icon: Calendar, mandatory: false },
    { id: 'locations', name: 'Operating Locations', icon: MapPin, mandatory: false },
    { id: 'departments', name: 'Department Units', icon: Building2, mandatory: false },
    { id: 'team_invite', name: 'Team Invitations', icon: Users, mandatory: false },
  ];

  const handleNext = async () => {
    try {
      if (activeStep === 'profile') {
        if (!orgName.trim()) {
          toast.error('Organisation name is required.');
          return;
        }
        await saveStepData('profile', { name: orgName, businessType, country, timezone, orgSize });
        setActiveStep('schedule');
      } else if (activeStep === 'schedule') {
        if (workingDays.length === 0) {
          toast.error('Select at least one working day.');
          return;
        }
        await saveStepData('schedule', { workingDays, startTime, endTime, workHoursPerDay });
        setActiveStep('holidays');
      } else if (activeStep === 'holidays') {
        await saveStepData('holidays', { holidays });
        setActiveStep('locations');
      } else if (activeStep === 'locations') {
        await saveStepData('locations', { locations });
        setActiveStep('departments');
      } else if (activeStep === 'departments') {
        await saveStepData('departments', { departments });
        setActiveStep('team_invite');
      } else if (activeStep === 'team_invite') {
        toast.success('Onboarding complete!');
        router.push('/app/home');
      }
    } catch {
      // toast shown in saveStepData
    }
  };

  const handleSkip = () => {
    const currentIdx = stepsList.findIndex((s) => s.id === activeStep);
    if (currentIdx < stepsList.length - 1) {
      setActiveStep(stepsList[currentIdx + 1].id);
    } else {
      router.push('/app/home');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/invite`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          email: inviteEmail.trim(),
          firstName: inviteFirstName.trim() || 'Team',
          lastName: inviteLastName.trim() || 'Member',
          accessRole: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invitation failed');

      toast.success('Invitation sent to ' + inviteEmail);
      setSentInvites([...sentInvites, inviteEmail]);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStepObj = stepsList.find((s) => s.id === activeStep);
  const isMandatory = currentStepObj?.mandatory;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Onboarding Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-primary font-semibold">
                Setup Journey
              </span>
              <Badge variant="outline" className="text-[10px]">
                {status?.isCompleted ? 'Mandatory Setup Completed' : 'Setup In Progress'}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1">
              Configure Your Organization
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up core schedules, locations, and teams. Optional steps can be configured or updated anytime.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/app/home')}
              className="text-xs"
            >
              Exit to Dashboard
            </Button>
            {status?.isCompleted && (
              <Button
                size="sm"
                onClick={() => router.push('/app/home')}
                className="text-xs gap-1.5"
              >
                Finish Setup <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Overall Setup Progress</span>
            <span className="font-semibold text-foreground">{status?.progressPercentage || 0}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${status?.progressPercentage || 0}%` }}
            />
          </div>
        </div>

        {/* Steps Navigation Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {stepsList.map((s, idx) => {
            const isCompleted = status?.completedSteps?.includes(s.id);
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs transition-all text-center ${
                  isActive
                    ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                    : isCompleted
                    ? 'border-border bg-card text-foreground font-medium hover:border-muted-foreground'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-current text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <span className="truncate w-full">{s.name}</span>
                <span className="text-[9px] mt-0.5 text-muted-foreground">
                  {s.mandatory ? '(Mandatory)' : '(Optional)'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Step Form Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{currentStepObj?.name}</span>
                  {isMandatory ? (
                    <Badge variant="default" className="text-[10px] uppercase font-mono">Mandatory</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">Optional</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {activeStep === 'profile' && 'Organization legal name, default country, and operating timezone.'}
                  {activeStep === 'schedule' && 'Working days, business hours, and standard shift times.'}
                  {activeStep === 'holidays' && 'Annual company holidays and statutory non-working days.'}
                  {activeStep === 'locations' && 'Primary office headquarters, operational hubs, and branch offices.'}
                  {activeStep === 'departments' && 'Core business divisions and functional operational units.'}
                  {activeStep === 'team_invite' && 'Invite colleagues and team leaders into your workspace.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {/* STEP 1: Profile */}
            {activeStep === 'profile' && (
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Operations Ltd"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Country *</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="India">India</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="Singapore">Singapore</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Operating Timezone *</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="UTC-05:00 (Eastern Time)">UTC-05:00 (Eastern Time)</option>
                      <option value="UTC-08:00 (Pacific Time)">UTC-08:00 (Pacific Time)</option>
                      <option value="UTC+00:00 (London)">UTC+00:00 (London)</option>
                      <option value="UTC+01:00 (Central European Time)">UTC+01:00 (Central European Time)</option>
                      <option value="UTC+05:30 (India Standard Time)">UTC+05:30 (India Standard Time)</option>
                      <option value="UTC+08:00 (Singapore / HK)">UTC+08:00 (Singapore / HK)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Organization Size</label>
                  <select
                    value={orgSize}
                    onChange={(e) => setOrgSize(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="1-10">1-10 employees</option>
                    <option value="10-50">10-50 employees</option>
                    <option value="50-250">50-250 employees</option>
                    <option value="250+">250+ employees</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: Schedule */}
            {activeStep === 'schedule' && (
              <div className="space-y-5 max-w-xl">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Standard Working Days *</label>
                  <div className="flex flex-wrap gap-2">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                      const isSelected = workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setWorkingDays(workingDays.filter((d) => d !== day));
                            } else {
                              setWorkingDays([...workingDays, day]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-input hover:border-foreground'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Hours / Day</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={workHoursPerDay}
                      onChange={(e) => setWorkHoursPerDay(Number(e.target.value))}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Holidays */}
            {activeStep === 'holidays' && (
              <div className="space-y-4 max-w-xl">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Holiday Name (e.g. New Year)"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      if (!newHolidayName.trim() || !newHolidayDate) return;
                      setHolidays([...holidays, { name: newHolidayName.trim(), date: newHolidayDate, type: 'PUBLIC' }]);
                      setNewHolidayName('');
                      setNewHolidayDate('');
                    }}
                  >
                    Add
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                  {holidays.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No company holidays added yet. You can add them now or skip.</p>
                  ) : (
                    holidays.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs">
                        <div>
                          <span className="font-semibold text-foreground">{h.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">({h.date})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHolidays(holidays.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Locations */}
            {activeStep === 'locations' && (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Location Name (e.g. HQ)"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="City (e.g. New York)"
                    value={newLocCity}
                    onChange={(e) => setNewLocCity(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Country"
                      value={newLocCountry}
                      onChange={(e) => setNewLocCountry(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        if (!newLocName.trim() || !newLocCity.trim()) return;
                        setLocations([
                          ...locations,
                          {
                            name: newLocName.trim(),
                            city: newLocCity.trim(),
                            country: newLocCountry.trim(),
                            isPrimary: locations.length === 0,
                          },
                        ]);
                        setNewLocName('');
                        setNewLocCity('');
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                  {locations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No operating locations configured. Add your office hubs or skip.</p>
                  ) : (
                    locations.map((loc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs">
                        <div>
                          <span className="font-semibold text-foreground">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">({loc.city}, {loc.country})</span>
                          {loc.isPrimary && <Badge variant="outline" className="ml-2 text-[9px]">Primary</Badge>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setLocations(locations.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Departments */}
            {activeStep === 'departments' && (
              <div className="space-y-4 max-w-xl">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Department Name (e.g. Operations)"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Code (e.g. OPS)"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      if (!newDeptName.trim()) return;
                      setDepartments([...departments, { name: newDeptName.trim(), code: newDeptCode.trim() }]);
                      setNewDeptName('');
                      setNewDeptCode('');
                    }}
                  >
                    Add
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                  {departments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No custom departments added yet. You can create them now or later in Settings.</p>
                  ) : (
                    departments.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs">
                        <div>
                          <span className="font-semibold text-foreground">{d.name}</span>
                          {d.code && <span className="text-[10px] text-muted-foreground ml-2 font-mono">({d.code})</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDepartments(departments.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 6: Team Invites */}
            {activeStep === 'team_invite' && (
              <div className="space-y-4 max-w-xl">
                <form onSubmit={handleSendInvite} className="space-y-3 border-b border-border pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="work.email@company.com *"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <Button type="submit" size="sm" disabled={sendingInvite} className="text-xs h-8">
                      {sendingInvite ? 'Sending...' : 'Invite'}
                    </Button>
                  </div>
                </form>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-foreground">Sent During Onboarding:</div>
                  {sentInvites.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No invites sent yet. You can invite your team now or later.</p>
                  ) : (
                    sentInvites.map((em, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 p-2 rounded">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Invitation dispatched to {em}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-border/60 pt-4 flex items-center justify-between">
            <div>
              {!isMandatory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip this step
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={handleNext}
                className="text-xs gap-1.5"
              >
                {saving
                  ? 'Saving Progress...'
                  : activeStep === 'team_invite'
                  ? 'Finish Setup'
                  : 'Save & Continue'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
