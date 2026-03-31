import { DEFAULT_WORKING_HOURS } from './types';
import type { Service } from './types';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Generate available time slots for a given date and service duration */
export function getTimeSlots(date: Date, service: Service): string[] {
  const dayOfWeek = date.getDay(); // 0=Sun
  const dayKey = DAY_KEYS[dayOfWeek];
  const hours = DEFAULT_WORKING_HOURS[dayKey];

  if (!hours) return []; // closed

  const slots: string[] = [];
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);

  let currentMin = openH * 60 + openM;
  const endMin = closeH * 60 + closeM;

  while (currentMin + service.duration <= endMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    currentMin += 30; // 30-min intervals
  }

  return slots;
}

/** Format date to Hebrew display */
export function formatDateHe(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Format YYYY-MM-DD */
export function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get next N days starting from today */
export function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Get week dates (Sun-Sat) for a given date */
export function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Generate receipt number */
export function generateReceiptNumber(count: number): string {
  return `ARIK-${String(count + 1).padStart(4, '0')}`;
}
