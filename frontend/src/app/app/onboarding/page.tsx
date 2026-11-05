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
  const [country, setCountry] = useState('India');
  const [timezone, setTimezone] = useState('UTC+05:30 (India Standard Time)');
  const [orgSize, setOrgSize] = useState('10-50');

  // Step 2: Schedule
  const [workingDays, setWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);

  // Step 3: Holidays
  const [holidays, setHolidays] = useState<Array<{ name: string; date: string; type: string }>>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayType, setNewHolidayType] = useState('NATIONAL');

  // Step 4: Locations
  const [locations, setLocations] = useState<Array<{ name: string; city: string; country: string; isPrimary: boolean }>>([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [newLocCountry, setNewLocCountry] = useState('India');
  const [newLocIsPrimary, setNewLocIsPrimary] = useState(false);

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

      // Hydrate forms with saved data or earlier entered registration & personal details
      let regOrgName = '';
      let regBusinessType = 'GENERAL';
      let regOrgSize = '10-50';
      let userLocation = '';

      const normalizeOrgSize = (val: string) => {
        if (!val) return '10-50';
        if (['1-10', '10-50', '50-200', '200+'].includes(val)) return val;
        if (val === '5' || val === '10') return '1-10';
        if (val === '20' || val === '50') return '10-50';
        if (val === '100') return '50-200';
        if (val === '100+') return '200+';
        return '10-50';
      };

      const normalizeBusinessType = (val: string) => {
        if (!val) return 'GENERAL';
        const upper = val.toUpperCase();
        if (['GENERAL', 'TECHNOLOGY', 'HEALTHCARE', 'FINANCE', 'RETAIL', 'OPERATIONS', 'AGENCY', 'PROFESSIONAL_SERVICES'].includes(upper)) {
          return upper;
        }
        if (upper.includes('TECH') || upper.includes('SOFTWARE')) return 'TECHNOLOGY';
        if (upper.includes('CONSULT') || upper.includes('PROFESSIONAL')) return 'PROFESSIONAL_SERVICES';
        if (upper.includes('LOGIST') || upper.includes('OPERAT')) return 'OPERATIONS';
        if (upper.includes('HEALTH') || upper.includes('MEDIC')) return 'HEALTHCARE';
        if (upper.includes('FINAN') || upper.includes('BANK')) return 'FINANCE';
        if (upper.includes('RETAIL') || upper.includes('COMMERCE')) return 'RETAIL';
        if (upper.includes('AGENCY') || upper.includes('MARKET')) return 'AGENCY';
        return 'GENERAL';
      };

      if (typeof window !== 'undefined') {
        try {
          const wsCache = localStorage.getItem('orvexa_cached_workspace');
          if (wsCache) {
            const parsedWs = JSON.parse(wsCache);
            regOrgName = parsedWs?.workspace?.name || '';
            regBusinessType = parsedWs?.workspace?.businessType || 'GENERAL';
          }
          const userCache = localStorage.getItem('user');
          if (userCache) {
            const parsedUser = JSON.parse(userCache);
            if (!regOrgName && parsedUser.workspaceName) regOrgName = parsedUser.workspaceName;
            if (parsedUser.businessType) regBusinessType = parsedUser.businessType;
            if (parsedUser.orgSize) regOrgSize = parsedUser.orgSize;
            if (parsedUser.location) userLocation = parsedUser.location;
          }
          const profileCache = localStorage.getItem('orvexa_cached_profile');
          if (profileCache) {
            const parsedProf = JSON.parse(profileCache);
            if (!userLocation && parsedProf.location) userLocation = parsedProf.location;
          }
          const savedLoc = localStorage.getItem('orvexa_user_location');
          if (!userLocation && savedLoc) userLocation = savedLoc;
        } catch {}
      }

      const setup = payload.setupData || {};
      const profileData = setup.profile || {};
      setOrgName(profileData.name || regOrgName || '');
      setBusinessType(normalizeBusinessType(profileData.businessType || regBusinessType || 'GENERAL'));
      setCountry(profileData.country || 'India');
      setTimezone(profileData.timezone || 'UTC+05:30 (India Standard Time)');
      setOrgSize(normalizeOrgSize(profileData.orgSize || regOrgSize || '10-50'));

      if (setup.schedule) {
        setWorkingDays(setup.schedule.workingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
        setStartTime(setup.schedule.startTime || '09:00');
        setEndTime(setup.schedule.endTime || '18:00');
        setWorkHoursPerDay(setup.schedule.workHoursPerDay || 8);
      }

      // Holidays: Hydrate from setup or seed with standard Indian holidays
      if (Array.isArray(setup.holidays) && setup.holidays.length > 0) {
        setHolidays(setup.holidays);
      } else {
        const curYear = new Date().getFullYear();
        setHolidays([
          { name: 'Republic Day', date: `${curYear}-01-26`, type: 'NATIONAL' },
          { name: 'Independence Day', date: `${curYear}-08-15`, type: 'NATIONAL' },
          { name: 'Gandhi Jayanti', date: `${curYear}-10-02`, type: 'NATIONAL' },
          { name: 'Diwali', date: `${curYear}-11-01`, type: 'COMPANY' },
        ]);
      }

      // Locations: Hydrate from setup or seed with Headquarters from user location
      const fallbackCity = (userLocation || 'Mumbai').replace(/,\s*India/i, '').trim() || 'Mumbai';
      if (Array.isArray(setup.locations) && setup.locations.length > 0) {
        setLocations(setup.locations);
        setNewLocName(setup.locations[0].name || 'Headquarters');
        setNewLocCity(setup.locations[0].city || fallbackCity);
        setNewLocIsPrimary(true);
      } else {
        const initialLoc = {
          name: 'Headquarters',
          city: fallbackCity,
          country: 'India',
          isPrimary: true,
        };
        setLocations([initialLoc]);
        setNewLocName('Headquarters');
        setNewLocCity(fallbackCity);
        setNewLocCountry('India');
        setNewLocIsPrimary(true);
      }

      // Departments: Hydrate from setup, or cached registered departments, or sensible defaults
      let deptData = Array.isArray(setup.departments) && setup.departments.length > 0 ? setup.departments : [];
      if (deptData.length === 0 && typeof window !== 'undefined') {
        try {
          const cachedDepts = localStorage.getItem('orvexa_registered_departments');
          if (cachedDepts) {
            deptData = JSON.parse(cachedDepts);
          }
        } catch {}
      }
      if (deptData.length === 0) {
        deptData = [
          { name: 'Engineering', code: 'ENG' },
          { name: 'Human Resources', code: 'HR' },
          { name: 'Operations', code: 'OPS' },
          { name: 'Finance', code: 'FIN' },
        ];
      }
      setDepartments(deptData);

      // Intelligently position the active step based on actual step completion
      const completedSteps: string[] = payload.completedSteps || (profileData.name || regOrgName ? ['profile'] : []);
      if (!completedSteps.includes('profile') && !regOrgName) {
        setActiveStep('profile');
      } else if (!completedSteps.includes('schedule')) {
        setActiveStep('schedule');
      } else if (!completedSteps.includes('holidays')) {
        setActiveStep('holidays');
      } else if (!completedSteps.includes('locations')) {
        setActiveStep('locations');
      } else if (!completedSteps.includes('departments')) {
        setActiveStep('departments');
      } else if (!completedSteps.includes('team_invite')) {
        setActiveStep('team_invite');
      } else {
        setActiveStep('schedule');
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
    { id: 'profile', name: 'Organization Profile', icon: Building2, mandatory: true },
    { id: 'schedule', name: 'Work Schedule', icon: Clock, mandatory: true },
    { id: 'holidays', name: 'Public Holidays', icon: Calendar, mandatory: false },
    { id: 'locations', name: 'Office Locations', icon: MapPin, mandatory: false },
    { id: 'departments', name: 'Departments', icon: Building2, mandatory: false },
    { id: 'team_invite', name: 'Team Invites', icon: Users, mandatory: false },
  ];

  const handleNext = async () => {
    try {
      if (activeStep === 'profile') {
        if (!orgName.trim()) {
          toast.error('Organization name is required.');
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
        await saveStepData('team_invite', { completed: true });
        toast.success('Onboarding complete! Welcome to ORVEXA.');
        router.push('/app/home');
      }
    } catch {
      // toast handled in saveStepData
    }
  };

  const handleBack = () => {
    const currentIdx = stepsList.findIndex((s) => s.id === activeStep);
    if (currentIdx > 0) {
      setActiveStep(stepsList[currentIdx - 1].id);
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

      toast.success('Invitation dispatched to ' + inviteEmail);
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
                Setup Wizard
              </span>
              <Badge variant="outline" className="text-[10px]">
                {status?.isCompleted ? 'Mandatory Setup Completed' : 'Setup In Progress'}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1">
              Configure Your Organization
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up core schedules, locations, departments, and team members. You can revisit anytime.
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
                  {activeStep === 'profile' && 'Set core org identity: organization legal name, business type, country, and timezone.'}
                  {activeStep === 'schedule' && 'Define standard working hours, days, and shifts for attendance.'}
                  {activeStep === 'holidays' && 'Add national or company public holidays to the workspace calendar.'}
                  {activeStep === 'locations' && 'Register office locations (head office, branches, hubs).'}
                  {activeStep === 'departments' && 'Create the organizational structure by defining departments.'}
                  {activeStep === 'team_invite' && 'Invite initial team members with pre-assigned roles to the workspace.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {/* STEP 1: Organization Profile */}
            {activeStep === 'profile' && (
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Legal or brand name of the company"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Business Type *</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="TECHNOLOGY">TECHNOLOGY</option>
                    <option value="HEALTHCARE">HEALTHCARE</option>
                    <option value="FINANCE">FINANCE</option>
                    <option value="RETAIL">RETAIL</option>
                    <option value="OPERATIONS">OPERATIONS & SUPPORT</option>
                    <option value="AGENCY">AGENCY</option>
                    <option value="PROFESSIONAL_SERVICES">PROFESSIONAL SERVICES</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Country *</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="Singapore">Singapore</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Timezone *</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="UTC+05:30 (India Standard Time)">UTC+05:30 IST</option>
                      <option value="UTC-05:00 (Eastern Time)">UTC-05:00 (Eastern Time)</option>
                      <option value="UTC-08:00 (Pacific Time)">UTC-08:00 (Pacific Time)</option>
                      <option value="UTC+00:00 (London)">UTC+00:00 (London)</option>
                      <option value="UTC+01:00 (Central European Time)">UTC+01:00 (CET)</option>
                      <option value="UTC+08:00 (Singapore / HK)">UTC+08:00 (SGT / HK)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Organization Size *</label>
                  <select
                    value={orgSize}
                    onChange={(e) => setOrgSize(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="1-10">1-10 employees</option>
                    <option value="10-50">10-50 employees</option>
                    <option value="50-200">50-200 employees</option>
                    <option value="200+">200+ employees</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: Work Schedule */}
            {activeStep === 'schedule' && (
              <div className="space-y-5 max-w-xl">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Working Days *</label>
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
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
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
                    <label className="text-xs font-semibold text-foreground">Work Hours Per Day</label>
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

            {/* STEP 3: Public Holidays */}
            {activeStep === 'holidays' && (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Holiday Name (e.g. Republic Day)"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="sm:col-span-5 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="sm:col-span-3 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <select
                    value={newHolidayType}
                    onChange={(e) => setNewHolidayType(e.target.value)}
                    className="sm:col-span-2 rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="NATIONAL">NATIONAL</option>
                    <option value="COMPANY">COMPANY</option>
                    <option value="OPTIONAL">OPTIONAL</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    className="sm:col-span-2 text-xs h-8 font-semibold"
                    onClick={() => {
                      if (!newHolidayName.trim() || !newHolidayDate) return;
                      setHolidays([...holidays, { name: newHolidayName.trim(), date: newHolidayDate, type: newHolidayType }]);
                      setNewHolidayName('');
                      setNewHolidayDate('');
                    }}
                  >
                    + Add Holiday
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                  {holidays.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No holidays added yet. Add national/company holidays or click Save & Continue.</p>
                  ) : (
                    holidays.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{h.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({h.date})</span>
                          <Badge variant="outline" className="text-[9px] py-0">{h.type}</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHolidays(holidays.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Office Locations */}
            {activeStep === 'locations' && (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Location Name (e.g. Head Office)"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    className="sm:col-span-4 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="City (e.g. Mumbai)"
                    value={newLocCity}
                    onChange={(e) => setNewLocCity(e.target.value)}
                    className="sm:col-span-3 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <select
                    value={newLocCountry}
                    onChange={(e) => setNewLocCountry(e.target.value)}
                    className="sm:col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Singapore">Singapore</option>
                    <option value="United Arab Emirates">UAE</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    className="sm:col-span-2 text-xs h-8 font-semibold"
                    onClick={() => {
                      if (!newLocName.trim() || !newLocCity.trim()) return;
                      setLocations([
                        ...locations,
                        {
                          name: newLocName.trim(),
                          city: newLocCity.trim(),
                          country: newLocCountry.trim(),
                          isPrimary: newLocIsPrimary || locations.length === 0,
                        },
                      ]);
                      setNewLocName('');
                      setNewLocCity('');
                      setNewLocIsPrimary(false);
                    }}
                  >
                    + Add Location
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    id="setAsPrimary"
                    checked={newLocIsPrimary}
                    onChange={(e) => setNewLocIsPrimary(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary"
                  />
                  <label htmlFor="setAsPrimary" className="cursor-pointer">
                    Set as Primary location
                  </label>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                  {locations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No office locations added yet. Add headquarters/branches or continue.</p>
                  ) : (
                    locations.map((loc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground">({loc.city}, {loc.country})</span>
                          {loc.isPrimary && <Badge variant="default" className="text-[9px] py-0">Primary</Badge>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setLocations(locations.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80 p-1"
                          title="Delete"
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
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Department Name (e.g. Engineering)"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="sm:col-span-6 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Short Code (e.g. ENG)"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="sm:col-span-3 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="sm:col-span-3 text-xs h-8 font-semibold"
                    onClick={() => {
                      if (!newDeptName.trim()) return;
                      setDepartments([...departments, { name: newDeptName.trim(), code: newDeptCode.trim() }]);
                      setNewDeptName('');
                      setNewDeptCode('');
                    }}
                  >
                    + Add Department
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                  {departments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No departments created yet. Add initial units or continue.</p>
                  ) : (
                    departments.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-card border border-border text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{d.name}</span>
                          {d.code && <span className="text-[10px] text-muted-foreground font-mono">({d.code})</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDepartments(departments.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:opacity-80 p-1"
                          title="Delete"
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
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">First Name</label>
                      <input
                        type="text"
                        placeholder="Invitee's first name"
                        value={inviteFirstName}
                        onChange={(e) => setInviteFirstName(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Last Name</label>
                      <input
                        type="text"
                        placeholder="Invitee's last name"
                        value={inviteLastName}
                        onChange={(e) => setInviteLastName(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-xs font-semibold text-foreground">Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="Invitee's email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-xs font-semibold text-foreground">Role *</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="OWNER">OWNER</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3 flex items-end">
                      <Button type="submit" size="sm" disabled={sendingInvite} className="w-full text-xs h-8 font-semibold">
                        {sendingInvite ? 'Sending...' : 'Send Invite'}
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-foreground">✓ Sent invite list:</div>
                  {sentInvites.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No team invites sent yet. You can invite colleagues now or click Finish Setup.</p>
                  ) : (
                    sentInvites.map((em, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 p-2 rounded">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Invitation sent to {em}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-border/60 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeStep !== 'profile' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="text-xs gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}
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
                className="text-xs gap-1.5 font-semibold"
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
