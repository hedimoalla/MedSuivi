export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

/**
 * Appel JSON vers l'API. Une réponse 401 renvoie vers la page de connexion.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401) {
    window.location.assign('/login');
    throw new ApiError(401, 'unauthenticated');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(response.status, body.error ?? 'unknown');
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
