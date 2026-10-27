import {
  Strategy as GoogleStrategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20';
import type { AppConfig } from '../config';
import { resolveGoogleLogin, type GoogleProfile, type LoginDecision } from './policy';
import type { UserStore } from './userStore';

export const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

export function toGoogleProfile(profile: Profile): GoogleProfile {
  const json = (profile._json ?? {}) as { email_verified?: boolean | string };
  const emailVerified = json.email_verified === true || json.email_verified === 'true';
  return {
    sub: profile.id,
    email: profile.emails?.[0]?.value,
    emailVerified,
    name: profile.displayName,
    avatarUrl: profile.photos?.[0]?.value,
  };
}

/** Logique de vérification Google, isolée pour pouvoir être testée sans appel réseau. */
export function createGoogleVerify(deps: { config: AppConfig; users: UserStore }) {
  return (profile: Profile, done: VerifyCallback) => {
    resolveGoogleLogin(toGoogleProfile(profile), {
      allowlist: deps.config.allowedEmails,
      users: deps.users,
    })
      // Passport transporte la décision dans le canal « user » ; la route la déballe et ne crée
      // une session que si decision.allowed est vrai.
      .then((decision: LoginDecision) => done(null, decision as unknown as Express.User))
      .catch((error: unknown) => done(error as Error));
  };
}

export function createGoogleStrategy(deps: {
  config: AppConfig;
  users: UserStore;
}): GoogleStrategy {
  const verify = createGoogleVerify(deps);
  return new GoogleStrategy(
    {
      clientID: deps.config.googleClientId ?? 'missing-client-id',
      clientSecret: deps.config.googleClientSecret ?? 'missing-client-secret',
      callbackURL: `${deps.config.appBaseUrl}/auth/google/callback`,
      state: true,
      scope: GOOGLE_SCOPES,
    },
    (_accessToken, _refreshToken, profile, done) => verify(profile, done),
  );
}
