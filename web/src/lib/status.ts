import { SLOT_DEFAULT_TIMES, type Slot } from '@medsuivi/shared';

export type SlotStatus = 'done' | 'late' | 'pending' | 'empty';

/**
 * État d'un créneau pour une date donnée.
 * - terminé : toutes les prises cochées
 * - en retard : incomplet, et le jour est passé ou l'heure indicative du créneau est dépassée
 * - à venir : incomplet, pas encore en retard
 */
export function slotStatus(
  slot: Slot,
  taken: number,
  total: number,
  date: string,
  today: string,
  nowHHmm: string,
): SlotStatus {
  if (total === 0) return 'empty';
  if (taken === total) return 'done';
  if (date < today) return 'late';
  if (date === today && nowHHmm >= SLOT_DEFAULT_TIMES[slot]) return 'late';
  return 'pending';
}
