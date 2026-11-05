'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Building2,
  Users,
  Briefcase,
  CheckCircle2,
  Plus,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface PrebuiltDesignation {
  title: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  scope: 'WORKSPACE' | 'DEPARTMENT' | 'TEAM' | 'ASSIGNED';
  dept: string;
  level: number;
  description: string;
}

const INDUSTRY_DESIGNATION_MAP: Record<string, PrebuiltDesignation[]> = {
  TECHNOLOGY: [
    { title: 'Software Engineer', role: 'MEMBER', scope: 'TEAM', dept: 'Engineering', level: 2, description: 'Software engineering & execution' },
    { title: 'Tech Lead', role: 'MANAGER', scope: 'TEAM', dept: 'Engineering', level: 3, description: 'Technical squad leadership' },
    { title: 'Product Manager', role: 'MANAGER', scope: 'TEAM', dept: 'Product', level: 3, description: 'Product roadmap & backlog' },
    { title: 'UI/UX Designer', role: 'MEMBER', scope: 'TEAM', dept: 'Product Design', level: 2, description: 'User interface & design systems' },
  ],

  OPERATIONS: [
    { title: 'Operations Manager', role: 'MANAGER', scope: 'DEPARTMENT', dept: 'Operations', level: 3, description: 'Operations oversight' },
    { title: 'Supply Chain Lead', role: 'MANAGER', scope: 'TEAM', dept: 'Procurement', level: 3, description: 'Supply chain & procurement' },
    { title: 'Logistics Coordinator', role: 'MEMBER', scope: 'TEAM', dept: 'Logistics', level: 2, description: 'Logistics & shipment tracking' },
  ],

  AGENCY: [
    { title: 'Creative Director', role: 'MANAGER', scope: 'WORKSPACE', dept: 'Creative', level: 4, description: 'Creative direction & campaigns' },
    { title: 'Account Manager', role: 'MEMBER', scope: 'TEAM', dept: 'Client Services', level: 2, description: 'Client account relationships' },
    { title: 'UI/UX Designer', role: 'MEMBER', scope: 'TEAM', dept: 'Design', level: 2, description: 'Brand & visual design' },
  ],

  PROFESSIONAL_SERVICES: [
    { title: 'Managing Consultant', role: 'MANAGER', scope: 'WORKSPACE', dept: 'Advisory', level: 4, description: 'Client advisory & strategy' },
    { title: 'Engagement Manager', role: 'MANAGER', scope: 'TEAM', dept: 'Consulting', level: 3, description: 'Project delivery management' },
    { title: 'Business Analyst', role: 'MEMBER', scope: 'TEAM', dept: 'Analytics', level: 2, description: 'Process analysis & requirements' },
  ],

  FINANCE: [
    { title: 'Finance Manager', role: 'MANAGER', scope: 'WORKSPACE', dept: 'Finance', level: 3, description: 'Financial ledgers & planning' },
    { title: 'Senior Financial Analyst', role: 'MEMBER', scope: 'DEPARTMENT', dept: 'Finance', level: 3, description: 'Financial analysis & forecasting' },
    { title: 'Accountant', role: 'MEMBER', scope: 'DEPARTMENT', dept: 'Accounting', level: 2, description: 'Accounts & bookkeeping' },
  ],

  HEALTHCARE: [
    { title: 'Healthcare Administrator', role: 'ADMIN', scope: 'DEPARTMENT', dept: 'Administration', level: 3, description: 'Facility & regulatory administration' },
    { title: 'Clinical Operations Lead', role: 'MANAGER', scope: 'WORKSPACE', dept: 'Clinical Operations', level: 4, description: 'Clinical operations oversight' },
    { title: 'Care Coordinator', role: 'MEMBER', scope: 'TEAM', dept: 'Patient Services', level: 2, description: 'Patient care coordination' },
  ],

  RETAIL: [
    { title: 'Store Operations Manager', role: 'MANAGER', scope: 'WORKSPACE', dept: 'Store Operations', level: 4, description: 'Store operations & sales' },
    { title: 'E-Commerce Specialist', role: 'MEMBER', scope: 'TEAM', dept: 'Digital Commerce', level: 2, description: 'Digital storefront operations' },
    { title: 'Inventory Controller', role: 'MEMBER', scope: 'DEPARTMENT', dept: 'Supply Chain', level: 2, description: 'Inventory & stock control' },
  ],

  EDUCATION: [
    { title: 'Academic Director', role: 'MANAGER', scope: 'WORKSPACE', dept: 'Academics', level: 4, description: 'Academic curriculum oversight' },
    { title: 'Lead Instructor', role: 'MANAGER', scope: 'TEAM', dept: 'Instruction', level: 3, description: 'Course delivery & teaching' },
    { title: 'Admissions Officer', role: 'MEMBER', scope: 'TEAM', dept: 'Admissions', level: 2, description: 'Student enrollment & admissions' },
  ],

  GENERAL: [
    { title: 'Operations Manager', role: 'MANAGER', scope: 'DEPARTMENT', dept: 'Operations', level: 3, description: 'Operations management' },
    { title: 'Team Leader', role: 'MANAGER', scope: 'TEAM', dept: 'Management', level: 2, description: 'Team supervision' },
    { title: 'HR Executive', role: 'ADMIN', scope: 'DEPARTMENT', dept: 'Human Resources', level: 2, description: 'People operations & records' },
  ],
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: User & Workspace Credentials
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    workspaceName: '',
  });

  // Step 2: Organization Details & Prebuilt Designations
  const [orgSize, setOrgSize] = useState('10-20');
  const [businessType, setBusinessType] = useState('TECHNOLOGY');
  const [availableDesignations, setAvailableDesignations] = useState<PrebuiltDesignation[]>(
    INDUSTRY_DESIGNATION_MAP.TECHNOLOGY
  );
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>(
    INDUSTRY_DESIGNATION_MAP.TECHNOLOGY.map((d) => d.title)
  );
  const [customDesignation, setCustomDesignation] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!formData.email.trim()) {
      errs.email = 'Enter a valid work email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Enter a valid work email address.';
    }
    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }
    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!formData.workspaceName.trim()) {
      errs.workspaceName = 'Company / Workspace name is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinueToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Automatic Mapping when Industry Type changes
  const handleIndustryChange = (newIndustry: string) => {
    setBusinessType(newIndustry);
    const mapped = INDUSTRY_DESIGNATION_MAP[newIndustry] || INDUSTRY_DESIGNATION_MAP.GENERAL;
    setAvailableDesignations(mapped);
    // Auto-select all prebuilt designations for this industry
    setSelectedDesignations(mapped.map((d) => d.title));
    toast.info(`Auto-mapped ${mapped.length} designations for ${newIndustry.toLowerCase().replace(/_/g, ' ')}`);
  };

  const toggleDesignation = (title: string) => {
    if (selectedDesignations.includes(title)) {
      setSelectedDesignations(selectedDesignations.filter((t) => t !== title));
    } else {
      setSelectedDesignations([...selectedDesignations, title]);
    }
  };

  const handleSelectAllDesignations = () => {
    if (selectedDesignations.length === availableDesignations.length) {
      setSelectedDesignations([]);
    } else {
      setSelectedDesignations(availableDesignations.map((d) => d.title));
    }
  };

  const handleAddCustomDesignation = () => {
    const clean = customDesignation.trim();
    if (!clean) return;
    if (availableDesignations.some((d) => d.title.toLowerCase() === clean.toLowerCase())) {
      toast.info('Designation is already in the list.');
      return;
    }

    const newDesig: PrebuiltDesignation = {
      title: clean,
      role: 'MEMBER',
      scope: 'TEAM',
      dept: 'General',
      level: 2,
      description: 'Custom workplace role',
    };

    setAvailableDesignations([...availableDesignations, newDesig]);
    setSelectedDesignations([...selectedDesignations, clean]);
    setCustomDesignation('');
    toast.success(`Added "${clean}"`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    setLoading(true);

    try {
      // 1. Register Account and Workspace
      const res = await fetch(`${BRANDING.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          workspaceName: formData.workspaceName.trim(),
          country: 'India',
          timezone: 'UTC+05:30 (India Standard Time)',
          businessType,
          orgSize,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      const payload = data.data !== undefined ? data.data : data;
      const token = payload.accessToken;
      const wsId = payload.workspace?.id;

      if (token) {
        localStorage.setItem('accessToken', token);
      }
      if (wsId) {
        localStorage.setItem('activeWorkspaceId', wsId);
      }

      // 2. Prebuild and Auto-Map Selected Designations into the newly created Workspace
      const departmentList = Array.from(
        new Set(
          selectedDesignations
            .map((title) => availableDesignations.find((d) => d.title === title)?.dept)
            .filter(Boolean)
        )
      ).map((deptName) => ({
        name: deptName as string,
        code: (deptName as string).slice(0, 3).toUpperCase(),
      }));

      const mappedOrgSize =
        orgSize === '5' || orgSize === '10'
          ? '1-10'
          : orgSize === '20' || orgSize === '50'
          ? '10-50'
          : orgSize === '100'
          ? '50-200'
          : orgSize === '100+'
          ? '200+'
          : orgSize || '10-50';

      if (token && wsId && selectedDesignations.length > 0) {
        try {
          await Promise.all(
            selectedDesignations.map(async (title) => {
              const matched = availableDesignations.find((d) => d.title === title);
              return fetch(`${BRANDING.apiUrl}/designations`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                  'x-workspace-id': wsId,
                },
                body: JSON.stringify({
                  title,
                  level: matched?.level || 1,
                  description: matched?.description || `Auto-mapped to ${matched?.role || 'MEMBER'}`,
                }),
              }).catch(() => {});
            })
          );
        } catch (seedErr) {
          console.warn('[Orvexa] Non-blocking designation prebuild notice:', seedErr);
        }
      }

      // 3. Pre-seed Onboarding Step 1 (Organization Profile) & Step 5 (Departments)
      if (token && wsId) {
        try {
          await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/step`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'x-workspace-id': wsId,
            },
            body: JSON.stringify({
              step: 'profile',
              data: {
                name: formData.workspaceName.trim(),
                businessType,
                country: 'India',
                timezone: 'UTC+05:30 (India Standard Time)',
                orgSize: mappedOrgSize,
              },
              markCompleted: true,
            }),
          }).catch(() => {});

          if (departmentList.length > 0) {
            await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/step`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'x-workspace-id': wsId,
              },
              body: JSON.stringify({
                step: 'departments',
                data: { departments: departmentList },
                markCompleted: false,
              }),
            }).catch(() => {});
          }
        } catch {}
      }

      // Cache user details & workspace info for seamless prefilling in personal details & onboarding
      try {
        localStorage.setItem(
          'user',
          JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            workspaceName: formData.workspaceName.trim(),
            businessType,
            orgSize: mappedOrgSize,
            role: 'OWNER',
          })
        );
        localStorage.setItem(
          'orvexa_cached_workspace',
          JSON.stringify({
            workspaceId: wsId,
            workspace: {
              id: wsId,
              name: formData.workspaceName.trim(),
              slug: payload.workspace?.slug || formData.workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              businessType,
            },
            accessRole: 'OWNER',
          })
        );
        localStorage.setItem('orvexa_registered_designations', JSON.stringify(selectedDesignations));
        localStorage.setItem('orvexa_registered_departments', JSON.stringify(departmentList));
      } catch {}

      toast.success('Organization created with auto-mapped designations!');
      router.push('/app/settings?tab=personal');
    } catch (err: any) {
      toast.error(err.message || 'Error creating organization');
    } finally {
      setLoading(false);
    }
  };

  const getIndustryLabel = (type: string) => {
    switch (type) {
      case 'TECHNOLOGY':
        return 'Technology & Software';
      case 'PROFESSIONAL_SERVICES':
        return 'Professional & Consulting Services';
      case 'OPERATIONS':
        return 'Operations & Logistics';
      case 'FINANCE':
        return 'Financial Services & Fintech';
      case 'HEALTHCARE':
        return 'Healthcare & Life Sciences';
      case 'AGENCY':
        return 'Agency & Marketing';
      case 'RETAIL':
        return 'Retail & E-Commerce';
      case 'EDUCATION':
        return 'Education & EdTech';
      case 'GENERAL':
      default:
        return 'General Enterprise';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'ADMIN':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'MANAGER':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'MEMBER':
      default:
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:py-12">
      <Card className={`w-full ${step === 1 ? 'max-w-lg' : 'max-w-2xl'} border-border shadow-xl`}>
        {/* Step Indicator Header */}
        <div className="border-b border-border/80 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-base shadow-sm">
                O
              </div>
              <span className="font-bold text-sm tracking-tight text-foreground">{BRANDING.name} Platform</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className={`px-2 py-0.5 rounded-full ${step === 1 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-foreground'}`}>
                1
              </span>
              <span>Account</span>
              <span className="text-muted-foreground/40">/</span>
              <span className={`px-2 py-0.5 rounded-full ${step === 2 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>
                2
              </span>
              <span>Organization</span>
            </div>
          </div>

          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {step === 1 ? `Create your ${BRANDING.name} Account` : 'Configure your Organization'}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {step === 1
                ? 'Step 1 of 2: Set up your Owner account credentials and company workspace identity.'
                : 'Step 2 of 2: Select employee count and industry type for instant designation auto-mapping.'}
            </CardDescription>
          </div>
        </div>

        {/* STEP 1: Personal & Workspace Form */}
        {step === 1 && (
          <form onSubmit={handleContinueToStep2} noValidate>
            <CardContent className="space-y-4 pt-6">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>First Name <span className="text-destructive">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      if (errors.firstName) setErrors({ ...errors, firstName: '' });
                    }}
                    placeholder="Rahul"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  {errors.firstName && <p className="text-[11px] font-medium text-destructive mt-0.5">{errors.firstName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Last Name <span className="text-destructive">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      if (errors.lastName) setErrors({ ...errors, lastName: '' });
                    }}
                    placeholder="Sharma"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  {errors.lastName && <p className="text-[11px] font-medium text-destructive mt-0.5">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Email Address <span className="text-destructive">*</span></span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="rahul@company.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                {errors.email && <p className="text-[11px] font-medium text-destructive mt-0.5">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Password <span className="text-destructive">*</span></span>
                  <span className="text-[11px] text-muted-foreground font-normal">Min 8 characters</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: '' });
                    }}
                    placeholder="At least 8 characters"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] font-medium text-destructive mt-0.5">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Confirm Password <span className="text-destructive">*</span></span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    placeholder="Re-enter your password"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-[11px] font-medium text-destructive mt-0.5">{errors.confirmPassword}</p>}
              </div>

              {/* Company / Workspace Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Company / Workspace Name <span className="text-destructive">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.workspaceName}
                  onChange={(e) => {
                    setFormData({ ...formData, workspaceName: e.target.value });
                    if (errors.workspaceName) setErrors({ ...errors, workspaceName: '' });
                  }}
                  placeholder="Acme Global Operations"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                {errors.workspaceName && <p className="text-[11px] font-medium text-destructive mt-0.5">{errors.workspaceName}</p>}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button type="submit" size="lg" className="w-full font-semibold shadow-sm">
                Continue to Organization Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Log in
                </Link>
              </div>
            </CardFooter>
          </form>
        )}

        {/* STEP 2: Organization Details & Prebuilt Designations */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-6">
              {/* Dropdowns Row: Number of Employees & Industry Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Dropdown 1: Number of Employees */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Number of Employees <span className="text-destructive">*</span></span>
                    <span className="text-[11px] text-muted-foreground font-normal">Team size</span>
                  </label>
                  <div className="relative">
                    <Users className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={orgSize}
                      onChange={(e) => setOrgSize(e.target.value)}
                      className="w-full h-10 appearance-none rounded-lg border border-input bg-background pl-10 pr-9 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium cursor-pointer shadow-2xs transition-colors"
                    >
                      <option value="5">1 - 5 employees (Micro core team)</option>
                      <option value="10">5 - 10 employees (Growing startup)</option>
                      <option value="20">10 - 20 employees (Scaling squad)</option>
                      <option value="50">20 - 50 employees (Mid-size operations)</option>
                      <option value="100">50 - 100 employees (Expanding company)</option>
                      <option value="100+">100+ employees (Enterprise scale)</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Dropdown 2: Industry Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Industry & Domain <span className="text-destructive">*</span></span>
                    <span className="text-[11px] text-primary flex items-center gap-1 font-normal">
                      <Sparkles className="h-3 w-3" /> auto-mapping
                    </span>
                  </label>
                  <div className="relative">
                    <Building2 className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={businessType}
                      onChange={(e) => handleIndustryChange(e.target.value)}
                      className="w-full h-10 appearance-none rounded-lg border border-input bg-background pl-10 pr-9 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium cursor-pointer shadow-2xs transition-colors"
                    >
                      <option value="TECHNOLOGY">Technology & Software Services</option>
                      <option value="PROFESSIONAL_SERVICES">Professional & Consulting Services</option>
                      <option value="OPERATIONS">Operations, Logistics & Supply Chain</option>
                      <option value="FINANCE">Financial Services & Banking</option>
                      <option value="HEALTHCARE">Healthcare & Life Sciences</option>
                      <option value="AGENCY">Agency & Creative Marketing</option>
                      <option value="RETAIL">Retail & E-Commerce</option>
                      <option value="EDUCATION">Education & Training</option>
                      <option value="GENERAL">General Enterprise</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Prebuilt Workplace Designations Section */}
              <div className="space-y-3 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      Workplace Designations
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Auto-mapped for <span className="font-semibold text-primary">{getIndustryLabel(businessType)}</span>. Roles will be seeded in your directory.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllDesignations}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    {selectedDesignations.length === availableDesignations.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Major Workplace Designations List */}
                <div className="space-y-2">
                  {availableDesignations.map((desig) => {
                    const isChecked = selectedDesignations.includes(desig.title);
                    return (
                      <label
                        key={desig.title}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'border-primary/40 bg-primary/[0.03] shadow-2xs'
                            : 'border-border/70 bg-card hover:bg-muted/40 hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDesignation(desig.title)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                          />
                          <span className="text-sm font-medium text-foreground truncate">
                            {desig.title}
                          </span>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[9px] px-2 py-0.5 font-mono border shrink-0 ${getRoleBadgeColor(desig.role)}`}
                        >
                          {desig.role}
                        </Badge>
                      </label>
                    );
                  })}
                </div>

                {/* Add Custom Designation Inline */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customDesignation}
                    onChange={(e) => setCustomDesignation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomDesignation();
                      }
                    }}
                    placeholder="Add custom designation (e.g. Solution Architect, Scrum Master)..."
                    className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomDesignation}
                    className="h-9 px-3 text-xs gap-1 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Role
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-border/80 pt-4 gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs font-semibold gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Account Details
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="font-semibold shadow-sm text-xs gap-1.5 px-4 h-9"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating Workspace...
                  </>
                ) : (
                  <>
                    Create Account & Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
