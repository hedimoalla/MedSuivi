import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

const base = {
  DATABASE_URL: 'postgresql://unused',
  SESSION_SECRET: 'x'.repeat(40),
  APP_BASE_URL: 'http://localhost:3000',
  ALLOWED_EMAILS: 'moi@example.com',
};

describe('loadConfig', () => {
  it('refuse DEV_AUTH_BYPASS hors développement', () => {
    expect(() =>
      loadConfig({
        ...base,
        NODE_ENV: 'production',
        DEV_AUTH_BYPASS: 'true',
        GOOGLE_CLIENT_ID: 'a',
        GOOGLE_CLIENT_SECRET: 'b',
      }),
    ).toThrow(/DEV_AUTH_BYPASS/);
  });

  it('refuse DEV_AUTH_BYPASS en test', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'test', DEV_AUTH_BYPASS: 'true' })).toThrow(
      /DEV_AUTH_BYPASS/,
    );
  });

  it('accepte DEV_AUTH_BYPASS en développement', () => {
    const config = loadConfig({ ...base, NODE_ENV: 'development', DEV_AUTH_BYPASS: 'true' });
    expect(config.devAuthBypass).toBe(true);
  });

  it('exige les identifiants Google en production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production' })).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it('exige une allowlist non vide', () => {
    expect(() => loadConfig({ ...base, ALLOWED_EMAILS: ' , ', NODE_ENV: 'development' })).toThrow(
      /ALLOWED_EMAILS/,
    );
  });

  it("normalise l'allowlist en minuscules", () => {
    const config = loadConfig({
      ...base,
      NODE_ENV: 'development',
      ALLOWED_EMAILS: ' Mere@X.com, frere@x.com ',
    });
    expect([...config.allowedEmails]).toEqual(['mere@x.com', 'frere@x.com']);
  });

  it("exige un SESSION_SECRET d'au moins 32 caractères", () => {
    expect(() => loadConfig({ ...base, SESSION_SECRET: 'court', NODE_ENV: 'development' })).toThrow(
      /SESSION_SECRET/,
    );
  });

  it('refuse les alertes activées sans clés VAPID', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'development', ALERTS_ENABLED: 'true' })).toThrow(
      /VAPID/,
    );
  });

  it('désactive les alertes par défaut, sans clés VAPID', () => {
    const config = loadConfig({ ...base, NODE_ENV: 'development' });
    expect(config.alertsEnabled).toBe(false);
    expect(config.vapid).toBeNull();
  });
});
