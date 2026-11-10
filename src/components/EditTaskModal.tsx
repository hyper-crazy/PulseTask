import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, Calendar, CheckSquare } from 'lucide-react';
import { TaskItem, TaskMilestone } from '../types';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  onSave: (task: TaskItem) => void;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledStartTime, setScheduledStartTime] = useState('21:00');
  const [scheduledEndTime, setScheduledEndTime] = useState('21:45');
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [milestones, setMilestones] = useState<TaskMilestone[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      // Format deadline for datetime-local input
      try {
        const d = new Date(task.deadline);
        const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDeadline(isoLocal);
      } catch (e) {
        setDeadline('');
      }
      setScheduledDate(task.scheduledDate);
      setScheduledStartTime(task.scheduledStartTime || '21:00');
      setScheduledEndTime(task.scheduledEndTime || '23:00');
      setUrgency(task.urgency);
      setMilestones(task.milestones || []);
    } else {
      // New task defaults
      setTitle('');
      setDescription('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 0, 0, 0);
      const isoLocal = new Date(
        tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setDeadline(isoLocal);
      setScheduledDate(defaultDate || new Date().toISOString().slice(0, 10));
      setScheduledStartTime(defaultStartTime || '21:00');
      setScheduledEndTime(defaultEndTime || '23:00');
      setUrgency('medium');
      setMilestones([
        {
          id: `m-${Date.now()}-1`,
          title: 'Initial setup & preparation',
          completed: false,
        },
        {
          id: `m-${Date.now()}-2`,
          title: 'Core execution & review',
          completed: false,
        },
      ]);
    }
  }, [task, isOpen]);

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: `m-${Date.now()}`,
        title: 'New subtask',
        completed: false,
      },
    ]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const updatedTask: TaskItem = {
      id: task ? task.id : `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline ? new Date(deadline).toISOString() : new Date().toISOString(),
      actualDurationSeconds: task ? task.actualDurationSeconds : 0,
      scheduledDate,
      queueOrder: task ? task.queueOrder : 1,
      scheduledStartTime,
      scheduledEndTime,
      status: task ? task.status : 'pending',
      urgency,
      isMajorTask: milestones.length > 2,
      milestones,
      createdAt: task ? task.createdAt : new Date().toISOString(),
    };

    onSave(updatedTask);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
            {task ? 'Edit Task & Schedule' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Task Title:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete quarterly review..."
              className="mt-1 w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description / Notes:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key notes, links, or instructions..."
              className="mt-1 w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Deadline & Urgency */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Deadline:
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Priority Urgency:
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Scheduled Date & Time Window */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Scheduled Time Slot (Free Hours)
            </span>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400">Date:</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Start Time:</label>
                <input
                  type="time"
                  value={scheduledStartTime}
                  onChange={(e) => setScheduledStartTime(e.target.value)}
                  className="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">End Time:</label>
                <input
                  type="time"
                  value={scheduledEndTime}
                  onChange={(e) => setScheduledEndTime(e.target.value)}
                  className="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Milestones Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Milestones ({milestones.length})
              </label>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Milestone
              </button>
            </div>

            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[idx].title = e.target.value;
                      setMilestones(updated);
                    }}
                    className="flex-1 text-xs bg-transparent border-none focus:outline-none text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMilestone(m.id)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors"
          >
            {task ? 'Update Task' : 'Save Task'}
          </button>
        </div>
      </div>
    </div>
  );
};
