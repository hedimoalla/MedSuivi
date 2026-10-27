import type { ScheduleRow } from '../api/medications';

/** Prises actives à une date donnée, comme côté serveur. */
export function activeOn(rows: ScheduleRow[], date: string): ScheduleRow[] {
  return rows.filter(
    (row) => row.startDate <= date && (row.endDate === null || row.endDate >= date),
  );
}
