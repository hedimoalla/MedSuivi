import { z } from 'zod';
import { ISO_DATE_PATTERN, MEAL_RELATIONS, SLOTS } from '@medsuivi/shared';
import { addDays, isValidIsoDate } from './dates';

export const isoDateSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, 'Date attendue au format AAAA-MM-JJ')
  .refine(isValidIsoDate, 'Date inexistante');

export const scheduleSpecSchema = z.object({
  slot: z.enum(SLOTS),
  mealRelation: z.enum(MEAL_RELATIONS).default('NONE'),
  dose: z.string().trim().min(1, 'La dose est requise').max(60),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => value || null),
  daysOfWeek: z
    .array(z.number().int().min(1).max(7))
    .min(1, 'Choisissez au moins un jour')
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  endDate: isoDateSchema.nullish().transform((value) => value ?? null),
});

export type ScheduleSpec = z.infer<typeof scheduleSpecSchema>;

export const medicationInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Le nom est requis').max(120),
    effectiveDate: isoDateSchema,
    schedules: z.array(scheduleSpecSchema).min(1, 'Ajoutez au moins une prise').max(12),
  })
  .superRefine((input, ctx) => {
    const slots = input.schedules.map((schedule) => schedule.slot);
    if (new Set(slots).size !== slots.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['schedules'],
        message: 'Un même créneau ne peut apparaître qu’une fois par médicament',
      });
    }
  });

export type MedicationInput = z.infer<typeof medicationInputSchema>;

/** Ligne d'horaire telle qu'elle est stockée. Les dates sont au format YYYY-MM-DD. */
export interface ScheduleRow {
  id: string;
  slot: ScheduleSpec['slot'];
  mealRelation: ScheduleSpec['mealRelation'];
  dose: string;
  notes: string | null;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
}

export interface SchedulePlan {
  /** Lignes qui n'ont jamais été appliquées (début le jour du changement ou après) : supprimées. */
  delete: string[];
  /** Lignes en cours : leur fin passe à la veille du changement. */
  close: { id: string; endDate: string }[];
  /** Nouvelles lignes, valables à partir de la date d'effet. */
  create: (ScheduleSpec & { startDate: string })[];
}

/**
 * Calcule les modifications à appliquer quand on change les horaires d'un médicament.
 *
 * Règle : tout ce qui s'est déjà appliqué avant `effectiveDate` reste figé, pour que le
 * passé (et les cochages) ne changent jamais. Les lignes qui ne se sont jamais appliquées
 * sont remplacées directement.
 */
export function planScheduleChange(
  existing: ScheduleRow[],
  effectiveDate: string,
  specs: ScheduleSpec[],
): SchedulePlan {
  const plan: SchedulePlan = { delete: [], close: [], create: [] };
  const veille = addDays(effectiveDate, -1);

  for (const row of existing) {
    const endsBefore = row.endDate !== null && row.endDate < effectiveDate;
    if (endsBefore) {
      // Historique : jamais modifié.
      continue;
    }
    if (row.startDate >= effectiveDate) {
      // Jamais appliquée : elle est remplacée.
      plan.delete.push(row.id);
      continue;
    }
    // En cours : elle s'arrête la veille de la modification.
    plan.close.push({ id: row.id, endDate: veille });
  }

  for (const spec of specs) {
    plan.create.push({ ...spec, startDate: effectiveDate });
  }
  return plan;
}

/** Lignes actives à une date donnée (utile pour afficher « ce qui est prescrit aujourd'hui »). */
export function activeOn(rows: ScheduleRow[], date: string): ScheduleRow[] {
  return rows.filter(
    (row) => row.startDate <= date && (row.endDate === null || row.endDate >= date),
  );
}
