import React from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  Sparkles,
  ListTodo,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ActiveSession, GoogleCalendarEvent, TaskItem } from '../types';

interface TodayViewProps {
  todayTasks: TaskItem[];
  activeSession: ActiveSession | null;
  onStartSession: (taskId: string) => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onFinishSession: (taskId: string) => void;
  onToggleMilestone: (taskId: string, milestoneId: string) => void;
  onAddMilestoneToTask: (taskId: string, title: string) => void;
  onOpenVoiceModal: () => void;
  onOpenEditTask: (task: TaskItem) => void;
  freeWindowSummary: string;
  calendarEvents: GoogleCalendarEvent[];
  onOpenSettings: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  todayTasks,
  activeSession,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onFinishSession,
  onToggleMilestone,
  onAddMilestoneToTask,
  onOpenVoiceModal,
  onOpenEditTask,
  freeWindowSummary,
  calendarEvents,
  onOpenSettings,
}) => {
  // Format elapsed seconds to HH:MM:SS or MM:SS
  const formatStopwatch = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const formatLapDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const activeTask = activeSession
    ? todayTasks.find((t) => t.id === activeSession.taskId)
    : null;

  // Sort pending tasks by sequential queue order
  const pendingTasks = todayTasks
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => a.queueOrder - b.queueOrder);

  const completedTasks = todayTasks.filter((t) => t.status === 'completed');

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#4F46E5', '#10B981', '#F59E0B'],
      });
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Free Time Window Header Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Your Free-Time Window
              </p>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {freeWindowSummary}
              </h2>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Adjust
          </button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
          Work at your own speed with zero time constraints. Your tasks queue sequentially one at a time.
        </p>
      </div>

      {/* ACTIVE STOPWATCH SESSION CARD */}
      {activeSession && activeTask && (
        <div className="p-5 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden transition-all">
          <div className="flex items-center justify-between text-xs text-indigo-100">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Active Focus Session
            </span>
            <span className="font-medium text-indigo-200 text-xs">
              Sequential Task #{activeTask.queueOrder || 1}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">
            {activeTask.title}
          </h3>

          {/* Big Upward Stopwatch */}
          <div className="my-4 text-center">
            <p className="text-[11px] uppercase tracking-wider text-indigo-200 font-medium">
              Elapsed Time (Zero Countdown Pressure)
            </p>
            <div className="text-5xl font-extrabold font-mono tracking-tight text-white my-1 tabular-nums">
              {formatStopwatch(activeSession.elapsedSeconds)}
            </div>
            <p className="text-[11px] text-indigo-200">
              Checking off a subtask records its exact completion lap time
            </p>
          </div>

          {/* Subtasks Checklist with Lap Times */}
          {activeTask.milestones.length > 0 && (
            <div className="mb-4 bg-indigo-700/50 rounded-2xl p-3 space-y-2 border border-indigo-500/30">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-100">
                <span>Subtasks & Milestones:</span>
                <button
                  onClick={() => {
                    const title = prompt('Enter new subtask title:');
                    if (title && title.trim()) {
                      onAddMilestoneToTask(activeTask.id, title.trim());
                    }
                  }}
                  className="text-[11px] text-indigo-200 hover:text-white flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Subtask
                </button>
              </div>

              {activeTask.milestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onToggleMilestone(activeTask.id, m.id)}
                  className="w-full text-left flex items-start gap-2.5 p-2 rounded-xl hover:bg-indigo-600/50 transition-colors text-xs"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      m.completed
                        ? 'bg-emerald-400 border-emerald-400 text-slate-900'
                        : 'border-indigo-300'
                    }`}
                  >
                    {m.completed && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`block ${
                        m.completed ? 'line-through text-indigo-300' : 'text-white font-medium'
                      }`}
                    >
                      {m.title}
                    </span>
                    {m.completed && m.actualDurationSeconds && (
                      <span className="text-[10px] text-emerald-300 font-mono">
                        ✓ Finished in {formatLapDuration(m.actualDurationSeconds)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Stopwatch Controls */}
          <div className="flex items-center gap-3">
            {activeSession.isRunning ? (
              <button
                onClick={onPauseSession}
                className="flex-1 h-12 rounded-2xl bg-white/15 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/20 transition-all"
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
            ) : (
              <button
                onClick={onResumeSession}
                className="flex-1 h-12 rounded-2xl bg-white/20 hover:bg-white/25 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/30 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Resume
              </button>
            )}

            <button
              onClick={() => {
                triggerCelebration();
                onFinishSession(activeTask.id);
              }}
              className="flex-[1.5] h-12 rounded-2xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Finish & Log Time
            </button>
          </div>
        </div>
      )}

      {/* TODAY'S SEQUENTIAL QUEUE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-display">
            Queue for Free Window ({pendingTasks.length})
          </h3>
          <button
            onClick={onOpenVoiceModal}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
              All Tasks Cleared for Today!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Your free-time queue is open. Tap the microphone below to speak your next task.
            </p>
            <button
              onClick={onOpenVoiceModal}
              className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Speak a Task
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((task, index) => {
              const isCurrentActive = activeSession?.taskId === task.id;
              const completedSubtasksCount = task.milestones.filter(
                (m) => m.completed
              ).length;

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
                    isCurrentActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md'
                      : 'border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Task Top Meta: Sequential Queue # and Deadline */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-[10px] font-bold">
                        #{index + 1}
                      </span>
                      <span>Next in Queue</span>
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Deadline:{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        {new Date(task.deadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </strong>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-2">
                    <h4
                      onClick={() => onOpenEditTask(task)}
                      className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Subtasks Preview & Add Option */}
                  {task.milestones.length > 0 && (
                    <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        <span>
                          Subtasks ({completedSubtasksCount}/{task.milestones.length})
                        </span>
                        <button
                          onClick={() => {
                            const newSub = prompt('Add new subtask:');
                            if (newSub && newSub.trim()) {
                              onAddMilestoneToTask(task.id, newSub.trim());
                            }
                          }}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Subtask
                        </button>
                      </div>

                      <div className="space-y-1">
                        {task.milestones.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => onToggleMilestone(task.id, m.id)}
                            className="w-full text-left flex items-center gap-2 text-xs py-0.5 group"
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                m.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                              }`}
                            >
                              {m.completed && <CheckCircle2 className="w-2.5 h-2.5" />}
                            </div>
                            <span
                              className={`truncate flex-1 ${
                                m.completed
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {m.title}
                            </span>
                            {m.completed && m.actualDurationSeconds && (
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                                {formatLapDuration(m.actualDurationSeconds)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Action: Start Session Stopwatch */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => onOpenEditTask(task)}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Edit & Details
                    </button>

                    {!isCurrentActive ? (
                      <button
                        onClick={() => onStartSession(task.id)}
                        className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Session</span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Stopwatch Running Above
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLETED TASKS WITH RECORDED TIMES */}
      {completedTasks.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-display px-1">
            Completed Today ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-medium text-slate-800 dark:text-slate-200 line-through truncate">
                      {task.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Total Time Taken: {formatStopwatch(task.actualDurationSeconds || 0)}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                  Done
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
