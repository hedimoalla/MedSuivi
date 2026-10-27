import { SLOTS, type MealRelation, type Slot } from '@medsuivi/shared';
import { activeOn, type ScheduleRow } from './schedules';

/** Jour de la semaine ISO (1 = lundi … 7 = dimanche) pour une date YYYY-MM-DD. */
export function isoWeekday(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export interface MedicationForDay {
  id: string;
  name: string;
  archivedAt: string | null;
  schedules: ScheduleRow[];
}

export interface DoseLogForDay {
  medicationId: string;
  slot: Slot;
  takenAt: string;
  takenByName: string;
}

export interface ExtraDoseForDay {
  id: string;
  medicationId: string;
  takenAt: string;
  takenByName: string;
  note: string | null;
}

export interface ChecklistItem {
  medicationId: string;
  name: string;
  dose: string;
  notes: string | null;
  mealRelation: MealRelation;
  taken: boolean;
  takenAt: string | null;
  takenBy: string | null;
}

export interface ChecklistSection {
  slot: Slot;
  items: ChecklistItem[];
  taken: number;
  total: number;
}

export interface Checklist {
  date: string;
  sections: ChecklistSection[];
  extras: ExtraDoseForDay[];
}

/**
 * Construit la checklist d'un jour à partir des horaires effectifs à cette date.
 *
 * - Une prise n'apparaît que si elle est active ce jour-là et si le jour de la semaine est coché.
 * - Un médicament archivé n'apparaît que s'il a des prises enregistrées ce jour-là (historique).
 * - Les sections suivent l'ordre de la journée, même si elles sont vides.
 */
export function buildChecklist(
  date: string,
  medications: MedicationForDay[],
  doseLogs: DoseLogForDay[],
  extras: ExtraDoseForDay[],
): Checklist {
  const weekday = isoWeekday(date);
  const sections: ChecklistSection[] = SLOTS.map((slot) => ({
    slot,
    items: [],
    taken: 0,
    total: 0,
  }));
  const sectionFor = (slot: Slot) => sections.find((section) => section.slot === slot)!;

  for (const medication of medications) {
    const hasLogToday = doseLogs.some((log) => log.medicationId === medication.id);
    if (medication.archivedAt && !hasLogToday) continue;

    for (const row of activeOn(medication.schedules, date)) {
      if (!row.daysOfWeek.includes(weekday)) continue;

      const log = doseLogs.find(
        (entry) => entry.medicationId === medication.id && entry.slot === row.slot,
      );
      const section = sectionFor(row.slot);
      section.items.push({
        medicationId: medication.id,
        name: medication.name,
        dose: row.dose,
        notes: row.notes,
        mealRelation: row.mealRelation,
        taken: Boolean(log),
        takenAt: log?.takenAt ?? null,
        takenBy: log?.takenByName ?? null,
      });
    }
  }

  for (const section of sections) {
    section.items.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    section.total = section.items.length;
    section.taken = section.items.filter((item) => item.taken).length;
  }

  return { date, sections, extras };
}
