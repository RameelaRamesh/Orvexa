'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import { ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Two-Step Authentication state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const payload = data.data !== undefined ? data.data : data;

      // Check if Second Factor is required
      if (payload.mfaRequired) {
        setMfaToken(payload.mfaToken);
        setMfaRequired(true);
        toast.info('Two-step verification code required');
        return;
      }

      const token = payload.accessToken;
      const memberships = payload.memberships;

      if (token) {
        localStorage.setItem('accessToken', token);
      }
      if (memberships && memberships.length > 0) {
        localStorage.setItem('activeWorkspaceId', memberships[0].workspaceId);
      }

      toast.success('Welcome back to ' + BRANDING.name);
      router.push('/app/home');
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);

    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/mfa/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaToken,
          code: !useRecovery ? mfaCode.trim() : undefined,
          recoveryCode: useRecovery ? recoveryCode.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      const payload = data.data !== undefined ? data.data : data;
      const token = payload.accessToken;
      const memberships = payload.memberships;

      if (token) {
        localStorage.setItem('accessToken', token);
      }
      if (memberships && memberships.length > 0) {
        localStorage.setItem('activeWorkspaceId', memberships[0].workspaceId);
      }

      toast.success('Two-factor verification successful! Welcome back.');
      router.push('/app/home');
    } catch (err: any) {
      toast.error(err.message || 'Invalid code');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border shadow-md">
        {!mfaRequired ? (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg mb-2">
                O
              </div>
              <CardTitle className="text-2xl font-bold">Sign in to {BRANDING.name}</CardTitle>
              <CardDescription>Enter your work email and password to access your workspace</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Work Email <span className="text-destructive font-semibold ml-0.5">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Password <span className="text-destructive font-semibold ml-0.5">*</span>
                    </label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Sign In'}
                </Button>
                <div className="text-center text-xs text-muted-foreground">
                  Don't have a workspace yet?{' '}
                  <Link href="/register" className="text-primary font-medium hover:underline">
                    Create one now
                  </Link>
                </div>
              </CardFooter>
            </form>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg mb-2">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold">Two-Step Verification</CardTitle>
              <CardDescription>
                {!useRecovery
                  ? 'Enter the 6-digit authentication code from your authenticator app.'
                  : 'Enter one of your emergency single-use recovery codes.'}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleMfaVerify}>
              <CardContent className="space-y-4 pt-2">
                {!useRecovery ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-2xl tracking-[0.5em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Single-Use Recovery Code
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="XXXX-XXXX"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecovery(!useRecovery);
                      setMfaCode('');
                      setRecoveryCode('');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {!useRecovery
                      ? 'Lost device? Use emergency recovery code'
                      : 'Back to authenticator app code'}
                  </button>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3 pt-2">
                <Button type="submit" className="w-full" disabled={mfaLoading}>
                  {mfaLoading ? 'Verifying...' : 'Verify & Continue'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setMfaRequired(false);
                    setMfaCode('');
                    setRecoveryCode('');
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to email & password
                </button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
