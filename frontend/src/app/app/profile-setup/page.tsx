'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';

export default function MemberProfileSetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);

  // Editable personal profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch(`${BRANDING.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = await res.json();
        if (!res.ok) throw new Error(raw?.message || 'Unable to load profile');
        const payload = raw?.data !== undefined ? raw.data : raw;

        setProfile(payload);
        setFirstName(payload.firstName || '');
        setLastName(payload.lastName || '');
        setPhone(payload.phone || '');
        setAvatarUrl(payload.avatarUrl || null);

        const memberships: any[] = Array.isArray(payload.memberships) ? payload.memberships : [];
        const savedWsId = localStorage.getItem('activeWorkspaceId');
        const mem = memberships.find((m) => m.workspaceId === savedWsId) || memberships[0] || null;
        setActiveWorkspace(mem);
        setWorkLocation(mem?.workLocation || '');

        try {
          localStorage.setItem('orvexa_cached_profile', JSON.stringify(payload));
          if (mem) localStorage.setItem('orvexa_cached_workspace', JSON.stringify(mem));
        } catch {}
      } catch (err: any) {
        toast.error(err?.message || 'Could not load your profile details');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a PNG, JPG, or WebP image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB.');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
      setUploadingImage(false);
      toast.success('Photo loaded! Click Save or Continue to keep it.');
    };
    reader.onerror = () => {
      setUploadingImage(false);
      toast.error('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const persistProfile = async (markCompleted: boolean, redirectHome: boolean) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Session missing. Please log in.');
      router.push('/login');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          workLocation: workLocation.trim() || undefined,
          avatarUrl,
          ...(markCompleted ? { profileSetupCompleted: true } : {}),
        }),
      });
      const raw = await res.json();
      if (!res.ok) throw new Error(raw?.message || 'Failed to save profile');
      const payload = raw?.data !== undefined ? raw.data : raw;
      const updatedUser = payload?.user || payload;

      try {
        if (avatarUrl) {
          localStorage.setItem('orvexa_user_avatar', avatarUrl);
          window.dispatchEvent(new CustomEvent('orvexa_avatar_updated', { detail: avatarUrl }));
        } else {
          localStorage.removeItem('orvexa_user_avatar');
        }
        const cached = localStorage.getItem('orvexa_cached_profile');
        const parsed = cached ? JSON.parse(cached) : {};
        const mergedProfile = {
          ...parsed,
          ...updatedUser,
          avatarUrl,
          ...(markCompleted ? { profileSetupCompleted: true } : {}),
        };
        localStorage.setItem('orvexa_cached_profile', JSON.stringify(mergedProfile));
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: mergedProfile }));

        if (activeWorkspace) {
          const updatedMem = {
            ...activeWorkspace,
            workLocation: workLocation.trim() || activeWorkspace.workLocation,
            ...(markCompleted ? { profileSetupCompleted: true } : {}),
          };
          localStorage.setItem('orvexa_cached_workspace', JSON.stringify(updatedMem));
          window.dispatchEvent(new CustomEvent('workspace-updated', { detail: updatedMem }));
        }
      } catch {}

      if (redirectHome) {
        toast.success('Profile setup complete! Welcome to your workspace.');
        router.push('/app/home');
      } else {
        toast.success('Profile saved! Click Continue whenever you are ready.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipForLater = async () => {
    const token = localStorage.getItem('accessToken');
    setSaving(true);
    try {
      if (token) {
        await fetch(`${BRANDING.apiUrl}/auth/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profileSetupCompleted: true }),
        }).catch(() => null);
      }
      try {
        const cached = localStorage.getItem('orvexa_cached_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          localStorage.setItem(
            'orvexa_cached_profile',
            JSON.stringify({ ...parsed, profileSetupCompleted: true }),
          );
        }
        if (activeWorkspace) {
          localStorage.setItem(
            'orvexa_cached_workspace',
            JSON.stringify({ ...activeWorkspace, profileSetupCompleted: true }),
          );
        }
      } catch {}
      toast.info('Skipped for now — you can update your profile anytime from top-right avatar or Settings.');
      router.push('/app/home');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const rawRoleName = activeWorkspace?.role?.name || '';
  const sysAccessUpper = (activeWorkspace?.accessRole || '').toUpperCase();
  /* LEGACY_ROLE_COMMENTED_OUT: never display raw MEMBER/MANAGER on profile setup */
  const displayRoleLabel =
    rawRoleName && !['MEMBER', 'MANAGER'].includes(rawRoleName.toUpperCase())
      ? rawRoleName
      : activeWorkspace?.designation?.title
      ? activeWorkspace.designation.title
      : sysAccessUpper === 'OWNER'
      ? 'Owner'
      : sysAccessUpper === 'ADMIN'
      ? 'Admin'
      : 'Staff Member';

  const workspaceLocations: any[] = Array.isArray(activeWorkspace?.workspace?.settings?.locations)
    ? activeWorkspace.workspace.settings.locations
    : [];

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <User className="h-3.5 w-3.5" />
          <span>Member Onboarding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Complete Your Profile Setup
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Review the workspace role and department assigned to you and personalize your profile details before heading into your work hub.
        </p>
      </div>

      {/* Read-only Organization Placement Summary */}
      {activeWorkspace && (
        <Card className="border-border bg-muted/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
                  {activeWorkspace.workspace?.name?.charAt(0)?.toUpperCase() || 'O'}
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>{activeWorkspace.workspace?.name || 'Workspace'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    <span>{profile?.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="text-[11px] gap-1">
                  <Shield className="h-3 w-3" />
                  {displayRoleLabel}
                </Badge>
                {activeWorkspace.designation?.title &&
                  activeWorkspace.designation.title !== displayRoleLabel && (
                    <Badge variant="outline" className="text-[11px]">
                      {activeWorkspace.designation.title}
                    </Badge>
                  )}
                {activeWorkspace.department?.name && (
                  <Badge variant="secondary" className="text-[11px]">
                    Dept: {activeWorkspace.department.name}
                  </Badge>
                )}
                {activeWorkspace.team?.name && (
                  <Badge variant="outline" className="text-[11px] gap-1">
                    <Users className="h-3 w-3" />
                    {activeWorkspace.team.name}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editable Profile Form */}
      <Card className="border-border shadow-md">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-lg font-bold">Personal &amp; Contact Information</CardTitle>
          <CardDescription className="text-xs">
            Your name, photo, and phone number make it easy for teammates to identify and reach you.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Avatar Upload */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative">
              <UserAvatar
                avatarUrl={avatarUrl}
                firstName={firstName}
                lastName={lastName}
                seed={profile?.id || profile?.email}
                size="xl"
                className="ring-4 ring-background shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload profile picture"
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h4 className="text-xs font-semibold text-foreground">
                Profile Picture <span className="text-muted-foreground font-normal">(Optional)</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Upload a JPG, PNG, or WebP photo (max 5MB), or keep your auto-generated initials avatar.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="h-8 text-xs gap-1.5"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAvatarUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="h-8 text-xs text-destructive gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                First Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Last Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Work Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  list="workspace-locations-list"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  placeholder="Headquarters / Remote"
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {workspaceLocations.length > 0 && (
                  <datalist id="workspace-locations-list">
                    {workspaceLocations.map((loc: any, i: number) => (
                      <option
                        key={i}
                        value={`${loc.name}${loc.city ? ` - ${loc.city}` : ''}`}
                      />
                    ))}
                    <option value="Remote" />
                  </datalist>
                )}
              </div>
            </div>
          </div>

          {/* Read-only Email & Reporting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Work Email (Organization Managed)
              </div>
              <div className="text-xs font-mono text-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
                {profile?.email}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Access Scope
              </div>
              <div className="text-xs text-foreground bg-muted/40 border border-border rounded-md px-3 py-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>{activeWorkspace?.dataScope || 'ASSIGNED'}</span>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Requested bottom buttons: Skip for later | Save | Continue */}
        <CardFooter className="border-t border-border/60 pt-4 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={handleSkipForLater}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip for later
          </Button>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => persistProfile(false, false)}
              className="text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => persistProfile(true, true)}
              className="text-xs font-semibold gap-1.5 px-5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
