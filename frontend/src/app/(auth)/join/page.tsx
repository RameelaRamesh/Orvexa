'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import { AlertTriangle, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

function JoinWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  const [verifying, setVerifying] = useState(true);
  const [joinData, setJoinData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) {
      setError('Missing invite code in the workspace link.');
      setVerifying(false);
      return;
    }

    const verifyCode = async () => {
      try {
        const res = await fetch(
          `${BRANDING.apiUrl}/people/join-link/verify?code=${encodeURIComponent(code)}`,
        );
        const raw = await res.json();
        if (!res.ok) {
          throw new Error(raw?.message || 'Invite link verification failed');
        }
        const payload = raw?.data !== undefined ? raw.data : raw;
        setJoinData(payload);
      } catch (err: any) {
        setError(err?.message || 'This workspace invite link is invalid or disabled.');
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    if (!firstName.trim()) {
      toast.error('First name is required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid work email address.');
      return;
    }
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/join-link/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password,
        }),
      });
      const raw = await res.json();
      if (!res.ok) throw new Error(raw?.message || 'Failed to join workspace');
      const payload = raw?.data !== undefined ? raw.data : raw;

      if (payload.accessToken) {
        localStorage.setItem('accessToken', payload.accessToken);
      }
      if (payload.workspace?.id) {
        localStorage.setItem('activeWorkspaceId', payload.workspace.id);
      }
      if (payload.membership) {
        try {
          localStorage.setItem('orvexa_cached_workspace', JSON.stringify(payload.membership));
        } catch {}
      }
      if (payload.user) {
        try {
          localStorage.setItem('orvexa_cached_profile', JSON.stringify(payload.user));
        } catch {}
      }

      toast.success('Joined ' + (payload.workspace?.name || 'workspace') + '! Next, set up your profile.');
      router.push('/app/profile-setup');
    } catch (err: any) {
      toast.error(err?.message || 'Error joining workspace');
    } finally {
      setJoining(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Verifying workspace invite link...</p>
        </div>
      </div>
    );
  }

  if (error || !joinData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border shadow-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Invite Link Unavailable</CardTitle>
            <CardDescription className="text-xs leading-relaxed text-muted-foreground">
              {error || 'This shareable workspace invite link is invalid or has been revoked.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2 pt-2">
            <Link href="/login" className="w-full">
              <Button variant="default" className="w-full">
                Sign In Instead
              </Button>
            </Link>
            <Link href="/register" className="w-full">
              <Button variant="outline" className="w-full">
                Create Your Own Organization
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-2 border-b border-border/60 pb-4">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            {joinData.workspace?.name?.charAt(0)?.toUpperCase() || 'O'}
          </div>
          <CardTitle className="text-xl font-bold">
            Join {joinData.workspace?.name}
          </CardTitle>
          <CardDescription className="text-xs">
            Create your account via this workspace invite link to get started.
          </CardDescription>

          {(joinData.defaultRole?.name || joinData.defaultDepartment?.name || joinData.defaultTeam?.name) && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {joinData.defaultRole?.name && (
                <Badge variant="secondary" className="text-[10px]">
                  Role: {joinData.defaultRole.name}
                </Badge>
              )}
              {joinData.defaultDepartment?.name && (
                <Badge variant="outline" className="text-[10px]">
                  Dept: {joinData.defaultDepartment.name}
                </Badge>
              )}
              {joinData.defaultTeam?.name && (
                <Badge variant="outline" className="text-[10px]">
                  Team: {joinData.defaultTeam.name}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <form onSubmit={handleJoin}>
          <CardContent className="space-y-3.5 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Patel"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Work Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Password * (min 8 chars)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Confirm Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full font-semibold gap-2" disabled={joining}>
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining Workspace...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Join Workspace &amp; Set Up Profile
                </>
              )}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Already a member?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function JoinWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <JoinWorkspaceContent />
    </Suspense>
  );
}
