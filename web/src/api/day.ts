import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MealRelation, Slot } from '@medsuivi/shared';
import { apiFetch } from './client';

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

export interface ExtraDose {
  id: string;
  medicationId: string;
  takenAt: string;
  takenByName: string;
  note: string | null;
}

export interface Checklist {
  date: string;
  sections: ChecklistSection[];
  extras: ExtraDose[];
}

/** Rafraîchissement toutes les 20 s, pour que toute la famille voie les mêmes cochages. */
const POLL_MS = 20_000;

export function useDay(date: string) {
  return useQuery({
    queryKey: ['day', date],
    queryFn: () => apiFetch<Checklist>(`/api/days/${date}`),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useToggleDose(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { medicationId: string; slot: Slot; taken: boolean }) =>
      apiFetch<{ ok: true }>(`/api/days/${date}/doses`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['day', date] }),
  });
}

export function useAddExtraDose(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { medicationId: string; note: string | null }) =>
      apiFetch<{ id: string }>(`/api/days/${date}/extra-doses`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['day', date] }),
  });
}

export function useDeleteExtraDose(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/extra-doses/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['day', date] }),
  });
}
