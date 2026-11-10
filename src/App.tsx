import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  ActiveSession,
  FreeTimeException,
  FreeTimeWindow,
  GoogleCalendarEvent,
  ProductivityStats,
  TaskItem,
} from './types';
import {
  calculateProductivityStats,
  DEFAULT_FREE_TIME_WINDOWS,
  loadActiveSession,
  loadFreeTimeExceptions,
  loadFreeTimeWindows,
  loadTasks,
  loadTheme,
  saveActiveSession,
  saveFreeTimeExceptions,
  saveFreeTimeWindows,
  saveTasks,
  saveTheme,
} from './services/storage';
import {
  findFirstAvailableSlot,
  formatDateToYMD,
  getFreeTimeWindowForDate,
  minutesToTimeString,
} from './services/scheduler';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/firebaseAuth';
import {
  fetchCalendarEventsForDate,
  createCalendarEvent,
} from './services/googleCalendar';

import { TopBar } from './components/TopBar';
import { BottomNav, NavTab } from './components/BottomNav';
import { VoiceModal } from './components/VoiceModal';
import { TodayView } from './components/TodayView';
import { TasksView } from './components/TasksView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { EditTaskModal } from './components/EditTaskModal';

export default function App() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [freeTimeWindows, setFreeTimeWindows] = useState<FreeTimeWindow[]>(
    DEFAULT_FREE_TIME_WINDOWS
  );
  const [exceptions, setExceptions] = useState<FreeTimeException[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // Tabs & Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('today');
  const [isDark, setIsDark] = useState(false);

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Auth & Calendar
  const [user, setUser] = useState<User | null>(null);
  const [hasCalendarToken, setHasCalendarToken] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Initial State Hydration
  useEffect(() => {
    const loadedTheme = loadTheme();
    setIsDark(loadedTheme === 'dark');
    saveTheme(loadedTheme);

    const initialTasks = loadTasks();
    setTasks(initialTasks);

    const initialWindows = loadFreeTimeWindows();
    setFreeTimeWindows(initialWindows);

    const initialExceptions = loadFreeTimeExceptions();
    setExceptions(initialExceptions);

    const initialSession = loadActiveSession();
    setActiveSession(initialSession);

    // Initialize Firebase Auth listener
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setHasCalendarToken(Boolean(token));
      },
      () => {
        setUser(null);
        setHasCalendarToken(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch Calendar Events when user/token ready
  useEffect(() => {
    if (hasCalendarToken) {
      handleSyncCalendar();
    }
  }, [hasCalendarToken]);

  // Live Stopwatch Tick Effect
  useEffect(() => {
    let timer: any = null;
    if (activeSession && activeSession.isRunning) {
      timer = setInterval(() => {
        setActiveSession((prev) => {
          if (!prev || !prev.isRunning) return prev;
          const updatedSeconds = prev.elapsedSeconds + 1;
          const updatedSession = { ...prev, elapsedSeconds: updatedSeconds };
          saveActiveSession(updatedSession);

          // Update task's actualDurationSeconds in state as well
          setTasks((prevTasks) => {
            const nextTasks = prevTasks.map((t) =>
              t.id === prev.taskId
                ? { ...t, actualDurationSeconds: updatedSeconds }
                : t
            );
            saveTasks(nextTasks);
            return nextTasks;
          });

          return updatedSession;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeSession?.isRunning, activeSession?.taskId]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setHasCalendarToken(true);
        showToast('Google Calendar connected successfully!');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Could not sign in with Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setHasCalendarToken(false);
    setCalendarEvents([]);
    showToast('Disconnected from Google Calendar');
  };

  const handleSyncCalendar = async () => {
    setIsSyncingCalendar(true);
    const todayStr = formatDateToYMD(new Date());
    try {
      const events = await fetchCalendarEventsForDate(todayStr);
      setCalendarEvents(events);
      showToast(`Calendar synced (${events.length} events checked)`);
    } catch (err) {
      console.error('Calendar sync error:', err);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleToggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    saveTheme(next);
  };

  // Session Handlers
  const handleStartSession = (taskId: string) => {
    const existing = tasks.find((t) => t.id === taskId);
    const initialElapsed = existing?.actualDurationSeconds || 0;

    const newSession: ActiveSession = {
      taskId,
      elapsedSeconds: initialElapsed,
      lastMilestoneLapSeconds: initialElapsed,
      isRunning: true,
      startedTimestamp: Date.now(),
    };

    setActiveSession(newSession);
    saveActiveSession(newSession);

    // Update task status to in_progress
    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: 'in_progress' as const,
            startedAt: t.startedAt || new Date().toISOString(),
          }
        : t
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setCurrentTab('today');
    showToast('Focus session started! Stopwatch is running.');
  };

  const handlePauseSession = () => {
    if (!activeSession) return;
    const paused = { ...activeSession, isRunning: false };
    setActiveSession(paused);
    saveActiveSession(paused);
  };

  const handleResumeSession = () => {
    if (!activeSession) return;
    const resumed = { ...activeSession, isRunning: true };
    setActiveSession(resumed);
    saveActiveSession(resumed);
  };

  const handleFinishSession = (taskId: string) => {
    const finalDuration = activeSession?.elapsedSeconds || 0;

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'completed' as const,
          actualDurationSeconds: finalDuration,
          completedAt: new Date().toISOString(),
          milestones: t.milestones.map((m) => ({
            ...m,
            completed: true,
            completedAt: m.completedAt || new Date().toISOString(),
          })),
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setActiveSession(null);
    saveActiveSession(null);
    showToast('Task marked complete! Productivity score updated.');
  };

  const handleToggleMilestone = (taskId: string, milestoneId: string) => {
    // If active session is running for this task, calculate lap time
    let lapSeconds: number | undefined = undefined;
    if (activeSession && activeSession.taskId === taskId) {
      lapSeconds = Math.max(1, activeSession.elapsedSeconds - (activeSession.lastMilestoneLapSeconds || 0));
      const updatedSession = {
        ...activeSession,
        lastMilestoneLapSeconds: activeSession.elapsedSeconds,
      };
      setActiveSession(updatedSession);
      saveActiveSession(updatedSession);
    }

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const nextMilestones = t.milestones.map((m) => {
          if (m.id === milestoneId) {
            const completed = !m.completed;
            return {
              ...m,
              completed,
              completedAt: completed ? new Date().toISOString() : undefined,
              actualDurationSeconds: completed
                ? (lapSeconds || m.actualDurationSeconds || 300)
                : undefined,
            };
          }
          return m;
        });

        // If all milestones checked, mark task completed
        const allDone = nextMilestones.every((m) => m.completed);
        return {
          ...t,
          milestones: nextMilestones,
          status: allDone ? ('completed' as const) : t.status,
          completedAt: allDone ? new Date().toISOString() : t.completedAt,
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleAddMilestoneToTask = (taskId: string, title: string) => {
    if (!title || !title.trim()) return;
    const newMilestone = {
      id: `ms-${Date.now()}`,
      title: title.trim(),
      completed: false,
    };
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, milestones: [...t.milestones, newMilestone] }
        : t
    );
    setTasks(updated);
    saveTasks(updated);
    showToast('Subtask added');
  };

  // Task creation from Voice Modal
  const handleTaskCreated = (newTaskData: Omit<TaskItem, 'id' | 'createdAt'>) => {
    const newTask: TaskItem = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const nextTasks = [newTask, ...tasks];
    setTasks(nextTasks);
    saveTasks(nextTasks);
    showToast(`"${newTask.title}" added to free-time schedule!`);
  };

  const handleSaveTask = (taskToSave: TaskItem) => {
    const exists = tasks.some((t) => t.id === taskToSave.id);
    let updatedTasks: TaskItem[];
    if (exists) {
      updatedTasks = tasks.map((t) => (t.id === taskToSave.id ? taskToSave : t));
      showToast('Task updated');
    } else {
      updatedTasks = [taskToSave, ...tasks];
      showToast('New task scheduled');
    }
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    if (activeSession?.taskId === taskId) {
      setActiveSession(null);
      saveActiveSession(null);
    }
    showToast('Task deleted');
  };

  const handlePushToCalendar = async (task: TaskItem) => {
    if (!hasCalendarToken) {
      setCurrentTab('settings');
      showToast('Please connect Google Calendar first');
      return;
    }
    const eventId = await createCalendarEvent(task);
    if (eventId) {
      const updated = tasks.map((t) =>
        t.id === task.id ? { ...t, googleCalendarEventId: eventId } : t
      );
      setTasks(updated);
      saveTasks(updated);
      showToast('Event added to Google Calendar!');
    } else {
      showToast('Failed to create Google Calendar event');
    }
  };

  // Compute next available slot helper for VoiceModal & EditModal
  const computeSlotHelper = (
    deadlineIso: string,
    ignoreTaskId?: string
  ) => {
    return findFirstAvailableSlot(
      deadlineIso,
      tasks,
      freeTimeWindows,
      exceptions,
      calendarEvents,
      ignoreTaskId
    );
  };

  // Free Time summary text for today
  const todayStr = formatDateToYMD(new Date());
  const todaySlot = getFreeTimeWindowForDate(
    todayStr,
    freeTimeWindows,
    exceptions
  );
  const freeWindowSummary = todaySlot
    ? `${minutesToTimeString(todaySlot.startMinutes)} – ${minutesToTimeString(
        todaySlot.endMinutes
      )}`
    : 'No Free Hours Configured (Day Off)';

  const todayTasks = tasks.filter((t) => t.scheduledDate === todayStr);
  const productivityStats: ProductivityStats = calculateProductivityStats(tasks);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between transition-colors">
      {/* Mobile App Canvas Container (Responsive on all screen resolutions) */}
      <div className="w-full max-w-xl mx-auto min-h-screen flex flex-col bg-white dark:bg-slate-900 shadow-2xl relative border-x border-slate-200/60 dark:border-slate-800/80">
        {/* Top App Bar */}
        <TopBar
          user={user}
          hasCalendarToken={hasCalendarToken}
          isSyncingCalendar={isSyncingCalendar}
          onSyncCalendar={handleSyncCalendar}
          onOpenCalendarSettings={() => setCurrentTab('settings')}
          onToggleTheme={handleToggleTheme}
          isDark={isDark}
          onOpenAssistant={() => setIsAiDrawerOpen(true)}
        />

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            {notification}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-y-auto">
          {currentTab === 'today' && (
            <TodayView
              todayTasks={todayTasks}
              activeSession={activeSession}
              onStartSession={handleStartSession}
              onPauseSession={handlePauseSession}
              onResumeSession={handleResumeSession}
              onFinishSession={handleFinishSession}
              onToggleMilestone={handleToggleMilestone}
              onAddMilestoneToTask={handleAddMilestoneToTask}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onOpenEditTask={(task) => {
                setEditingTask(task);
                setIsEditModalOpen(true);
              }}
              freeWindowSummary={freeWindowSummary}
              calendarEvents={calendarEvents}
              onOpenSettings={() => setCurrentTab('settings')}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onOpenCreateModal={() => {
                setEditingTask(null);
                setIsEditModalOpen(true);
              }}
              onOpenEditTask={(task) => {
                setEditingTask(task);
                setIsEditModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onStartSession={handleStartSession}
              onToggleMilestone={handleToggleMilestone}
              onAddMilestoneToTask={handleAddMilestoneToTask}
              onPushToCalendar={handlePushToCalendar}
              hasCalendarToken={hasCalendarToken}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView stats={productivityStats} tasks={tasks} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              freeTimeWindows={freeTimeWindows}
              onUpdateFreeTimeWindows={(w) => {
                setFreeTimeWindows(w);
                saveFreeTimeWindows(w);
                showToast('Working hours updated');
              }}
              exceptions={exceptions}
              onUpdateExceptions={(ex) => {
                setExceptions(ex);
                saveFreeTimeExceptions(ex);
                showToast('Date exceptions updated');
              }}
              user={user}
              hasCalendarToken={hasCalendarToken}
              onGoogleSignIn={handleGoogleSignIn}
              onLogout={handleLogout}
              isLoggingIn={isLoggingIn}
              onSyncCalendar={handleSyncCalendar}
              isSyncingCalendar={isSyncingCalendar}
            />
          )}
        </main>

        {/* Ergonomic Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          hasActiveSession={Boolean(activeSession?.isRunning)}
        />
      </div>

      {/* Voice Task Capture Bottom Sheet */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTaskCreated={handleTaskCreated}
        freeHoursSummary={freeWindowSummary}
        onComputeSlot={(deadline) => computeSlotHelper(deadline)}
      />

      {/* Manual Edit / Create Task Modal */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        onSave={handleSaveTask}
        defaultDate={todayStr}
        defaultStartTime={todaySlot ? minutesToTimeString(todaySlot.startMinutes) : '21:00'}
        defaultEndTime={
          todaySlot
            ? minutesToTimeString(todaySlot.startMinutes + 45)
            : '21:45'
        }
      />

      {/* Gemini Productivity Coach Drawer */}
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        context={{
          tasksCount: tasks.length,
          pendingTasksCount: tasks.filter((t) => t.status !== 'completed').length,
          productivityScore: productivityStats.overallScore,
          freeHoursSummary: freeWindowSummary,
        }}
      />
    </div>
  );
}
