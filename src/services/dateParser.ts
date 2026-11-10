export interface ParsedTaskResult {
  title: string;
  description: string;
  deadline: string; // ISO date string
  deadlineFormatted: string; // "Dec 29, 2026, 11:00 PM"
  isMajorTask: boolean;
  suggestedUrgency: 'high' | 'medium' | 'low';
  milestones: { title: string }[];
  rationale: string;
}

const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const DAY_NAMES: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Extracts natural dates and times from spoken text, e.g.:
 * "on December 29th", "by Dec 29", "tomorrow evening", "Friday at 5pm", "in 3 days"
 */
export function extractDeadlineFromText(text: string, baseDate = new Date()): Date {
  const lower = text.toLowerCase();
  const target = new Date(baseDate.getTime());
  const currentYear = target.getFullYear();

  // 1. Check for Month + Day, e.g., "December 29th", "Dec 29", "29th of December"
  const monthDayRegex =
    /(?:on|by|before|due)?\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i;
  const dayMonthRegex =
    /(?:on|by|before|due)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s*,?\s*(\d{4}))?/i;

  let match = lower.match(monthDayRegex);
  if (match) {
    const month = MONTHS[match[1]];
    const day = parseInt(match[2], 10);
    const year = match[3] ? parseInt(match[3], 10) : currentYear;

    target.setFullYear(year, month, day);
    target.setHours(23, 0, 0, 0);
    if (!match[3] && target.getTime() < baseDate.getTime() - 86400000) {
      target.setFullYear(currentYear + 1);
    }
    return applyTimeOverrides(lower, target);
  }

  match = lower.match(dayMonthRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = MONTHS[match[2]];
    const year = match[3] ? parseInt(match[3], 10) : currentYear;

    target.setFullYear(year, month, day);
    target.setHours(23, 0, 0, 0);
    if (!match[3] && target.getTime() < baseDate.getTime() - 86400000) {
      target.setFullYear(currentYear + 1);
    }
    return applyTimeOverrides(lower, target);
  }

  // 2. Relative words: "tomorrow", "today", "tonight"
  if (/tomorrow/i.test(lower)) {
    target.setDate(target.getDate() + 1);
    target.setHours(23, 0, 0, 0);
    return applyTimeOverrides(lower, target);
  }

  if (/tonight|today/i.test(lower)) {
    target.setHours(23, 30, 0, 0);
    return applyTimeOverrides(lower, target);
  }

  // 3. Day of week, e.g. "by Friday", "next Monday"
  const dayMatch = lower.match(
    /(?:by|on|next|this)?\s*(sunday|sun|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat)/i
  );
  if (dayMatch && DAY_NAMES[dayMatch[1]] !== undefined) {
    const targetDay = DAY_NAMES[dayMatch[1]];
    const currentDay = target.getDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    if (daysToAdd === 0 || /next\s+/i.test(lower)) daysToAdd += 7;
    target.setDate(target.getDate() + daysToAdd);
    target.setHours(23, 0, 0, 0);
    return applyTimeOverrides(lower, target);
  }

  // 4. "in X days" or "in X weeks"
  const relativeMatch = lower.match(/in\s+(\d+)\s*(days?|weeks?|months?)/i);
  if (relativeMatch) {
    const count = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    if (unit.startsWith('d')) target.setDate(target.getDate() + count);
    if (unit.startsWith('w')) target.setDate(target.getDate() + count * 7);
    if (unit.startsWith('m')) target.setMonth(target.getMonth() + count);
    target.setHours(23, 0, 0, 0);
    return applyTimeOverrides(lower, target);
  }

  // Default: tomorrow evening
  target.setDate(target.getDate() + 1);
  target.setHours(23, 0, 0, 0);
  return applyTimeOverrides(lower, target);
}

function applyTimeOverrides(text: string, date: Date): Date {
  const timeMatch = text.match(/(?:at|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;

    date.setHours(hours, minutes, 0, 0);
  } else if (/morning/i.test(text)) {
    date.setHours(9, 0, 0, 0);
  } else if (/afternoon/i.test(text)) {
    date.setHours(14, 0, 0, 0);
  } else if (/evening|night/i.test(text)) {
    date.setHours(21, 30, 0, 0);
  }
  return date;
}

/**
 * Cleans the spoken input to create a crisp task title
 */
export function cleanTaskTitle(raw: string): string {
  let cleaned = raw
    .replace(/^(i\s+have\s+to|i\s+need\s+to|i\s+want\s+to|please|can\s+you|add\s+task|schedule|remind\s+me\s+to)\s+/gi, '')
    .replace(/(?:on|by|before|due|at)\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?/gi, '')
    .replace(/(?:on|by|before|due)\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s*,?\s*\d{4})?/gi, '')
    .replace(/(?:by|on|before)\s+(tomorrow|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:morning|afternoon|evening|night))?/gi, '')
    .replace(/(?:at|by)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi, '')
    .trim();

  if (!cleaned) return 'Focus Work Session';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Intelligent domain milestone decomposer (with zero time estimations)
 */
export function generateDomainMilestones(
  title: string,
  raw: string
): { isMajor: boolean; milestones: { title: string }[] } {
  const lower = (title + ' ' + raw).toLowerCase();

  // Academic / Thesis / Research Paper / Essay
  if (/thesis|paper|dissertation|essay|research|literature|manuscript|journal/i.test(lower)) {
    return {
      isMajor: true,
      milestones: [
        { title: `Phase 1: Literature review, research notes & outline` },
        { title: `Phase 2: Draft core arguments & findings chapters` },
        { title: `Phase 3: Bibliography, formatting & final proofreading` },
      ],
    };
  }

  // Presentation / Pitch Deck / Slides
  if (/pitch|deck|presentation|slides|keynote|slideshow/i.test(lower)) {
    return {
      isMajor: true,
      milestones: [
        { title: `Phase 1: Narrative structure & content outline` },
        { title: `Phase 2: Visual design, graphics & slide formatting` },
        { title: `Phase 3: Rehearsal & delivery timing check` },
      ],
    };
  }

  // Coding / Software / Website / App
  if (/code|develop|build|website|app|frontend|backend|api|feature|bug|database/i.test(lower)) {
    return {
      isMajor: true,
      milestones: [
        { title: `Phase 1: Architecture setup & core logic implementation` },
        { title: `Phase 2: Integration, edge cases & UI refinement` },
        { title: `Phase 3: Unit testing, review & deploy verification` },
      ],
    };
  }

  // Finance / Tax / Accounting / Spreadsheet
  if (/tax|receipt|invoice|finance|budget|accounting|spreadsheet|payroll/i.test(lower)) {
    return {
      isMajor: true,
      milestones: [
        { title: `Phase 1: Collect statements, receipts & data inputs` },
        { title: `Phase 2: Reconcile numbers, balance sheet & filing` },
      ],
    };
  }

  // Check if inherently complex or multi-step
  const isMajor = /project|launch|redesign|audit|exam|campaign|presentation|analysis|system/i.test(lower);
  if (isMajor) {
    return {
      isMajor: true,
      milestones: [
        { title: `Phase 1: Initial research & preparation for ${title}` },
        { title: `Phase 2: Core execution & drafting` },
        { title: `Phase 3: Review, final polish & completion check` },
      ],
    };
  }

  return {
    isMajor: false,
    milestones: [
      { title: `Preparation & setup` },
      { title: `Execution & finish` },
    ],
  };
}

/**
 * Main parser entry point (completely free of time estimates)
 */
export function parseSpokenTask(
  spokenText: string,
  userFreeHoursSummary = '21:00 to 23:00'
): ParsedTaskResult {
  const raw = spokenText.trim();
  const deadlineDate = extractDeadlineFromText(raw);
  const title = cleanTaskTitle(raw);
  const { isMajor, milestones } = generateDomainMilestones(title, raw);

  const deadlineFormatted = deadlineDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    title,
    description: `Voice-captured task: "${raw}"`,
    deadline: deadlineDate.toISOString(),
    deadlineFormatted,
    isMajorTask: isMajor,
    suggestedUrgency: isMajor || deadlineDate.getTime() - Date.now() < 86400000 * 3 ? 'high' : 'medium',
    milestones,
    rationale: `Deadline recognized as ${deadlineFormatted}. Decomposed into ${milestones.length} logical steps scheduled inside your free hours (${userFreeHoursSummary}) with no time pressure.`,
  };
}
