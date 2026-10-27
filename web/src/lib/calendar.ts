import { todayInTunis } from './tunis';

/** Mois au format AAAA-MM. */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function currentMonth(): string {
  return monthOf(todayInTunis());
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year!, m! - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** Premier et dernier jour du mois, au format AAAA-MM-JJ. */
export function monthBounds(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year!, m! - 1, 1));
  const last = new Date(Date.UTC(year!, m!, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

/** Jour de la semaine ISO (1 = lundi … 7 = dimanche). */
export function isoWeekday(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, m! - 1, 1)));
}
