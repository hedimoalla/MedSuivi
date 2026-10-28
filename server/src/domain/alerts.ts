import { ALERT_DELAY_MINUTES, ALERT_SLOTS, SLOT_DEFAULT_TIMES, type Slot } from '@medsuivi/shared';

export type AlertSlot = (typeof ALERT_SLOTS)[number];

export interface SlotProgress {
  slot: Slot;
  taken: number;
  total: number;
}

/** Heure HH:mm à partir de laquelle l'alerte d'un repas peut partir : heure indicative + délai. */
export function alertTimeFor(slot: AlertSlot): string {
  const [hours, minutes] = SLOT_DEFAULT_TIMES[slot].split(':').map(Number);
  const total = hours * 60 + minutes + ALERT_DELAY_MINUTES;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/**
 * Repas pour lesquels il faut alerter maintenant.
 *
 * - l'heure d'alerte est passée ;
 * - au moins une prise du repas n'est pas cochée, quel que soit le membre qui la cochera ;
 * - aucune alerte n'est déjà partie pour ce repas aujourd'hui.
 *
 * L'appelant fournit uniquement la journée d'aujourd'hui (Africa/Tunis).
 */
export function dueAlerts(input: {
  nowHHmm: string;
  progress: SlotProgress[];
  alreadySent: ReadonlySet<Slot>;
}): AlertSlot[] {
  return ALERT_SLOTS.filter((slot) => {
    const progress = input.progress.find((entry) => entry.slot === slot);
    if (!progress || progress.total === 0) return false;
    if (progress.taken >= progress.total) return false;
    if (input.alreadySent.has(slot)) return false;
    return input.nowHHmm >= alertTimeFor(slot);
  });
}
