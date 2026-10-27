export const SLOTS = ['BREAKFAST', 'LUNCH', 'DINNER', 'BEDTIME', 'OUTSIDE_MEALS'] as const;
export type Slot = (typeof SLOTS)[number];

export const MEAL_RELATIONS = ['BEFORE', 'DURING', 'AFTER', 'AWAY', 'NONE'] as const;
export type MealRelation = (typeof MEAL_RELATIONS)[number];

/**
 * Heure indicative de chaque créneau, au format HH:mm (fuseau Africa/Tunis).
 * Sert uniquement à décider si un créneau est « en retard ». Ce n'est pas un rappel.
 */
export const SLOT_DEFAULT_TIMES: Record<Slot, string> = {
  BREAKFAST: '10:00',
  LUNCH: '15:00',
  DINNER: '21:00',
  BEDTIME: '23:30',
  OUTSIDE_MEALS: '20:00',
};
