'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BRANDING } from '@/config/branding';
import { DEFAULT_ENABLED_MODULES } from '@/lib/permissions';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

/* LEGACY_ROLE_COMMENTED_OUT & STEP2_MOVED_TO_PRE_STEPPER:
 * Previously Step 2 of /register collected orgSize + industry + hard-coded MANAGER/MEMBER designation lists.
 * Industry (multi-select), 8 Employee Size Brackets, Recommended Modules/Features, and Staff Roles now run
 * immediately after account creation inside the Welcome & Tailored Pre-Stepper flow (/app/onboarding?stage=welcome).
 *
 * interface PrebuiltDesignation {
 *   title: string;
 *   role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
 *   scope: 'WORKSPACE' | 'DEPARTMENT' | 'TEAM' | 'ASSIGNED';
 *   dept: string;
 *   level: number;
 *   description: string;
 * }
 * const INDUSTRY_DESIGNATION_MAP = ...
 */

export default function RegisterPage() {
  const router = useRouter();

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
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
          businessType: 'GENERAL',
          orgSize: '0-10',
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

      try {
        localStorage.setItem(
          'user',
          JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            workspaceName: formData.workspaceName.trim(),
            role: 'OWNER',
          }),
        );
        localStorage.setItem(
          'orvexa_cached_workspace',
          JSON.stringify({
            workspaceId: wsId,
            workspace: {
              id: wsId,
              name: formData.workspaceName.trim(),
              slug:
                payload.workspace?.slug ||
                formData.workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              businessType: payload.workspace?.businessType || 'GENERAL',
              settings: {
                ...(payload.workspace?.settings || {}),
                enabledModules:
                  payload.workspace?.settings?.enabledModules || DEFAULT_ENABLED_MODULES,
              },
            },
            accessRole: 'OWNER',
          }),
        );
      } catch {}

      toast.success('Workspace created! Welcome to ' + BRANDING.name + '.');
      router.push('/app/onboarding?stage=welcome');
    } catch (err: any) {
      toast.error(err.message || 'Error creating organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:py-12">
      <Card className="w-full max-w-lg border-border shadow-xl">
        <div className="border-b border-border/80 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-base shadow-sm">
                O
              </div>
              <span className="font-bold text-sm tracking-tight text-foreground">
                {BRANDING.name} Platform
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
              Owner Signup
            </span>
          </div>

          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Create your {BRANDING.name} Account
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Set up your Owner credentials and workspace name — next we&apos;ll tailor modules and permissions to your organization.
            </CardDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>
                    First Name <span className="text-destructive">*</span>
                  </span>
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
                {errors.firstName && (
                  <p className="text-[11px] font-medium text-destructive mt-0.5">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>
                    Last Name <span className="text-destructive">*</span>
                  </span>
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
                {errors.lastName && (
                  <p className="text-[11px] font-medium text-destructive mt-0.5">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Work Email Address <span className="text-destructive">*</span>
                </span>
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
              {errors.email && (
                <p className="text-[11px] font-medium text-destructive mt-0.5">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Password <span className="text-destructive">*</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Min 8 characters
                </span>
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
              {errors.password && (
                <p className="text-[11px] font-medium text-destructive mt-0.5">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Confirm Password <span className="text-destructive">*</span>
                </span>
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
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] font-medium text-destructive mt-0.5">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Company / Workspace Name <span className="text-destructive">*</span>
                </span>
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
              {errors.workspaceName && (
                <p className="text-[11px] font-medium text-destructive mt-0.5">
                  {errors.workspaceName}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full font-semibold shadow-sm gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account &amp; Workspace...
                </>
              ) : (
                <>
                  Create Account &amp; Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
