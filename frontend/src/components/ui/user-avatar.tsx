'use client';

import React, { useState } from 'react';
import { getPastelPalette, getUserInitials } from '@/lib/avatar';

interface UserAvatarProps {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  seed?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  seed,
  size = 'md',
  className = '',
  alt,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base font-semibold',
    xl: 'h-20 w-20 text-xl font-bold',
  }[size];

  const initials = getUserInitials(firstName, lastName);
  const colorSeed = seed || `${firstName || ''}_${lastName || ''}` || 'default_user';
  const palette = getPastelPalette(colorSeed);

  if (avatarUrl && !imageError) {
    return (
      <div
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 shadow-xs ${sizeClasses} ${className}`}
      >
        <img
          src={avatarUrl}
          alt={alt || `${firstName || 'User'} avatar`}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
        borderColor: palette.border,
      }}
      className={`relative inline-flex shrink-0 select-none items-center justify-center rounded-full border font-bold font-mono tracking-wider shadow-xs transition-transform ${sizeClasses} ${className}`}
      title={`${firstName || ''} ${lastName || ''}`.trim() || 'User Profile'}
    >
      <span>{initials}</span>
    </div>
  );
}
