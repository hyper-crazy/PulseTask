import React from 'react';
import { CalendarDays, CheckSquare, BarChart3, Settings, Mic } from 'lucide-react';

export type NavTab = 'today' | 'tasks' | 'analytics' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenVoiceModal: () => void;
  hasActiveSession?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenVoiceModal,
  hasActiveSession,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Today */}
        <button
          onClick={() => onSelectTab('today')}
          className={`flex-1 h-full flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            currentTab === 'today'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <CalendarDays className="w-5 h-5" />
            {hasActiveSession && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">Today</span>
        </button>

        {/* Tab 2: All Tasks */}
        <button
          onClick={() => onSelectTab('tasks')}
          className={`flex-1 h-full flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            currentTab === 'tasks'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Tasks</span>
        </button>

        {/* Center: Voice Mic CTA Button */}
        <div className="relative -top-3 flex flex-col items-center px-1">
          <button
            onClick={onOpenVoiceModal}
            className="w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            title="Speak Task"
            aria-label="Speak Task"
          >
            <Mic className="w-6 h-6 animate-pulse" />
          </button>
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">
            Voice
          </span>
        </div>

        {/* Tab 3: Analytics */}
        <button
          onClick={() => onSelectTab('analytics')}
          className={`flex-1 h-full flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            currentTab === 'analytics'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Progress</span>
        </button>

        {/* Tab 4: Settings */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex-1 h-full flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            currentTab === 'settings'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Schedule</span>
        </button>
      </div>
    </nav>
  );
};
