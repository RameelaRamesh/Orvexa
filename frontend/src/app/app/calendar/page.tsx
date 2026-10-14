'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
  X,
  RefreshCw,
  Eye,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  layer: 'ATTENDANCE' | 'SHIFTS' | 'LEAVE' | 'TASKS' | 'QUALITY';
  startDate: string;
  endDate: string;
  allDay: boolean;
  status: string;
  color: string;
  entityType: string;
  entityId: string;
  details?: any;
}

export default function UniversalCalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');

  // Active Layers
  const [activeLayers, setActiveLayers] = useState<string[]>([
    'ATTENDANCE',
    'SHIFTS',
    'LEAVE',
    'TASKS',
    'QUALITY',
  ]);

  // Live Events
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Event Modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

  // Calculate Start & End of Month / Range
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadCalendarEvents = async () => {
    if (!token || !wsId) return;
    setLoading(true);
    setError(null);
    try {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59);

      const params = new URLSearchParams({
        startDate: firstDay.toISOString(),
        endDate: lastDay.toISOString(),
        layers: activeLayers.join(','),
      });

      const res = await fetch(`${BRANDING.apiUrl}/analytics/calendar?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-workspace-id': wsId,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load calendar events');
      setEvents(json.events || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarEvents();
  }, [currentDate, activeLayers]);

  // Layer Toggle
  const toggleLayer = (layer: string) => {
    if (activeLayers.includes(layer)) {
      if (activeLayers.length === 1) {
        toast.info('At least one calendar layer must remain active');
        return;
      }
      setActiveLayers(activeLayers.filter((l) => l !== layer));
    } else {
      setActiveLayers([...activeLayers, layer]);
    }
  };

  // Date Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Month Grid Calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map events by Day of Month
  const getEventsForDay = (day: number) => {
    return events.filter((ev) => {
      const d = new Date(ev.startDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const navigateToEntity = (event: CalendarEvent) => {
    switch (event.entityType) {
      case 'TASK':
        router.push('/app/projects');
        break;
      case 'ATTENDANCE':
        router.push('/app/time');
        break;
      case 'LEAVE':
        router.push('/app/time');
        break;
      case 'QUALITY':
        router.push('/app/quality');
        break;
      default:
        break;
    }
    setSelectedEvent(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-foreground">Universal Operations Calendar</h1>
            <Badge variant="outline" className="text-xs font-mono">Multi-Layer Scheduling</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Attendance sessions, work shifts, leave requests, task deadlines, and quality reviews on a single schedule.
          </p>
        </div>

        {/* View Switcher & Date Nav */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7" title="Previous Month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1 text-xs font-semibold text-foreground hover:bg-surface-secondary rounded"
            >
              Today
            </button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7" title="Next Month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'month' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'agenda' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Agenda
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadCalendarEvents} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Interactive Layer Filter Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Layers:
        </span>

        <button
          type="button"
          onClick={() => toggleLayer('ATTENDANCE')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('ATTENDANCE')
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Attendance Sessions
        </button>

        <button
          type="button"
          onClick={() => toggleLayer('SHIFTS')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('SHIFTS')
              ? 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400 font-semibold'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Work Shifts
        </button>

        <button
          type="button"
          onClick={() => toggleLayer('LEAVE')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('LEAVE')
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Leave Requests
        </button>

        <button
          type="button"
          onClick={() => toggleLayer('TASKS')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('TASKS')
              ? 'bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-400 font-semibold'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          Task Deadlines
        </button>

        <button
          type="button"
          onClick={() => toggleLayer('QUALITY')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            activeLayers.includes('QUALITY')
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold'
              : 'border-border text-muted-foreground/50 opacity-60'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Quality Audits
        </button>
      </div>

      {/* Month Label Banner */}
      <div className="flex items-center justify-between bg-card border border-border px-4 py-3 rounded-lg shadow-xs">
        <span className="text-base font-bold text-foreground">{monthName}</span>
        <span className="text-xs text-muted-foreground font-mono">{events.length} active events in scope</span>
      </div>

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-surface-secondary/40 text-center text-xs font-semibold uppercase text-muted-foreground py-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-border bg-card">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`blank-${idx}`} className="min-h-24 bg-surface-secondary/15 p-2 text-muted-foreground/30 text-xs" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dayEvents = getEventsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day-${day}`}
                  className={`min-h-28 p-1.5 sm:p-2 transition-colors flex flex-col justify-between ${
                    isToday ? 'bg-primary/5 font-semibold' : 'hover:bg-surface-secondary/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                        isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground font-medium'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left truncate text-[11px] px-1.5 py-0.5 rounded shadow-2xs font-medium transition-transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: `${ev.color}15`,
                          borderLeft: `3px solid ${ev.color}`,
                          color: ev.color,
                        }}
                      >
                        {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* AGENDA VIEW LIST */}
      {viewMode === 'agenda' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Chronological Activity Agenda</CardTitle>
            <CardDescription>Upcoming deadlines and operations ordered by date</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h4 className="text-sm font-semibold text-foreground">No events recorded for this month</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust layer filters or navigate to a different month to view scheduled events.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 hover:bg-surface-secondary/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-3 w-3 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: ev.color }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{ev.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ev.startDate).toLocaleDateString()} • Layer: <span className="font-semibold">{ev.layer}</span> • Status: {ev.status}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedEvent(ev)}
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigateToEntity(ev)}
                        className="h-7 text-xs gap-1"
                      >
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Details Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedEvent.color }}
                />
                <h3 className="text-base font-bold text-foreground truncate">
                  {selectedEvent.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEvent(null)}
                className="h-8 w-8 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Event Type</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedEvent.type}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge
                  variant={
                    selectedEvent.status === 'COMPLETED' || selectedEvent.status === 'APPROVED' || selectedEvent.status === 'PASSED'
                      ? 'success'
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {selectedEvent.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Schedule</span>
                <span className="text-xs font-mono text-foreground">
                  {new Date(selectedEvent.startDate).toLocaleString()}
                </span>
              </div>

              {selectedEvent.details && (
                <div className="border-t border-border pt-3 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Operational Metadata
                  </span>
                  <div className="p-3 bg-muted rounded-lg text-xs font-mono space-y-1">
                    {Object.entries(selectedEvent.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{k}:</span>
                        <span className="text-foreground font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-border pt-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              <Button size="sm" onClick={() => navigateToEntity(selectedEvent)} className="gap-1.5">
                Navigate to Source Record
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
