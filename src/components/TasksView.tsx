import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit2,
  Play,
  Share2,
} from 'lucide-react';
import { TaskItem, TaskStatus } from '../types';

interface TasksViewProps {
  tasks: TaskItem[];
  onOpenVoiceModal: () => void;
  onOpenCreateModal: () => void;
  onOpenEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onStartSession: (taskId: string) => void;
  onToggleMilestone: (taskId: string, milestoneId: string) => void;
  onAddMilestoneToTask: (taskId: string, title: string) => void;
  onPushToCalendar: (task: TaskItem) => void;
  hasCalendarToken: boolean;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onOpenVoiceModal,
  onOpenCreateModal,
  onOpenEditTask,
  onDeleteTask,
  onStartSession,
  onToggleMilestone,
  onAddMilestoneToTask,
  onPushToCalendar,
  hasCalendarToken,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending' && t.status === 'completed') return false;
    if (filter === 'completed' && t.status !== 'completed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchMilestone = t.milestones.some((m) =>
        m.title.toLowerCase().includes(q)
      );
      return matchTitle || matchDesc || matchMilestone;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Top Controls: Search & Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, milestones, or notes..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            {(['all', 'pending', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  filter === tab
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'pending' ? 'To Do' : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenCreateModal}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Manual
            </button>
            <button
              onClick={onOpenVoiceModal}
              className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Speak
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
            <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No tasks found
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'Try a different search query.'
                : 'Tap the button below or use voice to add a new task.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const completedMilestones = task.milestones.filter(
              (m) => m.completed
            ).length;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all ${
                  isCompleted ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/50' : ''
                }`}
              >
                {/* Header Meta */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {task.scheduledDate} · {task.scheduledStartTime}–
                    {task.scheduledEndTime}
                  </span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Due:{' '}
                    {new Date(task.deadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title */}
                <h4
                  onClick={() => onOpenEditTask(task)}
                  className={`text-sm font-bold mt-1.5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 ${
                    isCompleted
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {task.title}
                </h4>

                {task.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* Milestones & Subtasks */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
                    <span>
                      Subtasks ({completedMilestones}/{task.milestones.length})
                    </span>
                    <div className="flex items-center gap-2">
                      {task.actualDurationSeconds > 0 && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          Tracked: {Math.floor(task.actualDurationSeconds / 60)}m {task.actualDurationSeconds % 60}s
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const sub = prompt('Enter subtask title:');
                          if (sub && sub.trim()) {
                            onAddMilestoneToTask(task.id, sub.trim());
                          }
                        }}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" /> Add Subtask
                      </button>
                    </div>
                  </div>
                  {task.milestones.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onToggleMilestone(task.id, m.id)}
                      className="w-full text-left flex items-center gap-2 text-xs py-0.5"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          m.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {m.completed && <CheckCircle2 className="w-2.5 h-2.5" />}
                      </div>
                      <span
                        className={`truncate flex-1 ${
                          m.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {m.title}
                      </span>
                      {m.completed && m.actualDurationSeconds && (
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                          {Math.floor(m.actualDurationSeconds / 60) > 0
                            ? `${Math.floor(m.actualDurationSeconds / 60)}m `
                            : ''}
                          {m.actualDurationSeconds % 60}s
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenEditTask(task)}
                      title="Edit task"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      title="Delete task"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {hasCalendarToken && (
                      <button
                        onClick={() => onPushToCalendar(task)}
                        title="Sync to Google Calendar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {!isCompleted && (
                    <button
                      onClick={() => onStartSession(task.id)}
                      className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Stopwatch</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
