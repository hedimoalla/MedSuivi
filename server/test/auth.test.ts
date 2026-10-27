import request from 'supertest';
import session from 'express-session';
import { describe, expect, it } from 'vitest';
import { buildTestApp, googleProfile, testConfig } from './helpers';
import { createMemoryUserStore } from '../src/auth/userStore';

function setCookies(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header : header ? [header] : [];
}

describe('connexion Google et allowlist', () => {
  it("refuse un compte Google qui n'est pas dans l'allowlist, sans créer de session ni d'utilisateur", async () => {
    const users = createMemoryUserStore();
    const { app, profileRef } = buildTestApp({ users });
    profileRef.current = googleProfile({ email: 'inconnu@example.com', id: 'sub-x' });

    const response = await request(app).get('/auth/google/callback?code=abc&state=s');

    expect(response.status).toBe(403);
    expect(response.text).toContain('Accès non autorisé');
    expect(setCookies(response).some((c) => c.startsWith('medsuivi.sid='))).toBe(false);
    expect(users.all()).toHaveLength(0);
  });

  it('ouvre une session pour un compte allowlisté', async () => {
    const { app, profileRef } = buildTestApp();
    profileRef.current = googleProfile({ email: 'moi@example.com', id: 'sub-moi' });
    const agent = request.agent(app);

    const callback = await agent.get('/auth/google/callback?code=abc&state=s');
    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe('/');

    const cookie = setCookies(callback).find((c) => c.startsWith('medsuivi.sid='));
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const me = await agent.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('moi@example.com');
  });

  it("rejette un e-mail non vérifié (email_verified=false), même s'il est allowlisté", async () => {
    const { app, profileRef } = buildTestApp();
    profileRef.current = googleProfile({ email: 'moi@example.com', emailVerified: false });

    const response = await request(app).get('/auth/google/callback?code=abc&state=s');

    expect(response.status).toBe(403);
    expect(setCookies(response).some((c) => c.startsWith('medsuivi.sid='))).toBe(false);
  });

  it('compare les e-mails sans tenir compte de la casse', async () => {
    const { app, profileRef } = buildTestApp();
    profileRef.current = googleProfile({ email: 'MERE@example.COM', id: 'sub-mere' });
    const agent = request.agent(app);

    const callback = await agent.get('/auth/google/callback?code=abc&state=s');
    expect(callback.status).toBe(302);

    const me = await agent.get('/api/me');
    expect(me.body.user.email).toBe('mere@example.com');
  });

  it('retrouve un utilisateur par son sub Google même si son e-mail a changé', async () => {
    const users = createMemoryUserStore();
    const { app, profileRef } = buildTestApp({ users });
    profileRef.current = googleProfile({ email: 'frere@example.com', id: 'sub-frere' });
    await request(app).get('/auth/google/callback?code=a&state=s');
    const firstId = users.all()[0]?.id;

    profileRef.current = googleProfile({ email: 'frere@example.com', id: 'sub-frere' });
    await request(app).get('/auth/google/callback?code=b&state=s');

    expect(users.all()).toHaveLength(1);
    expect(users.all()[0]?.id).toBe(firstId);
  });
});

describe('protection des routes', () => {
  it('renvoie 401 JSON pour une API sans session', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/me');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'unauthenticated' });
  });

  it('renvoie 401 pour une route API inconnue sans session', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/api/medications');
    expect(response.status).toBe(401);
  });

  it('redirige une page sans session vers la connexion', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  it('affiche la page de connexion en français', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/login');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Se connecter avec Google');
    expect(response.text).toContain('href="/auth/google"');
  });

  it('laisse /health accessible sans authentification', async () => {
    const { app } = buildTestApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('ferme la session au logout et renvoie 401 ensuite', async () => {
    const { app, profileRef } = buildTestApp();
    profileRef.current = googleProfile({ email: 'moi@example.com' });
    const agent = request.agent(app);
    await agent.get('/auth/google/callback?code=abc&state=s');
    expect((await agent.get('/api/me')).status).toBe(200);

    const logout = await agent.post('/auth/logout');
    expect(logout.status).toBe(204);

    expect((await agent.get('/api/me')).status).toBe(401);
  });

  it("refuse une requête modifiante venant d'une autre origine", async () => {
    const { app } = buildTestApp();
    const response = await request(app).post('/auth/logout').set('Origin', 'https://evil.example');
    expect(response.status).toBe(403);
  });

  it("déconnecte un utilisateur retiré de l'allowlist dès sa prochaine requête", async () => {
    const users = createMemoryUserStore();
    const sessionStore = new session.MemoryStore();
    const { app, profileRef } = buildTestApp({ users, sessionStore });
    profileRef.current = googleProfile({ email: 'moi@example.com' });
    const callback = await request(app).get('/auth/google/callback?code=abc&state=s');
    const cookie = setCookies(callback)
      .find((c) => c.startsWith('medsuivi.sid='))
      ?.split(';')[0];
    expect(cookie).toBeDefined();

    // Même base et même magasin de sessions, mais « moi » n'est plus dans ALLOWED_EMAILS.
    const reduced = buildTestApp({
      users,
      sessionStore,
      config: testConfig({ ALLOWED_EMAILS: 'mere@example.com' }),
    });
    const response = await request(reduced.app)
      .get('/api/me')
      .set('Cookie', cookie ?? '');
    expect(response.status).toBe(401);
  });
});
