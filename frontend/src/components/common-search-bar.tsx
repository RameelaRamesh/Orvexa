'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  CheckSquare,
  Briefcase,
  Users,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SearchResultItem {
  type: 'people' | 'project' | 'task';
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  status?: string;
  href: string;
}

export function CommonSearchBar({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    people: SearchResultItem[];
    projects: SearchResultItem[];
    tasks: SearchResultItem[];
  }>({
    people: [],
    projects: [],
    tasks: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults({ people: [], projects: [], tasks: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const wsId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

      if (!token) {
        setLoading(false);
        return;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      if (wsId) headers['x-workspace-id'] = wsId;

      try {
        const lowerQ = query.toLowerCase().trim();

        const [peopleRes, projRes, taskRes] = await Promise.allSettled([
          fetch(`${BRANDING.apiUrl}/people?search=${encodeURIComponent(query)}`, { headers }),
          fetch(`${BRANDING.apiUrl}/projects`, { headers }),
          fetch(`${BRANDING.apiUrl}/tasks?search=${encodeURIComponent(query)}`, { headers }),
        ]);

        const matchedPeople: SearchResultItem[] = [];
        const matchedProjects: SearchResultItem[] = [];
        const matchedTasks: SearchResultItem[] = [];

        // Parse People
        if (peopleRes.status === 'fulfilled' && peopleRes.value.ok) {
          const pData = await peopleRes.value.json();
          const list = Array.isArray(pData.data) ? pData.data : Array.isArray(pData) ? pData : [];
          for (const item of list) {
            const user = item.user || item;
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            if (
              fullName.toLowerCase().includes(lowerQ) ||
              user.email?.toLowerCase().includes(lowerQ) ||
              item.designation?.title?.toLowerCase().includes(lowerQ) ||
              item.department?.name?.toLowerCase().includes(lowerQ)
            ) {
              matchedPeople.push({
                type: 'people',
                id: item.id || user.id,
                title: fullName || user.email || 'Team Member',
                subtitle: `${item.designation?.title || item.accessRole || 'Member'} • ${item.department?.name || 'General'}`,
                avatarUrl: user.avatarUrl,
                firstName: user.firstName,
                lastName: user.lastName,
                status: item.status,
                href: '/app/people',
              });
            }
          }
        }

        // Parse Projects
        if (projRes.status === 'fulfilled' && projRes.value.ok) {
          const prjData = await projRes.value.json();
          const list = Array.isArray(prjData.data) ? prjData.data : Array.isArray(prjData) ? prjData : [];
          for (const proj of list) {
            if (
              proj.name?.toLowerCase().includes(lowerQ) ||
              proj.code?.toLowerCase().includes(lowerQ) ||
              proj.description?.toLowerCase().includes(lowerQ)
            ) {
              matchedProjects.push({
                type: 'project',
                id: proj.id,
                title: proj.name,
                subtitle: proj.code ? `Code: ${proj.code} • Status: ${proj.status}` : `Status: ${proj.status}`,
                status: proj.status,
                href: `/app/projects?id=${proj.id}`,
              });
            }
          }
        }

        // Parse Tasks
        if (taskRes.status === 'fulfilled' && taskRes.value.ok) {
          const tskData = await taskRes.value.json();
          const list = Array.isArray(tskData.data) ? tskData.data : Array.isArray(tskData) ? tskData : [];
          for (const t of list) {
            if (
              t.title?.toLowerCase().includes(lowerQ) ||
              t.description?.toLowerCase().includes(lowerQ) ||
              t.project?.name?.toLowerCase().includes(lowerQ)
            ) {
              matchedTasks.push({
                type: 'task',
                id: t.id,
                title: t.title,
                subtitle: `Project: ${t.project?.name || 'General'} • Priority: ${t.priority || 'NORMAL'}`,
                status: t.status,
                href: '/app/projects',
              });
            }
          }
        }

        setResults({
          people: matchedPeople.slice(0, 5),
          projects: matchedProjects.slice(0, 5),
          tasks: matchedTasks.slice(0, 5),
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const totalResults = results.people.length + results.projects.length + results.tasks.length;

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <div className={`relative w-full max-w-md ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search people, projects, tasks... (Ctrl + K)"
          className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 pl-10 pr-9 py-2 text-xs md:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-xs"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults({ people: [], projects: [], tasks: [] });
            }}
            className="absolute right-3 h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pointer-events-none">
            Ctrl+K
          </kbd>
        )}
      </div>

      {/* Floating Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl backdrop-blur-md max-h-[460px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        >
          {loading ? (
            <div className="flex items-center justify-center p-8 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-500" />
              Searching workspace...
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <Search className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              No results found for &ldquo;<span className="font-semibold text-slate-700 dark:text-slate-300">{query}</span>&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
              {/* People Section */}
              {results.people.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    <span>People ({results.people.length})</span>
                  </div>
                  {results.people.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <UserAvatar
                        avatarUrl={item.avatarUrl}
                        firstName={item.firstName}
                        lastName={item.lastName}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}

              {/* Projects Section */}
              {results.projects.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                    <span>Projects ({results.projects.length})</span>
                  </div>
                  {results.projects.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {item.status || 'ACTIVE'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {/* Tasks Section */}
              {results.tasks.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Tasks ({results.tasks.length})</span>
                  </div>
                  {results.tasks.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {item.status || 'PENDING'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
