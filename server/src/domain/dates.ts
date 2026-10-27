import { formatInTimeZone } from 'date-fns-tz';
import { APP_TIMEZONE } from '@medsuivi/shared';

/** Date du jour au format YYYY-MM-DD, calculée dans le fuseau de l'application. */
export function todayInTunis(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-dd');
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Vrai si la chaîne est une date calendaire réelle (ex. 2026-02-30 est refusé). */
export function isValidIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
