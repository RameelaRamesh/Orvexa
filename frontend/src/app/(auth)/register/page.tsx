'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    workspaceName: '',
    country: 'United States',
    timezone: 'UTC-05:00 (Eastern Time)',
    businessType: '',
    orgSize: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
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
    if (!formData.workspaceName.trim()) errs.workspaceName = 'Organization name is required.';
    if (!formData.country.trim()) errs.country = 'Country selection is required.';
    if (!formData.timezone.trim()) errs.timezone = 'Timezone selection is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('accessToken', data.data.accessToken);
      if (data.data.workspace) {
        localStorage.setItem('activeWorkspaceId', data.data.workspace.id);
      }

      toast.success('Organization created successfully!');
      router.push('/app/home');
    } catch (err: any) {
      toast.error(err.message || 'Error creating organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg border-border shadow-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg mb-2">
            O
          </div>
          <CardTitle className="text-2xl font-bold">Create your {BRANDING.name} Workspace</CardTitle>
          <CardDescription>Enter required organization and admin details</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4 pt-2">
            {/* Required Section */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    First Name <span className="text-destructive font-semibold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Rahul"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.firstName && <p className="text-[11px] text-destructive mt-0.5">{errors.firstName}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Last Name <span className="text-destructive font-semibold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Sharma"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.lastName && <p className="text-[11px] text-destructive mt-0.5">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Work Email <span className="text-destructive font-semibold ml-0.5">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rahul@company.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.email && <p className="text-[11px] text-destructive mt-0.5">{errors.email}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Password <span className="text-destructive font-semibold ml-0.5">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 8 characters"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                {errors.password && <p className="text-[11px] text-destructive mt-0.5">{errors.password}</p>}
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-xs font-medium text-foreground">
                  Organization Name <span className="text-destructive font-semibold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.workspaceName}
                  onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                  placeholder="Acme Global Operations"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.workspaceName && <p className="text-[11px] text-destructive mt-0.5">{errors.workspaceName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Country <span className="text-destructive font-semibold ml-0.5">*</span>
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="United States">United States</option>
                    <option value="India">India</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Timezone <span className="text-destructive font-semibold ml-0.5">*</span>
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="UTC-05:00 (Eastern Time)">UTC-05:00 (Eastern Time)</option>
                    <option value="UTC+05:30 (India Standard Time)">UTC+05:30 (IST)</option>
                    <option value="UTC+00:00 (Greenwich Mean Time)">UTC+00:00 (GMT)</option>
                    <option value="UTC-08:00 (Pacific Time)">UTC-08:00 (Pacific Time)</option>
                    <option value="UTC+08:00 (Singapore Standard Time)">UTC+08:00 (SGT)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Optional Section */}
            <div className="pt-3 border-t border-border space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Optional Information (Can be configured later)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Industry / Business Type (Optional)</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Choose later / Skip</option>
                    <option value="OPERATIONS">Operations & Support Services</option>
                    <option value="TECH_SERVICES">Technology & Digital Services</option>
                    <option value="AGENCY">Agency & Advisory</option>
                    <option value="PROFESSIONAL_SERVICES">Professional Services</option>
                    <option value="FINANCE">Financial Services</option>
                    <option value="GENERAL">General Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Company Size (Optional)</label>
                  <select
                    value={formData.orgSize}
                    onChange={(e) => setFormData({ ...formData, orgSize: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Choose later / Skip</option>
                    <option value="1-10">1-10 Employees</option>
                    <option value="10-50">10-50 Employees</option>
                    <option value="50-250">50-250 Employees</option>
                    <option value="250+">250+ Employees</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Organization...' : 'Create Organization'}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
