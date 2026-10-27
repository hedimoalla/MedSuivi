import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MealRelation, Slot } from '@medsuivi/shared';
import { apiFetch } from './client';

export interface ScheduleRow {
  id: string;
  slot: Slot;
  mealRelation: MealRelation;
  dose: string;
  notes: string | null;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
}

export interface Medication {
  id: string;
  name: string;
  archivedAt: string | null;
  schedules: ScheduleRow[];
}

export interface ScheduleInput {
  slot: Slot;
  mealRelation: MealRelation;
  dose: string;
  notes: string | null;
  daysOfWeek: number[];
  endDate: string | null;
}

export interface MedicationInput {
  name: string;
  effectiveDate: string;
  schedules: ScheduleInput[];
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  entityId: string;
  user: string;
  before: { name?: string } | null;
  after: { name?: string } | null;
}

const MEDICATIONS_KEY = ['medications'] as const;

export function useMedications(includeArchived: boolean) {
  return useQuery({
    queryKey: [...MEDICATIONS_KEY, { includeArchived }],
    queryFn: async () =>
      (
        await apiFetch<{ medications: Medication[] }>(
          `/api/medications?includeArchived=${includeArchived}`,
        )
      ).medications,
  });
}

export function useSaveMedication(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MedicationInput) => {
      const path = id ? `/api/medications/${id}` : '/api/medications';
      const method = id ? 'PUT' : 'POST';
      return apiFetch<{ medication: Medication }>(path, {
        method,
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  });
}

export function useArchiveAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: 'archive' | 'restore') =>
      apiFetch<{ medication: Medication }>(`/api/medications/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  });
}

export function useAudit() {
  return useQuery({
    queryKey: ['audit'],
    queryFn: async () =>
      (await apiFetch<{ entries: AuditEntry[] }>('/api/audit?limit=100')).entries,
  });
}
