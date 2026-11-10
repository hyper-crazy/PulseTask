export interface TaskMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  actualDurationSeconds?: number; // Exact lap time recorded when completed
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskUrgency = 'high' | 'medium' | 'low';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  deadline: string; // ISO date-time string
  actualDurationSeconds: number; // tracked via stopwatch from start to finish
  scheduledDate: string; // "YYYY-MM-DD"
  queueOrder: number; // Sequential position within the day's free-time window (1, 2, 3...)
  scheduledStartTime?: string; // Optional reference to user's free window start
  scheduledEndTime?: string; // Optional reference to user's free window end
  status: TaskStatus;
  urgency: TaskUrgency;
  isMajorTask: boolean;
  milestones: TaskMilestone[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  googleCalendarEventId?: string;
  notes?: string;
}

export interface FreeTimeWindow {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  enabled: boolean;
  startTime: string; // "21:00"
  endTime: string;   // "23:00"
}

export interface FreeTimeException {
  id: string;
  date: string; // "YYYY-MM-DD"
  isDayOff: boolean;
  startTime: string; // "20:00"
  endTime: string;   // "23:30"
  reason?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export interface ProductivityStats {
  overallScore: number; // 0 - 100
  completionRate: number; // percentage
  totalTasksCompleted: number;
  totalSubtasksCompleted: number;
  totalFocusTimeSeconds: number;
  averageTaskSeconds: number;
  currentStreakDays: number;
  onTimeCompletionRate: number; // percentage completed on or before deadline
  weeklyData: {
    dayLabel: string;
    date: string;
    completedCount: number;
    minutesTracked: number;
  }[];
  monthlyData: {
    monthLabel: string;
    completedCount: number;
    hoursTracked: number;
  }[];
}

export interface ActiveSession {
  taskId: string;
  elapsedSeconds: number;
  lastMilestoneLapSeconds: number; // Seconds at previous milestone check for lap calculation
  isRunning: boolean;
  startedTimestamp: number; // epoch ms
}
