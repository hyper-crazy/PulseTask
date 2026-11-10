import { getAccessToken } from './firebaseAuth';
import { GoogleCalendarEvent, TaskItem } from '../types';

export const fetchCalendarEventsForDate = async (
  dateStr: string // "YYYY-MM-DD"
): Promise<GoogleCalendarEvent[]> => {
  const token = await getAccessToken();
  if (!token) return [];

  const timeMin = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const timeMax = new Date(`${dateStr}T23:59:59Z`).toISOString();

  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', timeMin);
    url.searchParams.append('timeMax', timeMax);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn('Google Calendar auth token expired or unauthorized');
      }
      return [];
    }

    const data = await res.json();
    return (data.items || []) as GoogleCalendarEvent[];
  } catch (err) {
    console.error('Failed to fetch Google Calendar events:', err);
    return [];
  }
};

export const createCalendarEvent = async (
  task: TaskItem
): Promise<string | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const startIso = `${task.scheduledDate}T${task.scheduledStartTime}:00`;
    const endIso = `${task.scheduledDate}T${task.scheduledEndTime}:00`;

    const description = `PulseTask Scheduled Session\nTarget Deadline: ${new Date(
      task.deadline
    ).toLocaleString()}\n\nSubtasks & Milestones:\n${task.milestones
      .map((m, i) => `${i + 1}. [${m.completed ? 'x' : ' '}] ${m.title}`)
      .join('\n')}`;

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `🎯 ${task.title}`,
          description,
          start: {
            dateTime: new Date(startIso).toISOString(),
          },
          end: {
            dateTime: new Date(endIso).toISOString(),
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error('Failed to create calendar event:', err);
      return null;
    }

    const created = await res.json();
    return created.id || null;
  } catch (err) {
    console.error('Error creating calendar event:', err);
    return null;
  }
};

export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.ok;
  } catch (err) {
    console.error('Failed to delete calendar event:', err);
    return false;
  }
};
