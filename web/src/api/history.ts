import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export type DayStatus = 'complete' | 'partial' | 'missed' | 'pending' | 'future' | 'none';

export interface HistoryDay {
  date: string;
  status: DayStatus;
  taken: number;
  total: number;
}

export function useHistory(from: string, to: string) {
  return useQuery({
    queryKey: ['history', from, to],
    queryFn: () =>
      apiFetch<{ today: string; days: HistoryDay[] }>(`/api/history?from=${from}&to=${to}`),
    staleTime: 30_000,
  });
}

export interface Report {
  generatedAt: string;
  today: string;
  from: string;
  to: string;
  days: number;
  medications: {
    name: string;
    schedules: {
      slot: string;
      mealRelation: string;
      dose: string;
      notes: string | null;
      daysOfWeek: number[];
    }[];
  }[];
  adherence: { taken: number; planned: number; percent: number };
  perMedication: {
    medicationId: string;
    name: string;
    planned: number;
    taken: number;
    percent: number;
  }[];
  extras: { date: string; name: string; takenAt: string; takenBy: string; note: string | null }[];
}

export function useReport(days: number) {
  return useQuery({
    queryKey: ['report', days],
    queryFn: () => apiFetch<Report>(`/api/report?days=${days}`),
    staleTime: 60_000,
  });
}
