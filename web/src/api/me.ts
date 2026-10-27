import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface Me {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiFetch<{ user: Me }>('/api/me')).user,
    staleTime: 5 * 60 * 1000,
  });
}
