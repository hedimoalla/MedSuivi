import type { UserStore, UserRecord } from './userStore';

export interface GoogleProfile {
  sub: string;
  email: string | undefined;
  emailVerified: boolean;
  name: string | undefined;
  avatarUrl: string | undefined;
}

export type LoginDecision =
  | { allowed: true; user: UserRecord }
  | {
      allowed: false;
      reason: 'email_not_verified' | 'no_email' | 'not_allowlisted' | 'sub_mismatch';
    };

/**
 * Décide si un compte Google peut ouvrir une session.
 * C'est la barrière de sécurité principale : l'allowlist est vérifiée avant toute écriture.
 */
export async function resolveGoogleLogin(
  profile: GoogleProfile,
  deps: { allowlist: ReadonlySet<string>; users: UserStore; now?: Date },
): Promise<LoginDecision> {
  if (!profile.emailVerified) {
    return { allowed: false, reason: 'email_not_verified' };
  }
  if (!profile.email) {
    return { allowed: false, reason: 'no_email' };
  }

  const email = profile.email.trim().toLowerCase();
  if (!deps.allowlist.has(email)) {
    return { allowed: false, reason: 'not_allowlisted' };
  }

  const bySub = await deps.users.findByGoogleSub(profile.sub);
  const byEmail = bySub ? null : await deps.users.findByEmail(email);

  // Une ligne trouvée par e-mail mais liée à un autre "sub" Google est suspecte : on refuse.
  if (byEmail?.googleSub && byEmail.googleSub !== profile.sub) {
    return { allowed: false, reason: 'sub_mismatch' };
  }

  const user = await deps.users.upsertFromLogin({
    existingId: bySub?.id ?? byEmail?.id ?? null,
    googleSub: profile.sub,
    email,
    name: profile.name ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    lastLoginAt: deps.now ?? new Date(),
  });

  return { allowed: true, user };
}
