'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck, UserCheck } from 'lucide-react';
import Link from 'next/link';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token. Please check your invitation email link.');
      setVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${BRANDING.apiUrl}/people/invitations/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Invitation verification failed');
        }

        const payload = data.data !== undefined ? data.data : data;
        setInvitationData(payload);
        if (payload.invitation) {
          setFirstName(payload.invitation.firstName || '');
          setLastName(payload.invitation.lastName || '');
        }
      } catch (err: any) {
        setError(err.message || 'Invitation is invalid, expired, or has already been used.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!invitationData?.userExists) {
      if (!password || password.length < 8) {
        toast.error('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
    }

    setAccepting(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/people/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: password || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to accept invitation');

      const payload = data.data !== undefined ? data.data : data;

      if (payload.accessToken) {
        localStorage.setItem('accessToken', payload.accessToken);
      }
      if (payload.workspace?.id) {
        localStorage.setItem('activeWorkspaceId', payload.workspace.id);
      }

      toast.success('Invitation accepted! Welcome to ' + (payload.workspace?.name || 'the workspace'));
      router.push('/app/home');
    } catch (err: any) {
      toast.error(err.message || 'Error accepting invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Verifying invitation security token...</p>
        </div>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border shadow-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-1">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Invitation Not Accessible</CardTitle>
            <CardDescription className="text-xs leading-relaxed text-muted-foreground">
              {error || 'This invitation link is invalid, has expired, or was revoked by the workspace administrator.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2 pt-2">
            <Link href="/login" className="w-full">
              <Button variant="default" className="w-full">
                Go to Sign In
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const { invitation, userExists } = invitationData;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md border-border shadow-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg mb-1">
            {invitation.workspace?.name?.charAt(0) || 'O'}
          </div>
          <CardTitle className="text-2xl font-bold">Join {invitation.workspace?.name}</CardTitle>
          <CardDescription className="text-xs">
            You've been invited by <span className="font-semibold text-foreground">{invitation.invitedBy?.firstName} {invitation.invitedBy?.lastName}</span> to join as <Badge variant="secondary" className="ml-1 text-[10px]">{invitation.accessRole}</Badge>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleAccept}>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
              <div className="text-muted-foreground">Invited Email:</div>
              <div className="font-semibold text-foreground font-mono">{invitation.email}</div>
            </div>

            {!userExists ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Set Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs flex items-center gap-2.5 text-emerald-500">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>You already have an existing ORVEXA account with this email. Click below to connect this workspace.</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full" disabled={accepting}>
              {accepting ? 'Activating Membership...' : userExists ? 'Accept & Join Workspace' : 'Activate Account & Join'}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Already have another account? <Link href="/login" className="text-primary hover:underline">Sign In</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
