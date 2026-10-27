import session from 'express-session';
import type { Profile } from 'passport-google-oauth20';
import type { Strategy as PassportStrategy } from 'passport';
import { loadConfig, type AppConfig } from '../src/config';
import { createApp } from '../src/app';
import { createGoogleVerify } from '../src/auth/googleStrategy';
import { createMemoryUserStore, type UserStore } from '../src/auth/userStore';

export const ALLOWED = ['Mere@Example.com', 'frere@example.com', 'moi@example.com'];

export function testConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://unused',
    SESSION_SECRET: 'x'.repeat(40),
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    APP_BASE_URL: 'http://localhost:3000',
    ALLOWED_EMAILS: ALLOWED.join(','),
    ...overrides,
  });
}

export function googleProfile(overrides: {
  id?: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
}): Profile {
  return {
    provider: 'google',
    id: overrides.id ?? 'google-sub-1',
    displayName: overrides.name ?? 'Test Utilisateur',
    emails: [{ value: overrides.email ?? 'moi@example.com', verified: 'true' }],
    photos: [{ value: 'https://lh3.googleusercontent.com/photo.jpg' }],
    _json: { email_verified: overrides.emailVerified ?? true },
  } as unknown as Profile;
}

/**
 * Remplace Google : au lieu de rediriger vers accounts.google.com, la stratégie prend
 * le profil fourni par le test et passe par le vrai code de vérification (verify).
 */
export function fakeGoogleStrategy(
  verify: ReturnType<typeof createGoogleVerify>,
  profileRef: { current: Profile },
): PassportStrategy {
  return {
    name: 'google',
    authenticate(this: unknown) {
      const self = this as {
        success: (user: unknown) => void;
        error: (error: unknown) => void;
        redirect: (url: string) => void;
      };
      verify(profileRef.current, (error, user) => {
        if (error) {
          self.error(error);
          return;
        }
        self.success(user);
      });
    },
  } as unknown as PassportStrategy;
}

export function buildTestApp(
  options: { config?: AppConfig; users?: UserStore; sessionStore?: session.Store } = {},
) {
  const config = options.config ?? testConfig();
  const users = options.users ?? createMemoryUserStore();
  const profileRef = { current: googleProfile({}) };
  const verify = createGoogleVerify({ config, users });
  const app = createApp({
    config,
    users,
    sessionStore: options.sessionStore ?? new session.MemoryStore(),
    webDist: '/nonexistent-web-dist',
    googleStrategy: fakeGoogleStrategy(verify, profileRef),
  });
  return { app, config, users, profileRef };
}
