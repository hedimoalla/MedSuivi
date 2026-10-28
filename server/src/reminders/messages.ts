import type { AlertSlot } from '../domain/alerts';

/**
 * Textes des notifications, affichés sur l'écran verrouillé du téléphone.
 * Aucun nom de médicament ici : seulement le repas concerné.
 */
const MEAL_LABELS: Record<AlertSlot, string> = {
  BREAKFAST: 'petit-déjeuner',
  LUNCH: 'déjeuner',
  DINNER: 'dîner',
};

export interface PushPayload {
  title: string;
  body: string;
  /** Une notification par repas et par jour : la suivante remplace la précédente. */
  tag: string;
  /** Page ouverte au clic. */
  url: string;
}

export function alertPayload(date: string, slot: AlertSlot): PushPayload {
  return {
    title: 'MedSuivi',
    body: `Prise du ${MEAL_LABELS[slot]} non enregistrée`,
    tag: `alert-${date}-${slot}`,
    url: '/',
  };
}
