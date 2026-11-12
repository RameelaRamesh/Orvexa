'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { BRANDING } from '@/config/branding';

interface WelcomeRunningDogProps {
  workspaceName?: string;
  onContinue: () => void;
  saving?: boolean;
}

export function WelcomeRunningDog({
  workspaceName,
  onContinue,
  saving = false,
}: WelcomeRunningDogProps) {
  const [phase, setPhase] = useState<'warming' | 'ready'>('warming');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('ready');
    }, 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 sm:p-10 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Welcome to {BRANDING.name}</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {workspaceName ? `Setting up ${workspaceName}` : 'Welcome aboard!'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Your Owner account & workspace foundation are ready. Next, we&apos;ll tailor modules, workflows, and starter permissions to match your organization.
            </p>
          </div>

          {/* Animated Running Dog Track */}
          <div className="relative mx-auto max-w-md rounded-2xl border border-border/80 bg-muted/25 px-6 pt-8 pb-5 overflow-hidden">
            {/* Soft speed lines & paw prints */}
            <div className="relative h-28 flex items-center justify-center overflow-hidden">
              <div className="dog-runner-track relative w-full h-24 flex items-center justify-center">
                {/* Ground track */}
                <div className="absolute bottom-2 inset-x-4 h-1 rounded-full bg-border/80 overflow-hidden">
                  <div className="dog-ground-dash h-full w-1/3 bg-primary/50 rounded-full" />
                </div>

                {/* Running Corgi/Pup SVG with CSS gallop motion */}
                <div className="dog-gallop relative">
                  <svg
                    viewBox="0 0 180 100"
                    className="w-40 h-24 drop-shadow-sm"
                    aria-label="Running dog welcome animation"
                  >
                    {/* Flowing Scarf / Cape */}
                    <path
                      d="M95 40 Q68 28 45 36 Q65 44 92 48 Z"
                      className="fill-primary/80"
                    />
                    {/* Wagging Tail */}
                    <path
                      d="M44 48 Q26 32 30 22 Q38 30 50 45 Z"
                      fill="#EA8C3A"
                      className="dog-tail origin-[46px_46px]"
                    />
                    {/* Back legs */}
                    <path
                      d="M55 62 L44 86 Q43 90 48 90 L53 86 L62 66 Z"
                      fill="#C66B20"
                      className="dog-leg-back origin-[58px_64px]"
                    />
                    <path
                      d="M110 62 L120 86 Q123 89 127 87 L123 64 Z"
                      fill="#C66B20"
                      className="dog-leg-front origin-[114px_64px]"
                    />
                    {/* Body */}
                    <ellipse cx="84" cy="54" rx="38" ry="18" fill="#F29F4B" />
                    <ellipse cx="86" cy="60" rx="28" ry="11" fill="#FFF7EB" />
                    {/* Front legs */}
                    <path
                      d="M66 64 L58 88 Q59 92 64 90 L74 66 Z"
                      fill="#F29F4B"
                      className="dog-leg-front origin-[68px_64px]"
                    />
                    <path
                      d="M104 62 L117 85 Q121 88 124 85 L112 60 Z"
                      fill="#F29F4B"
                      className="dog-leg-back origin-[106px_62px]"
                    />
                    {/* Collar */}
                    <rect x="103" y="38" width="12" height="16" rx="4" className="fill-primary" transform="rotate(-12 108 46)" />
                    <circle cx="114" cy="52" r="3" fill="#FACC15" />
                    {/* Head */}
                    <circle cx="122" cy="36" r="17" fill="#F29F4B" />
                    {/* Floppy Ear */}
                    <path
                      d="M110 25 Q98 20 96 34 Q104 38 113 31 Z"
                      fill="#C66B20"
                      className="dog-ear origin-[111px_28px]"
                    />
                    {/* Snout & Muzzle */}
                    <ellipse cx="137" cy="40" rx="10" ry="7" fill="#FFF7EB" />
                    <ellipse cx="145" cy="37" rx="3.5" ry="2.5" fill="#1E293B" />
                    {/* Smile */}
                    <path d="M134 43 Q139 46 143 43" fill="none" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />
                    {/* Happy Eye */}
                    <circle cx="127" cy="33" r="2.6" fill="#0F172A" />
                    <circle cx="127.8" cy="32.2" r="0.9" fill="#FFFFFF" />
                    {/* Tongue */}
                    <path d="M138 44 Q140 50 143 45 Z" fill="#FB7185" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Progress / Status Line */}
            <div className="space-y-2 mt-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    phase === 'ready' ? 'w-full bg-emerald-500' : 'w-3/4 bg-primary animate-pulse'
                  }`}
                />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                {phase === 'ready' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Workspace initialized — ready to tailor your setup!
                    </span>
                  </>
                ) : (
                  <span>Preparing your workspace &amp; permissions engine...</span>
                )}
              </div>
            </div>
          </div>

          {/* Immediately clickable Continue button */}
          <div className="pt-2">
            <Button
              size="lg"
              onClick={onContinue}
              disabled={saving}
              className="w-full sm:w-auto min-w-[220px] font-semibold shadow-sm gap-2"
            >
              <span>{saving ? 'Loading Setup...' : 'Continue'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes dogBounce {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-7px) rotate(1.5deg); }
        }
        @keyframes legFront {
          0%, 100% { transform: rotate(-22deg); }
          50% { transform: rotate(24deg); }
        }
        @keyframes legBack {
          0%, 100% { transform: rotate(24deg); }
          50% { transform: rotate(-22deg); }
        }
        @keyframes tailWag {
          0%, 100% { transform: rotate(-14deg); }
          50% { transform: rotate(18deg); }
        }
        @keyframes earFlap {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(12deg); }
        }
        @keyframes groundSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .dog-gallop {
          animation: dogBounce 0.42s ease-in-out infinite;
        }
        .dog-leg-front {
          animation: legFront 0.42s ease-in-out infinite;
        }
        .dog-leg-back {
          animation: legBack 0.42s ease-in-out infinite;
        }
        .dog-tail {
          animation: tailWag 0.28s ease-in-out infinite;
        }
        .dog-ear {
          animation: earFlap 0.42s ease-in-out infinite;
        }
        .dog-ground-dash {
          animation: groundSlide 0.9s linear infinite;
        }
      `}</style>
    </div>
  );
}
