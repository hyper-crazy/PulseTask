import {
  FreeTimeWindow,
  FreeTimeException,
  GoogleCalendarEvent,
  TaskItem,
} from '../types';

export interface TimeSlot {
  startMinutes: number; // minutes from midnight (0 - 1439)
  endMinutes: number;
}

export const timeStringToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minutesToTimeString = (totalMinutes: number): string => {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const formatDateToYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getFreeTimeWindowForDate = (
  dateStr: string,
  weeklyWindows: FreeTimeWindow[],
  exceptions: FreeTimeException[]
): TimeSlot | null => {
  // 1. Check day-by-day exception first
  const exception = exceptions.find((e) => e.date === dateStr);
  if (exception) {
    if (exception.isDayOff) return null;
    return {
      startMinutes: timeStringToMinutes(exception.startTime),
      endMinutes: timeStringToMinutes(exception.endTime),
    };
  }

  // 2. Fallback to recurring weekly schedule
  const dateObj = new Date(`${dateStr}T12:00:00`);
  const dayOfWeek = dateObj.getDay();
  const weekly = weeklyWindows.find((w) => w.dayOfWeek === dayOfWeek);

  if (!weekly || !weekly.enabled) return null;

  return {
    startMinutes: timeStringToMinutes(weekly.startTime),
    endMinutes: timeStringToMinutes(weekly.endTime),
  };
};

export interface SchedulingResult {
  scheduledDate: string;
  queueOrder: number;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  freeWindowSummary: string;
}

/**
 * Assigns a task sequentially into the earliest available free-time window
 * before or on the deadline, without any estimated time limits.
 */
export const findFirstAvailableSlot = (
  deadlineIso: string,
  existingTasks: TaskItem[],
  weeklyWindows: FreeTimeWindow[],
  exceptions: FreeTimeException[],
  _calendarEvents: GoogleCalendarEvent[] = [],
  _ignoreTaskId?: string
): SchedulingResult => {
  const today = new Date();
  const deadlineDate = new Date(deadlineIso);

  // Search from today up to deadline for available free window
  for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
    const checkDate = new Date();
    checkDate.setDate(today.getDate() + dayOffset);
    const dateStr = formatDateToYMD(checkDate);

    const freeWindow = getFreeTimeWindowForDate(dateStr, weeklyWindows, exceptions);
    if (!freeWindow) continue;

    // Check existing tasks queued for this date
    const tasksOnDate = existingTasks.filter(
      (t) => t.scheduledDate === dateStr && t.status !== 'completed'
    );

    // Limit to 3 major tasks per free window to keep workload focused
    if (tasksOnDate.length < 3) {
      const queueOrder = tasksOnDate.length + 1;
      const startStr = minutesToTimeString(freeWindow.startMinutes);
      const endStr = minutesToTimeString(freeWindow.endMinutes);

      return {
        scheduledDate: dateStr,
        queueOrder,
        scheduledStartTime: startStr,
        scheduledEndTime: endStr,
        freeWindowSummary: `${startStr} – ${endStr}`,
      };
    }
  }

  // Fallback: earliest free day
  const fallbackDateStr = formatDateToYMD(today);
  const fallbackWindow = getFreeTimeWindowForDate(fallbackDateStr, weeklyWindows, exceptions) || {
    startMinutes: 21 * 60,
    endMinutes: 23 * 60,
  };

  return {
    scheduledDate: fallbackDateStr,
    queueOrder: existingTasks.filter((t) => t.scheduledDate === fallbackDateStr).length + 1,
    scheduledStartTime: minutesToTimeString(fallbackWindow.startMinutes),
    scheduledEndTime: minutesToTimeString(fallbackWindow.endMinutes),
    freeWindowSummary: `${minutesToTimeString(fallbackWindow.startMinutes)} – ${minutesToTimeString(fallbackWindow.endMinutes)}`,
  };
};
