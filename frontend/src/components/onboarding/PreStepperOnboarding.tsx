'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import { WelcomeRunningDog } from './WelcomeRunningDog';
import {
  INDUSTRIES_CATALOG as FALLBACK_INDUSTRIES,
  ORG_SIZE_BRACKETS as FALLBACK_ORG_SIZE_BRACKETS,
  getLocalRecommendedSetup,
} from '@/lib/onboarding-recommendations';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  GraduationCap,
  HardHat,
  Headset,
  HeartPulse,
  Landmark,
  Layers,
  Loader2,
  Megaphone,
  Shield,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';

export type PreStepperStage =
  | 'welcome'
  | 'industries_size'
  | 'recommended_modules'
  | 'org_structure_choice';

interface PreStepperOnboardingProps {
  workspaceName?: string;
  initialStage?: PreStepperStage;
  initialIndustries?: string[];
  initialOrgSize?: string;
  initialEnabledModules?: string[];
  initialFeatureToggles?: Record<string, string[]>;
  onEnterStepper: (updatedStatus?: any) => void;
  onSkipToDashboard: (updatedStatus?: any) => void;
}

const INDUSTRY_ICON_MAP: Record<string, any> = {
  Code2,
  Headset,
  Megaphone,
  Landmark,
  HeartPulse,
  ShoppingBag,
  Truck,
  GraduationCap,
  HardHat,
  Briefcase,
};

export function PreStepperOnboarding({
  workspaceName,
  initialStage = 'welcome',
  initialIndustries = [],
  initialOrgSize = '0-10',
  initialEnabledModules = [],
  initialFeatureToggles = {},
  onEnterStepper,
  onSkipToDashboard,
}: PreStepperOnboardingProps) {
  const [stage, setStage] = useState<PreStepperStage>(initialStage);
  const [saving, setSaving] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Stage 2: Industries & 8 Employee Brackets
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(
    initialIndustries.length > 0 ? initialIndustries : ['IT_SOFTWARE'],
  );
  const [selectedOrgSize, setSelectedOrgSize] = useState<string>(initialOrgSize || '0-10');

  // Recommendations catalog hydrated from backend
  const [recommendations, setRecommendations] = useState<any>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>(initialEnabledModules);
  const [featureToggles, setFeatureToggles] = useState<Record<string, string[]>>(initialFeatureToggles);
  const [selectedStarterRoleKeys, setSelectedStarterRoleKeys] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(wsId && wsId !== 'undefined' ? { 'x-workspace-id': wsId } : {}),
    };
  };

  const applyRecommendationsPayload = (payload: any, applyDefaults: boolean) => {
    setRecommendations(payload);
    if (applyDefaults || enabledModules.length === 0) {
      const recMods: string[] = Array.isArray(payload?.recommendedModules) ? payload.recommendedModules : [];
      setEnabledModules(recMods);
      if (payload?.recommendedFeatureToggles && typeof payload.recommendedFeatureToggles === 'object') {
        setFeatureToggles(payload.recommendedFeatureToggles);
      }
    }
    if (Array.isArray(payload?.starterRoleTemplates)) {
      setSelectedStarterRoleKeys(payload.starterRoleTemplates.map((r: any) => r.key));
    }
    return payload;
  };

  const fetchRecommendations = async (industries: string[], orgSize: string, applyDefaults: boolean) => {
    setLoadingRecs(true);
    try {
      const qs = new URLSearchParams();
      if (industries.length > 0) qs.set('industries', industries.join(','));
      if (orgSize) qs.set('orgSize', orgSize);

      const res = await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/recommendations?${qs.toString()}`, {
        headers: getHeaders(),
      });
      const raw = await res.json().catch(() => null);
      if (res.ok && raw) {
        const payload = raw?.data !== undefined ? raw.data : raw;
        if (Array.isArray(payload?.allModulesCatalog) && payload.allModulesCatalog.length > 0) {
          return applyRecommendationsPayload(payload, applyDefaults);
        }
      }
    } catch {
      // Network/CORS/cold-start fallback handled seamlessly below
    } finally {
      setLoadingRecs(false);
    }

    const fallbackPayload = getLocalRecommendedSetup(industries, orgSize);
    return applyRecommendationsPayload(fallbackPayload, applyDefaults);
  };

  useEffect(() => {
    if (stage === 'industries_size' && !recommendations) {
      fetchRecommendations(selectedIndustries, selectedOrgSize, enabledModules.length === 0);
    } else if (stage === 'recommended_modules' && !recommendations) {
      fetchRecommendations(selectedIndustries, selectedOrgSize, enabledModules.length === 0);
    }
  }, [stage]);

  const savePreStepperStep = async (step: string, data: any) => {
    setSaving(true);
    try {
      const res = await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/step`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ step, data, markCompleted: false }),
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(raw?.message || 'Failed to save progress');
      let updated = raw?.data !== undefined ? raw.data : raw;

      // Compatibility fallback if API instance hasn't persisted recommended_modules fields yet
      if (step === 'recommended_modules' && !Array.isArray(updated?.enabledModules) && Array.isArray(data?.enabledModules)) {
        try {
          await fetch(`${BRANDING.apiUrl}/workspaces/settings`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
              settings: {
                enabledModules: data.enabledModules,
                moduleFeatureToggles: data.moduleFeatureToggles || {},
              },
            }),
          });
          updated = {
            ...(updated || {}),
            enabledModules: data.enabledModules,
            moduleFeatureToggles: data.moduleFeatureToggles || {},
          };
        } catch {}
      }

      // Keep cached workspace enabledModules aligned when changed
      const syncedModules = Array.isArray(updated?.enabledModules)
        ? updated.enabledModules
        : step === 'recommended_modules' && Array.isArray(data?.enabledModules)
        ? data.enabledModules
        : null;
      if (Array.isArray(syncedModules)) {
        try {
          const cached = localStorage.getItem('orvexa_cached_workspace');
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.workspace = {
              ...(parsed.workspace || {}),
              settings: {
                ...(parsed.workspace?.settings || {}),
                enabledModules: syncedModules,
                moduleFeatureToggles: updated?.moduleFeatureToggles || data?.moduleFeatureToggles || {},
              },
            };
            localStorage.setItem('orvexa_cached_workspace', JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent('workspace-updated', { detail: { enabledModules: syncedModules } }));
          }
        } catch {}
      }

      return updated;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save setup progress');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleWelcomeContinue = async () => {
    try {
      await savePreStepperStep('welcome', { welcomeDone: true });
    } catch {
      // Allow forward navigation cleanly even if offline hiccup
    }
    setStage('industries_size');
  };

  const handleIndustriesSizeContinue = async () => {
    if (selectedIndustries.length === 0) {
      toast.error('Please select at least one industry your organization serves.');
      return;
    }
    try {
      await savePreStepperStep('industries_size', {
        industries: selectedIndustries,
        orgSize: selectedOrgSize,
      });
      await fetchRecommendations(selectedIndustries, selectedOrgSize, true);
      setStage('recommended_modules');
    } catch {
      // Handled via toast
    }
  };

  const handleModulesContinue = async () => {
    if (enabledModules.length === 0) {
      toast.error('Keep at least one module enabled to proceed.');
      return;
    }

    const chosenStarterRoles = starterRoleTemplates
      .filter((t) => selectedStarterRoleKeys.includes(t.key))
      .map((t) => ({
        name: t.name,
        description: t.description,
        dataScope: t.dataScope,
        permissionCodes: t.permissionCodes,
      }));

    try {
      await savePreStepperStep('recommended_modules', {
        enabledModules,
        moduleFeatureToggles: featureToggles,
        starterRoles: chosenStarterRoles,
      });
      setStage('org_structure_choice');
    } catch {
      // Handled via toast
    }
  };

  const handleOrgChoice = async (choice: 'setup_now' | 'skip_later') => {
    try {
      const updated = await savePreStepperStep('org_structure_choice', { choice });
      if (choice === 'setup_now') {
        onEnterStepper(updated);
      } else {
        onSkipToDashboard(updated);
      }
    } catch {
      // Handled via toast
    }
  };

  const toggleIndustry = (key: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((i) => i !== key) : prev) : [...prev, key],
    );
  };

  const toggleModule = (modKey: string, modFeatures: any[]) => {
    setEnabledModules((prev) => {
      const exists = prev.includes(modKey);
      if (exists) {
        return prev.filter((k) => k !== modKey);
      }
      // Re-enable recommended feature toggles if currently empty
      setFeatureToggles((ftPrev) => {
        if (Array.isArray(ftPrev[modKey]) && ftPrev[modKey].length > 0) return ftPrev;
        return {
          ...ftPrev,
          [modKey]: modFeatures.filter((f: any) => f.recommended !== false).map((f: any) => f.code),
        };
      });
      return [...prev, modKey];
    });
  };

  const toggleFeatureCode = (modKey: string, code: string) => {
    setFeatureToggles((prev) => {
      const current = Array.isArray(prev[modKey]) ? prev[modKey] : [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      return { ...prev, [modKey]: next };
    });
    if (!enabledModules.includes(modKey)) {
      setEnabledModules((prev) => [...prev, modKey]);
    }
  };

  const fallbackCatalogData = useMemo(
    () => getLocalRecommendedSetup(selectedIndustries, selectedOrgSize),
    [selectedIndustries, selectedOrgSize],
  );

  const industriesCatalog = recommendations?.industriesCatalog || FALLBACK_INDUSTRIES;
  const orgSizeBrackets = recommendations?.orgSizeBrackets || FALLBACK_ORG_SIZE_BRACKETS;
  const allModulesCatalog: any[] =
    Array.isArray(recommendations?.allModulesCatalog) && recommendations.allModulesCatalog.length > 0
      ? recommendations.allModulesCatalog
      : fallbackCatalogData.allModulesCatalog;
  const starterRoleTemplates: any[] =
    Array.isArray(recommendations?.starterRoleTemplates) && recommendations.starterRoleTemplates.length > 0
      ? recommendations.starterRoleTemplates
      : fallbackCatalogData.starterRoleTemplates;

  const groupedModules = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const mod of allModulesCatalog) {
      const cat = mod.category || 'Workspace Modules';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(mod);
    }
    return groups;
  }, [allModulesCatalog]);

  if (stage === 'welcome') {
    return (
      <WelcomeRunningDog
        workspaceName={workspaceName}
        onContinue={handleWelcomeContinue}
        saving={saving}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/[0.03] py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Clean Top Progress Indicator (Pre-Stepper — outside main stepper tabs) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-base shadow-xs">
              {workspaceName?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                <span>Tailored Workspace Setup</span>
              </div>
              <h1 className="text-lg font-bold text-foreground">
                {workspaceName || BRANDING.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {[
              { id: 'industries_size', label: '1. Industry & Team Size' },
              { id: 'recommended_modules', label: '2. Modules & Roles' },
              { id: 'org_structure_choice', label: '3. Org Structure' },
            ].map((item, idx) => {
              const active = stage === item.id;
              const order = ['industries_size', 'recommended_modules', 'org_structure_choice'];
              const done = order.indexOf(stage) > idx;
              return (
                <div
                  key={item.id}
                  className={`px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : done
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-border/70 bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {done ? '✓ ' : ''}
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* PRE-STEPPER SCREEN 2: Industries Served & 8 Employee Count Options */}
        {stage === 'industries_size' && (
          <Card className="border-border shadow-md animate-in fade-in duration-200">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-xl font-bold text-foreground">
                Tell us about your organization
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Select one or more industries you serve and your current headcount. We&apos;ll pre-configure recommended modules and permissions next.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-7">
              {/* Industries Multi-Select */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>What industries do you serve?</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedIndustries.length} selected (multi-select)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {industriesCatalog.map((ind: any) => {
                    const selected = selectedIndustries.includes(ind.key);
                    const IconComp = INDUSTRY_ICON_MAP[ind.icon] || Briefcase;
                    return (
                      <button
                        key={ind.key}
                        type="button"
                        onClick={() => toggleIndustry(ind.key)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-primary bg-primary/[0.06] ring-1 ring-primary/30 shadow-2xs'
                            : 'border-border bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div
                          className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                            selected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <IconComp className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                              {ind.label}
                            </span>
                            {selected && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {ind.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number of Employees — Exact 8 Brackets ending with Above 1,000 */}
              <div className="space-y-3 pt-4 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Number of Employees</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">Select one bracket</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {orgSizeBrackets.map((b: any) => {
                    const active = selectedOrgSize === b.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setSelectedOrgSize(b.key)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'border-primary bg-primary/[0.08] ring-1 ring-primary/40 shadow-2xs'
                            : 'border-border bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">{b.label}</span>
                          {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                          {b.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border/60 pt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStage('welcome')}
                className="text-xs gap-1.5 text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                type="button"
                size="default"
                disabled={saving || loadingRecs}
                onClick={handleIndustriesSizeContinue}
                className="text-xs sm:text-sm font-semibold gap-2 px-6"
              >
                {saving || loadingRecs ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing Recommendations...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* PRE-STEPPER SCREEN 3: Recommended Modules, Features & Starter Staff Roles */}
        {stage === 'recommended_modules' && (
          <Card className="border-border shadow-md animate-in fade-in duration-200">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <span>Recommended Modules &amp; Permissions</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {enabledModules.length} enabled
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Recommended features are pre-checked for your organization. Check or uncheck any module or permission freely — access stays completely independent of your org chart.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {loadingRecs && allModulesCatalog.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-xs">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading tailored modules...</span>
                </div>
              ) : (
                <>
                  {Object.entries(groupedModules).map(([category, mods]) => (
                    <div key={category} className="space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mods.map((mod: any) => {
                          const isChecked = enabledModules.includes(mod.key);
                          const isExpanded = Boolean(expandedModules[mod.key]);
                          const selectedFeatCodes = Array.isArray(featureToggles[mod.key])
                            ? featureToggles[mod.key]
                            : mod.features
                                .filter((f: any) => f.recommended !== false)
                                .map((f: any) => f.code);

                          return (
                            <div
                              key={mod.key}
                              className={`rounded-xl border transition-all ${
                                isChecked
                                  ? 'border-primary/45 bg-primary/[0.03]'
                                  : 'border-border bg-card opacity-80'
                              }`}
                            >
                              <div className="p-3.5 flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleModule(mod.key, mod.features || [])}
                                  className="mt-1 h-4 w-4 rounded border-input accent-primary cursor-pointer shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                      <span className="text-sm font-semibold text-foreground">
                                        {mod.label}
                                      </span>
                                      {mod.recommended && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1.5 py-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        >
                                          Recommended
                                        </Badge>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedModules((prev) => ({
                                          ...prev,
                                          [mod.key]: !prev[mod.key],
                                        }))
                                      }
                                      className="text-[11px] text-primary hover:underline flex items-center gap-0.5 shrink-0"
                                    >
                                      <span>Features ({selectedFeatCodes.length}/{mod.features?.length || 0})</span>
                                      {isExpanded ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {mod.description}
                                  </p>
                                </div>
                              </div>

                              {isExpanded && Array.isArray(mod.features) && mod.features.length > 0 && (
                                <div className="px-4 pb-3.5 pt-2 border-t border-border/50 space-y-1.5 bg-background/60 rounded-b-xl">
                                  {mod.features.map((feat: any) => {
                                    const featActive = isChecked && selectedFeatCodes.includes(feat.code);
                                    return (
                                      <label
                                        key={feat.code}
                                        className="flex items-start gap-2.5 py-1 cursor-pointer select-none"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={featActive}
                                          onChange={() => toggleFeatureCode(mod.key, feat.code)}
                                          className="mt-0.5 h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
                                        />
                                        <div className="min-w-0">
                                          <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                            <span>{feat.label}</span>
                                            <span className="text-[10px] font-mono text-muted-foreground">
                                              {feat.code}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-muted-foreground">
                                            {feat.description}
                                          </p>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Starter Staff Roles Preview & Opt-in */}
                  {starterRoleTemplates.length > 0 && (
                    <div className="pt-4 border-t border-border/80 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-primary" />
                            <span>Recommended Starter Staff Roles</span>
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Only <strong>Owner</strong> and <strong>Admin</strong> exist as system roles. Create customizable working roles below (you can adjust permissions anytime).
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {starterRoleTemplates.map((tpl: any) => {
                          const active = selectedStarterRoleKeys.includes(tpl.key);
                          return (
                            <label
                              key={tpl.key}
                              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                active
                                  ? 'border-primary/45 bg-primary/[0.04]'
                                  : 'border-border bg-card opacity-75'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() =>
                                  setSelectedStarterRoleKeys((prev) =>
                                    prev.includes(tpl.key)
                                      ? prev.filter((k) => k !== tpl.key)
                                      : [...prev, tpl.key],
                                  )
                                }
                                className="mt-1 h-4 w-4 rounded border-input accent-primary cursor-pointer shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-xs font-bold text-foreground">
                                    {tpl.name}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] font-mono">
                                    Scope: {tpl.dataScope}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                  {tpl.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>

            <CardFooter className="border-t border-border/60 pt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStage('industries_size')}
                className="text-xs gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                type="button"
                size="default"
                disabled={saving}
                onClick={handleModulesContinue}
                className="text-xs sm:text-sm font-semibold gap-2 px-6"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Modules...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* PRE-STEPPER SCREEN 4: Set up Org Structure Now OR Skip for Later */}
        {stage === 'org_structure_choice' && (
          <Card className="border-border shadow-md animate-in fade-in duration-200">
            <CardHeader className="text-center space-y-2 pb-4 border-b border-border/60">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">
                Your Modules &amp; Starter Permissions are Ready!
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                Would you like to set up your organization structure (work schedules, locations, departments, custom staff roles, and Gmail/link invitations) now, or jump straight into your workspace and configure it later?
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col justify-between p-5 rounded-xl border-2 border-primary/50 bg-primary/[0.04] space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                    Recommended
                  </div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Set up Org Structure Now</span>
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Walk through the clean step-by-step setup: Work Schedule, Holidays, Office Locations, Departments &amp; Teams, Staff Roles &amp; Permissions, and Invite Team Members via Gmail or shareable invite link.
                  </p>
                </div>
                <Button
                  type="button"
                  size="default"
                  disabled={saving}
                  onClick={() => handleOrgChoice('setup_now')}
                  className="w-full font-semibold gap-2"
                >
                  <span>Start Organization Setup</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col justify-between p-5 rounded-xl border border-border bg-card space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                    Flexible
                  </div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span>Skip for Later</span>
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Go straight to your workspace dashboard now. You can open Settings → Roles, Departments, or Setup Wizard anytime whenever your team grows.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  disabled={saving}
                  onClick={() => handleOrgChoice('skip_later')}
                  className="w-full font-semibold"
                >
                  Skip for Later &amp; Open Workspace
                </Button>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border/60 pt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStage('recommended_modules')}
                className="text-xs gap-1.5 text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Modules
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
