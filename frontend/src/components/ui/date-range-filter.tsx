'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export interface DateRange {
  startDate: string;
  endDate: string;
  preset: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className = '' }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(value.preset === 'CUSTOM');
  const [customStart, setCustomStart] = useState(value.startDate.slice(0, 10));
  const [customEnd, setCustomEnd] = useState(value.endDate.slice(0, 10));

  const setPreset = (preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30_DAYS') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'TODAY') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'LAST_30_DAYS') {
      start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    setShowCustom(false);
    onChange({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      preset,
    });
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);

    onChange({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      preset: 'CUSTOM',
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setPreset('TODAY')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value.preset === 'TODAY'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-secondary'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setPreset('THIS_WEEK')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value.preset === 'THIS_WEEK'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-secondary'
          }`}
        >
          This Week
        </button>
        <button
          type="button"
          onClick={() => setPreset('THIS_MONTH')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value.preset === 'THIS_MONTH'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-secondary'
          }`}
        >
          This Month
        </button>
        <button
          type="button"
          onClick={() => setPreset('LAST_30_DAYS')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value.preset === 'LAST_30_DAYS'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-secondary'
          }`}
        >
          Last 30 Days
        </button>
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
            value.preset === 'CUSTOM' || showCustom
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-secondary'
          }`}
        >
          <Calendar className="h-3 w-3" />
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-lg shadow-sm">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" onClick={handleApplyCustom} className="h-7 text-xs px-2.5">
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
