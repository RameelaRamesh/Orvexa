'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSubmitted(true);
      if (data.data?.resetToken) {
        setDevResetToken(data.data.resetToken);
      }
      toast.success(data.message || 'Password reset link sent');
    } catch (err: any) {
      toast.error(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your registered work email address to receive password reset instructions.
          </CardDescription>
        </CardHeader>
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Work Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending Request...' : 'Send Password Reset Link'}
              </Button>
              <Link href="/login" className="text-xs text-primary hover:underline text-center">
                Back to Sign In
              </Link>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4 pt-2 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              If an account with email <span className="font-semibold text-foreground">{email}</span> exists, we have sent a password reset link to your inbox.
            </p>

            {devResetToken && (
              <div className="p-3 bg-muted rounded-md text-left text-xs space-y-1">
                <span className="font-semibold text-foreground block">Development Link:</span>
                <Link
                  href={`/reset-password?token=${devResetToken}`}
                  className="text-primary underline font-mono text-[11px] break-all"
                >
                  Click here to Reset Password
                </Link>
              </div>
            )}

            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs">
                  Return to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
