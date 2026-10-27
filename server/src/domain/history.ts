import { addDays } from './dates';
import type { Checklist } from './checklist';

export type DayStatus = 'complete' | 'partial' | 'missed' | 'pending' | 'future' | 'none';

/**
 * État d'un jour pour l'historique.
 * - none : aucune prise prévue ce jour-là
 * - future : jour à venir
 * - pending : aujourd'hui, pas encore terminé
 * - complete / partial / missed : jour passé, toutes / certaines / aucune prise cochées
 */
export function dayStatus(date: string, today: string, taken: number, total: number): DayStatus {
  if (total === 0) return 'none';
  if (date > today) return 'future';
  if (taken === total) return 'complete';
  if (date === today) return 'pending';
  return taken === 0 ? 'missed' : 'partial';
}

/** Liste des dates de from à to, bornes incluses. */
export function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export interface MedicationAdherence {
  medicationId: string;
  name: string;
  planned: number;
  taken: number;
}

/** Nombre de prises prévues et cochées par médicament, sur plusieurs jours. */
export function adherenceByMedication(checklists: Checklist[]): MedicationAdherence[] {
  const totals = new Map<string, MedicationAdherence>();
  for (const checklist of checklists) {
    for (const section of checklist.sections) {
      for (const item of section.items) {
        const entry = totals.get(item.medicationId) ?? {
          medicationId: item.medicationId,
          name: item.name,
          planned: 0,
          taken: 0,
        };
        entry.planned += 1;
        if (item.taken) entry.taken += 1;
        totals.set(item.medicationId, entry);
      }
    }
  }
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function percent(taken: number, planned: number): number {
  return planned === 0 ? 0 : Math.round((taken / planned) * 100);
}
