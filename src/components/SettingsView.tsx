import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { FreeTimeException, FreeTimeWindow } from '../types';

interface SettingsViewProps {
  freeTimeWindows: FreeTimeWindow[];
  onUpdateFreeTimeWindows: (windows: FreeTimeWindow[]) => void;
  exceptions: FreeTimeException[];
  onUpdateExceptions: (exceptions: FreeTimeException[]) => void;
  user: User | null;
  hasCalendarToken: boolean;
  onGoogleSignIn: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onSyncCalendar: () => void;
  isSyncingCalendar: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  freeTimeWindows,
  onUpdateFreeTimeWindows,
  exceptions,
  onUpdateExceptions,
  user,
  hasCalendarToken,
  onGoogleSignIn,
  onLogout,
  isLoggingIn,
  onSyncCalendar,
  isSyncingCalendar,
}) => {
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  // Exception form state
  const [newExceptionDate, setNewExceptionDate] = useState('');
  const [newExceptionStart, setNewExceptionStart] = useState('20:00');
  const [newExceptionEnd, setNewExceptionEnd] = useState('23:00');
  const [isDayOff, setIsDayOff] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');

  const handleUpdateDayWindow = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime' | 'enabled',
    val: any
  ) => {
    const updated = freeTimeWindows.map((w) => {
      if (w.dayOfWeek === dayOfWeek) {
        return { ...w, [field]: val };
      }
      return w;
    });
    onUpdateFreeTimeWindows(updated);
  };

  const handleApplyToAllDays = (sourceDayIndex: number) => {
    const source = freeTimeWindows.find((w) => w.dayOfWeek === sourceDayIndex);
    if (!source) return;
    const updated = freeTimeWindows.map((w) => ({
      ...w,
      startTime: source.startTime,
      endTime: source.endTime,
      enabled: source.enabled,
    }));
    onUpdateFreeTimeWindows(updated);
  };

  const handleAddException = () => {
    if (!newExceptionDate) return;

    const newEx: FreeTimeException = {
      id: `ex-${Date.now()}`,
      date: newExceptionDate,
      isDayOff,
      startTime: newExceptionStart,
      endTime: newExceptionEnd,
      reason: exceptionReason.trim() || undefined,
    };

    onUpdateExceptions([...exceptions, newEx]);
    setNewExceptionDate('');
    setExceptionReason('');
    setIsDayOff(false);
  };

  const handleDeleteException = (id: string) => {
    onUpdateExceptions(exceptions.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-5 pb-20">
      {/* SECTION 1: GOOGLE CALENDAR & OAUTH INTEGRATION */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
              Google Calendar Integration
            </h3>
            <p className="text-[11px] text-slate-500">
              Synchronize busy events to prevent task overlap
            </p>
          </div>
        </div>

        {user && hasCalendarToken ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                  Connected as {user.email || 'User'}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Real-time conflict detection active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onSyncCalendar}
                disabled={isSyncingCalendar}
                className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isSyncingCalendar ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={onLogout}
                title="Disconnect Google Account"
                className="h-8 px-2 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 text-xs font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sign in with Google to allow PulseTask to read your Google Calendar events. Tasks will never be assigned during meetings or personal commitments.
            </p>

            {/* Official Style Google Sign-in Button */}
            <button
              onClick={onGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-3 shadow-xs active:scale-[0.99] transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: MANUAL FREE-TIME SCHEDULE CONFIGURATION */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
                Manual Free-Time Windows
              </h3>
              <p className="text-[11px] text-slate-500">
                Tasks will strictly schedule ONLY within these hours
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {freeTimeWindows.map((win) => {
            const isMon = win.dayOfWeek === 1;

            return (
              <div
                key={win.dayOfWeek}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-[90px]">
                  <input
                    type="checkbox"
                    checked={win.enabled}
                    onChange={(e) =>
                      handleUpdateDayWindow(
                        win.dayOfWeek,
                        'enabled',
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span
                    className={`font-semibold ${
                      win.enabled
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 line-through'
                    }`}
                  >
                    {dayNames[win.dayOfWeek]}
                  </span>
                </div>

                {win.enabled ? (
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="time"
                      value={win.startTime}
                      onChange={(e) =>
                        handleUpdateDayWindow(
                          win.dayOfWeek,
                          'startTime',
                          e.target.value
                        )
                      }
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={win.endTime}
                      onChange={(e) =>
                        handleUpdateDayWindow(
                          win.dayOfWeek,
                          'endTime',
                          e.target.value
                        )
                      }
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Day Off (No tasks)</span>
                )}

                {isMon && (
                  <button
                    onClick={() => handleApplyToAllDays(1)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium shrink-0"
                    title="Apply Monday hours to all days"
                  >
                    Copy to all
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: DAY-BY-DAY EXCEPTIONS */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
                Day-by-Day Exceptions
              </h3>
              <p className="text-[11px] text-slate-500">
                Override specific dates (e.g. holidays, doctor appts)
              </p>
            </div>
          </div>
        </div>

        {/* Existing Exceptions List */}
        {exceptions.length > 0 && (
          <div className="space-y-2">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {ex.date}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {ex.isDayOff
                      ? 'Marked as Full Day Off'
                      : `Custom Hours: ${ex.startTime} – ${ex.endTime}`}
                    {ex.reason ? ` (${ex.reason})` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteException(ex.id)}
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Exception Form */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Add Specific Date Override:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-medium">
                Date:
              </label>
              <input
                type="date"
                value={newExceptionDate}
                onChange={(e) => setNewExceptionDate(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-medium">
                Reason (optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Travel, Family dinner"
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              id="dayOffCheckbox"
              checked={isDayOff}
              onChange={(e) => setIsDayOff(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="dayOffCheckbox" className="font-medium text-slate-700 dark:text-slate-300">
              Entire day unavailable (no tasks will be scheduled)
            </label>
          </div>

          {!isDayOff && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Free from:</span>
              <input
                type="time"
                value={newExceptionStart}
                onChange={(e) => setNewExceptionStart(e.target.value)}
                className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-slate-400">to</span>
              <input
                type="time"
                value={newExceptionEnd}
                onChange={(e) => setNewExceptionEnd(e.target.value)}
                className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          <button
            onClick={handleAddException}
            disabled={!newExceptionDate}
            className="w-full h-10 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-50 transition-colors"
          >
            Save Date Exception
          </button>
        </div>
      </div>
    </div>
  );
};
