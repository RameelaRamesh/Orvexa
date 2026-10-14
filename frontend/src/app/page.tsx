import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { BRANDING } from '@/config/branding';
import {
  Layers,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Stethoscope,
  Briefcase,
  Code2,
  ChevronRight,
  Zap,
  BarChart3,
  Award,
} from 'lucide-react';

export default function MarketingLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
              O
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">{BRANDING.name}</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#solutions" className="transition-colors hover:text-foreground">
              Solutions
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-1.5 shadow-sm">
                Get Started
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <Badge variant="default" className="mb-6 py-1 px-3 text-xs gap-1.5 font-medium">
            <Zap className="h-3.5 w-3.5" /> Next-Gen SaaS Engine for Global Operations
          </Badge>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-6xl leading-[1.1]">
            Connect people. <span className="text-primary">Manage work.</span> Run operations.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Designed for modern operations, execution teams, and service enterprises. Decoupled, scalable, and strictly multi-tenant out of the box.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base shadow-md">
                Create Free Workspace
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Explore Platform Architecture
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto border border-border rounded-xl p-6 bg-card/50 backdrop-blur-sm">
            <div>
              <div className="text-3xl font-extrabold text-foreground">99.9%</div>
              <div className="text-xs text-muted-foreground mt-1">Tenant Data Isolation</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">&lt; 50ms</div>
              <div className="text-xs text-muted-foreground mt-1">API SLA Speed</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">100%</div>
              <div className="text-xs text-muted-foreground mt-1">Workflow Flexibility</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">SOC2</div>
              <div className="text-xs text-muted-foreground mt-1">Ready Architecture</div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions by Industry */}
      <section id="solutions" className="py-16 bg-surface-secondary/50 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Engineered for Scalable Business Operations
            </h2>
            <p className="mt-4 text-muted-foreground">
              ORVEXA decouples system roles from designations and workflows so every organization operates naturally without rigid constraints.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Building2 className="h-5 w-5" />
                </div>
                <CardTitle>Enterprise Operations</CardTitle>
                <CardDescription>
                  Queue-based work pipelines, processing stages, batch SLAs, and live operational presence tracking.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/60 hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle>Quality & Auditing</CardTitle>
                <CardDescription>
                  Operational review scorecards, weighted defect tracking, sampling criteria, and continuous audit loops.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/60 hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2">
                  <Code2 className="h-5 w-5" />
                </div>
                <CardTitle>Projects & Delivery</CardTitle>
                <CardDescription>
                  Milestone tracking, assigned tasks, sprint deliverables, time logging, and multi-tier approval gates.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/60 hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                  <Briefcase className="h-5 w-5" />
                </div>
                <CardTitle>Client Services & SLA</CardTitle>
                <CardDescription>
                  Client deliverables, strict SLA escalations, cross-functional approvals, and usage reporting.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3">Comprehensive Capabilities</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything Your Business Needs in One Screen
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Orthogonal People Architecture</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Separate system access roles (Owner, Admin, Manager, Member) from designations, departments, teams, and custom permission matrices.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Dual Work Engine</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Manage both traditional Projects & Tasks and high-volume Operations Work Queues (Batches, Units, High-volume Transactions) side-by-side.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Quality & SLA Escalation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reusable audit scorecards, defect tracking, warning thresholds, and automatic breach escalations to manager queues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-surface-secondary/50 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3">Transparent Plans</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Predictable Pricing for Growing Organizations
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Free */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription>For small teams getting started</CardDescription>
                <div className="mt-4 text-4xl font-extrabold text-foreground">₹0</div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Up to 5 Team Members</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 1 GB Cloud Storage</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Core Work: Tasks & Projects</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Basic Time Tracking</div>
                <Link href="/register" className="block pt-4">
                  <Button variant="outline" className="w-full">Start Free</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Starter */}
            <Card className="border-primary shadow-lg relative bg-card">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Starter Growth</CardTitle>
                <CardDescription>For growing operations teams</CardDescription>
                <div className="mt-4 text-4xl font-extrabold text-foreground">₹4,999 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Up to 25 Team Members</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 10 GB Cloud Storage</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Operations Work Queue Engine</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Attendance, Leave & Approvals</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Quality Audits & SLAs</div>
                <Link href="/register" className="block pt-4">
                  <Button className="w-full">Choose Starter</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Business */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">Business Pro</CardTitle>
                <CardDescription>For established enterprise operations</CardDescription>
                <div className="mt-4 text-4xl font-extrabold text-foreground">₹14,999 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Up to 100 Team Members</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 50 GB Cloud Storage</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Unrestricted Operational Modules</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Custom Roles & Permissions</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Priority SLAs & Dedicated Support</div>
                <Link href="/register" className="block pt-4">
                  <Button variant="outline" className="w-full">Get Business Pro</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground text-xs">O</div>
            {BRANDING.name} Platform
          </div>
          <div>© {new Date().getFullYear()} {BRANDING.name} Inc. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
