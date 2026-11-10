import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Flame,
  Award,
} from 'lucide-react';
import { ProductivityStats, TaskItem } from '../types';

interface AnalyticsViewProps {
  stats: ProductivityStats;
  tasks: TaskItem[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats, tasks }) => {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  const completedTasks = tasks.filter((t) => t.status === 'completed');

  // Determine score tier label
  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: 'Optimal Focus', color: 'text-emerald-600 dark:text-emerald-400' };
    if (score >= 75) return { label: 'Consistent Flow', color: 'text-indigo-600 dark:text-indigo-400' };
    if (score >= 60) return { label: 'Steady Progress', color: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Building Momentum', color: 'text-slate-600 dark:text-slate-400' };
  };

  const rating = getScoreRating(stats.overallScore);

  // Maximum minutes for bar scaling
  const maxWeeklyMinutes = Math.max(
    60,
    ...stats.weeklyData.map((d) => d.minutesTracked)
  );

  const maxMonthlyCount = Math.max(
    5,
    ...stats.monthlyData.map((d) => d.completedCount)
  );

  return (
    <div className="space-y-4 pb-20">
      {/* OVERALL PRODUCTIVITY PROGRESSION SCORE */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-display">
            Productivity Progression Score
          </span>
          <span className={`text-xs font-bold ${rating.color}`}>
            {rating.label}
          </span>
        </div>

        <div className="flex items-baseline gap-3 my-3">
          <span className="text-5xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {stats.overallScore}
          </span>
          <span className="text-sm font-semibold text-slate-400">/ 100</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${stats.overallScore}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5">
          Calculated dynamically from completion before deadline (45%), free-window consistency (30%), and total deep focus hours (25%) with no artificial time limits.
        </p>
      </div>

      {/* 3 SUMMARY KPI CARDS */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {stats.totalTasksCompleted}
          </div>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase mt-0.5">
            Tasks Done
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-1.5">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {stats.onTimeCompletionRate}%
          </div>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase mt-0.5">
            On-Time Rate
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-1.5">
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {stats.totalFocusTimeSeconds >= 3600
              ? `${(stats.totalFocusTimeSeconds / 3600).toFixed(1)}h`
              : `${Math.round(stats.totalFocusTimeSeconds / 60)}m`}
          </div>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase mt-0.5">
            Deep Focus
          </p>
        </div>
      </div>

      {/* WEEKLY / MONTHLY PROGRESS CHART */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-display">
              {timeframe === 'weekly' ? 'Weekly Work Breakdown' : 'Monthly Performance'}
            </h3>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                timeframe === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                timeframe === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {timeframe === 'weekly' ? (
          /* Weekly Bar Chart */
          <div className="pt-2">
            <div className="flex items-end justify-between gap-2 h-36 border-b border-slate-100 dark:border-slate-800 pb-2">
              {stats.weeklyData.map((d, idx) => {
                const heightPercent = Math.min(
                  100,
                  Math.max(12, Math.round((d.minutesTracked / maxWeeklyMinutes) * 100))
                );

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-mono font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      {d.minutesTracked}m
                    </span>
                    <div
                      className="w-full max-w-[28px] rounded-t-lg bg-indigo-600 hover:bg-indigo-500 transition-all duration-300"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                      {d.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Minutes of focused stopwatch time logged per day during your free windows
            </p>
          </div>
        ) : (
          /* Monthly List / Chart */
          <div className="pt-2 space-y-3">
            {stats.monthlyData.map((m, idx) => {
              const countPercent = Math.min(
                100,
                Math.round((m.completedCount / maxMonthlyCount) * 100)
              );

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {m.monthLabel}
                    </span>
                    <span className="font-mono text-slate-500">
                      {m.completedCount} tasks · {m.hoursTracked}h logged
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${countPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLETED TASKS FOCUS LOG */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-display">
          Completed Tasks Duration Log
        </h3>
        {completedTasks.length === 0 ? (
          <p className="text-xs text-slate-400">
            No completed tasks yet. Finish a task session to log your starting-to-ending duration.
          </p>
        ) : (
          <div className="space-y-2.5">
            {completedTasks.slice(0, 5).map((t) => {
              const totalSecs = t.actualDurationSeconds || 0;
              const mins = Math.floor(totalSecs / 60);
              const secs = totalSecs % 60;
              const durationLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
              const completedMilestones = t.milestones.filter((m) => m.completed).length;

              return (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {completedMilestones} / {t.milestones.length} subtasks done · Logged on {t.scheduledDate}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md">
                      {durationLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
