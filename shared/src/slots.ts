// Ordre d'affichage de la journée : hors repas passe avant le coucher.
export const SLOTS = ['BREAKFAST', 'OUTSIDE_MEALS', 'LUNCH', 'DINNER', 'BEDTIME'] as const;
export type Slot = (typeof SLOTS)[number];

export const MEAL_RELATIONS = ['BEFORE', 'DURING', 'AFTER', 'AWAY', 'NONE'] as const;
export type MealRelation = (typeof MEAL_RELATIONS)[number];

/**
 * Heure indicative de chaque créneau, au format HH:mm (fuseau Africa/Tunis).
 * Sert uniquement à décider si un créneau est « en retard ». Ce n'est pas un rappel.
 */
export const SLOT_DEFAULT_TIMES: Record<Slot, string> = {
  BREAKFAST: '09:00',
  LUNCH: '13:30',
  DINNER: '20:00',
  BEDTIME: '23:30',
  OUTSIDE_MEALS: '11:00',
};

/** Repas dont l'absence de prise déclenche une alerte aux membres de la famille. */
export const ALERT_SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER'] as const satisfies readonly Slot[];

/** Délai après l'heure indicative du repas avant l'alerte. */
export const ALERT_DELAY_MINUTES = 60;
