import React from 'react';
import { Calendar, Moon, Sun, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface TopBarProps {
  user: User | null;
  hasCalendarToken: boolean;
  isSyncingCalendar: boolean;
  onSyncCalendar: () => void;
  onOpenCalendarSettings: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
  onOpenAssistant: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  hasCalendarToken,
  isSyncingCalendar,
  onSyncCalendar,
  onOpenCalendarSettings,
  onToggleTheme,
  isDark,
  onOpenAssistant,
}) => {
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand & Date */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            P
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate font-display">
              PulseTask
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
              {dateFormatted}
            </p>
          </div>
        </div>

        {/* Right Actions: Google Calendar status, AI Assistant, Dark Mode */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Calendar Sync status/button */}
          {hasCalendarToken ? (
            <button
              onClick={onSyncCalendar}
              disabled={isSyncingCalendar}
              title="Google Calendar Synced. Tap to refresh"
              className="h-9 px-2.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-1.5 hover:bg-emerald-100/60 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncingCalendar ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">Synced</span>
            </button>
          ) : (
            <button
              onClick={onOpenCalendarSettings}
              title="Connect Google Calendar"
              className="h-9 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Connect GCal</span>
            </button>
          )}

          {/* AI Assistant Drawer Trigger */}
          <button
            onClick={onOpenAssistant}
            title="Ask PulseAI Coach"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
