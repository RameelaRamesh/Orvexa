'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import {
  User,
  Upload,
  Camera,
  Trash2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  Phone,
  Briefcase,
  MapPin,
  Clock,
} from 'lucide-react';

export default function PersonalDetailsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('Founder & CEO');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Immediately redirect to internal tab inside the app
  useEffect(() => {
    router.replace('/app/settings?tab=personal');
  }, [router]);

  // Pre-fill from registration cache if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem('user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.firstName) setFirstName(parsed.firstName);
        if (parsed.lastName) setLastName(parsed.lastName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.location) setLocation(parsed.location);
      }

      const existingAvatar = localStorage.getItem('orvexa_user_avatar');
      if (existingAvatar) {
        setAvatarPreview(existingAvatar);
      }
    } catch {}
  }, []);

  // Compress image to max 256x256 to ensure instant rendering and no storage quota issues
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(objectUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressed);
      };
      img.onerror = (err) => reject(err);
      img.src = objectUrl;
    });
  };

  // Handle image upload (not mandatory)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be less than 8MB.');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file);
      setAvatarPreview(compressedDataUrl);
      try {
        localStorage.setItem('orvexa_user_avatar', compressedDataUrl);
      } catch {}
      window.dispatchEvent(new CustomEvent('orvexa_avatar_updated', { detail: compressedDataUrl }));
      toast.success('Profile photo uploaded.');
    } catch {
      toast.error('Could not process photo. Please try a different image.');
    }
  };

  const handleRemoveImage = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    try {
      localStorage.removeItem('orvexa_user_avatar');
    } catch {}
    window.dispatchEvent(new CustomEvent('orvexa_avatar_updated', { detail: null }));
    toast.info('Profile photo removed.');
  };

  // Skip action: "I will do it later" (goes directly inside the web dashboard)
  const handleSkip = () => {
    toast.info('You can complete your personal details anytime in Settings.');
    router.push('/app/home');
  };

  // Submit action: Save & Continue (goes directly inside the web dashboard)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const wsId = localStorage.getItem('activeWorkspaceId');

      // Save avatar to localStorage so topbar & sidebar avatars immediately render it
      if (avatarPreview) {
        try {
          localStorage.setItem('orvexa_user_avatar', avatarPreview);
        } catch {}
        window.dispatchEvent(new CustomEvent('orvexa_avatar_updated', { detail: avatarPreview }));
      }

      // Update cached user object
      const updatedUser = {
        firstName: firstName.trim() || 'User',
        lastName: lastName.trim(),
        email: email.trim(),
        jobTitle: jobTitle.trim(),
        phone: phone.trim(),
        location: location.trim(),
        bio: bio.trim(),
        avatar: avatarPreview || undefined,
        avatarUrl: avatarPreview || undefined,
        role: 'OWNER',
      };
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch {}

      // Update orvexa_cached_profile so layout.tsx immediately reflects photo & name
      try {
        const rawCached = localStorage.getItem('orvexa_cached_profile');
        const prev = rawCached ? JSON.parse(rawCached) : {};
        const merged = {
          ...prev,
          firstName: firstName.trim() || prev.firstName || 'User',
          lastName: lastName.trim() || prev.lastName || '',
          email: email.trim() || prev.email || '',
          avatarUrl: avatarPreview || prev.avatarUrl || null,
          avatar: avatarPreview || prev.avatar || null,
          jobTitle: jobTitle.trim(),
          phone: phone.trim(),
          location: location.trim(),
        };
        localStorage.setItem('orvexa_cached_profile', JSON.stringify(merged));
      } catch {}

      // Synchronize with backend profile
      if (token) {
        try {
          await fetch(`${BRANDING.apiUrl}/auth/me`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              ...(wsId ? { 'x-workspace-id': wsId } : {}),
            },
            body: JSON.stringify({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim(),
              avatarUrl: avatarPreview || undefined,
            }),
          }).catch(() => null);
        } catch {}
      }

      // Automatically pre-seed onboarding office location if city/location was entered
      if (token && wsId && location.trim()) {
        const cleanCity = location.trim().replace(/,\s*India/i, '').trim();
        if (cleanCity) {
          try {
            localStorage.setItem('orvexa_user_location', cleanCity);
            await fetch(`${BRANDING.apiUrl}/workspaces/onboarding/step`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'x-workspace-id': wsId,
              },
              body: JSON.stringify({
                step: 'locations',
                data: {
                  locations: [
                    {
                      name: 'Headquarters',
                      city: cleanCity,
                      country: 'India',
                      isPrimary: true,
                    },
                  ],
                },
                markCompleted: false,
              }),
            }).catch(() => null);
          } catch {}
        }
      }

      toast.success('Personal profile saved successfully!');
      router.push('/app/home');
    } catch (err: any) {
      toast.error(err.message || 'Error saving personal details');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const f = firstName.trim().charAt(0).toUpperCase();
    const l = lastName.trim().charAt(0).toUpperCase();
    return f || l ? `${f}${l}` : 'U';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:py-12">
      <Card className="w-full max-w-xl border-border shadow-xl">
        {/* Header with "I will do it later" in the right corner */}
        <div className="border-b border-border/80 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-base shadow-sm">
                O
              </div>
              <span className="font-bold text-sm tracking-tight text-foreground">{BRANDING.name} Platform</span>
            </div>

            {/* Top Right Corner: "I will do it later" */}
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer py-1 px-2 rounded-md hover:bg-muted/60"
            >
              <span>I will do it later</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Personal Details
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Add your personal information and photo so your team recognizes you in the directory.
            </CardDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pt-6">
            {/* Upload Image Section (Not Mandatory) */}
            <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Profile Photo
                  </span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                    Not mandatory
                  </Badge>
                </div>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-[11px] text-destructive hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Avatar Preview */}
                <div className="relative group shrink-0">
                  <div className="h-20 w-20 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center shadow-xs">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <span className="text-lg font-bold text-foreground/80">{getInitials()}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                    aria-label="Upload photo"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </div>

                {/* Upload Action & Notes */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold gap-1.5 h-8 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {avatarPreview ? 'Change Photo' : 'Upload Image'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Optional. PNG, JPG or WEBP up to 5MB. You can always update or upload this later.
                  </p>
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  First Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Rahul"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Sharma"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Job Title & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Founder & CEO, Operations Lead"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Operating City / Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, India"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>

            {/* Short Bio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>About / Short Bio</span>
                <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A brief intro about your role in the organization..."
                className="w-full rounded-lg border border-input bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
              />
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border/80 pt-4 gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSkip}
              className="text-xs font-semibold cursor-pointer"
            >
              I will do it later
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="font-semibold shadow-sm text-xs gap-1.5 px-5 h-9 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  Save & Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}