# Unconstrained Focus & Subtask Lap Timer Architecture

Removes all artificial time estimates and countdown pressures, giving users complete freedom to work at their own pace while accurately recording the exact time taken for each task and individual subtask via a smart lap timer.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions implement your requested workflow:

- **Complete Elimination of Estimated Times**: No more artificial time estimates (e.g. "~45m", "Est: 2 hours") anywhere in task creation, voice breakdown, subtasks, or cards. A person works at their own speed with zero time pressure.
- **Sequential Queue within Free-Time Windows**: Tasks scheduled for a day are queued sequentially ("Task 1 in Free Window", "Task 2 in Free Window") instead of being forced into arbitrary start/end minute slots. Focus is strictly on one task at a time.
- **Subtask Lap Timer**: When working on a task, the stopwatch tracks overall focus time while recording the exact duration taken for each individual subtask the moment it is marked done (e.g. *"Subtask 1 completed in 18m 32s"*).
- **Productivity Score without Estimates**: The productivity progression score now rewards authentic accomplishments rather than estimate accuracy:
  - **45% On-Time Completion**: Finishing tasks and subtasks on or before the spoken deadline (e.g. December 29th).
  - **30% Focus Consistency**: Showing up and completing sessions within your manual free hours.
  - **25% Dedicated Focus Hours**: Total hours of genuine focus logged across finished tasks and subtasks.
- **Preserved Milestone Decomposition & Add Option**: Spoken tasks continue to be broken down into structured logical steps/subtasks, and the "+ Add Subtask" affordance remains so you can add more tasks anytime.

---

## 1. Overview & Core Concept

### What It Does
When the user speaks a task, PulseTask divides it into logical milestones without assigning any arbitrary minutes to them. The task enters the user's sequential queue for their free-time window. The user simply taps "Start Session", and the stopwatch begins from `00:00:00`. As each subtask is checked off, its exact elapsed time is stamped. When the entire task is finished, the total duration from start to finish is preserved in the history log, fueling weekly and monthly progress charts.

---

## 2. User Experience & Visual Design

### The Unconstrained Work Flow

```
[Spoken Task: "Submit thesis paper on Dec 29"]
                      │
   [Divided into Logical Steps without Estimates]
   • Step 1: Literature review & outline
   • Step 2: Draft methodology & chapters
   • Step 3: Proofreading, citations & submission
   • (+ Option to add more subtasks)
                      │
[Queued in Free Window (9:00 PM – 11:00 PM)]
                      │
             [Tap "Start Session"]
                      │
┌────────────────────────────────────────────────────────┐
│               Active Live Session Card                 │
│  Stopwatch: 00:23:45 (Counting Up)                     │
│                                                        │
│  [✓] Step 1: Literature review (Done in 14m 10s)       │
│  [ ] Step 2: Draft methodology                         │
│  [ ] Step 3: Proofreading & submission                 │
│                                                        │
│  [Finish Task & Mark Done]                             │
└────────────────────────────────────────────────────────┘
                      │
   [Task Recorded with Total Duration & Step Laps]
```

---

## 3. Technical Architecture & Data Strategy

### Updated Data Models (`src/types.ts`)
```typescript
export interface TaskMilestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  actualDurationSeconds?: number; // Exact lap time recorded when checked
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  deadline: string; // ISO date
  actualDurationSeconds: number; // Total recorded duration from start to finish
  scheduledDate: string; // "YYYY-MM-DD"
  queueOrder: number; // Sequential position within the day's free window
  status: 'pending' | 'in_progress' | 'completed';
  urgency: 'high' | 'medium' | 'low';
  milestones: TaskMilestone[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
```

### Revised Productivity Scoring Engine (`src/services/storage.ts`)
- **Deadline Adherence Rate (45%)**: Ratio of tasks completed on or before their deadline date.
- **Window Consistency (30%)**: Consecutive active days with focused sessions logged during manual free hours.
- **Cumulative Focus Time (25%)**: Rewards building deep focus momentum across logged hours.

---

## 4. Execution Steps

1. **Remove Estimated Times from Models & Parsers**:
   - Update `src/types.ts` to remove `estimatedMinutes` from `TaskItem` and `TaskMilestone`. Add `actualDurationSeconds` to `TaskMilestone`.
   - Update `src/services/dateParser.ts` and `server.ts` to output clean subtasks without any time estimates.
2. **Implement Subtask Lap Timer in `TodayView.tsx` & `App.tsx`**:
   - When a subtask checkbox is clicked during an active session, compute the lap time from session start (or previous subtask) and record it directly on that subtask.
   - Display the completed lap time alongside finished subtasks (e.g., *"14m 20s"*).
3. **Update UI Across All Views**:
   - `VoiceModal.tsx`: Remove estimated minutes inputs and summary badges. Keep subtask list and "+ Add Subtask".
   - `TodayView.tsx`: Replace arbitrary start/end minute slots with sequential queue badges ("Task 1 in Free Window", "Task 2 in Free Window").
   - `TasksView.tsx`: Display actual recorded time for completed tasks and clean subtask counts without estimates.
   - `AnalyticsView.tsx`: Display actual logged hours, subtask breakdown, and the revised productivity progression score.
4. **Verification**: Compile and lint the applet, test subtask lap recording, and verify clean schedule flow.
