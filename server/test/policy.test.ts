import { describe, expect, it } from 'vitest';
import { resolveGoogleLogin, type GoogleProfile } from '../src/auth/policy';
import { createMemoryUserStore } from '../src/auth/userStore';

const allowlist = new Set(['mere@example.com', 'frere@example.com', 'moi@example.com']);

function profile(overrides: Partial<GoogleProfile>): GoogleProfile {
  return {
    sub: 'sub-1',
    email: 'moi@example.com',
    emailVerified: true,
    name: 'Moi',
    avatarUrl: null,
    ...overrides,
  } as GoogleProfile;
}

describe('resolveGoogleLogin', () => {
  it('refuse email_verified=false sans rien écrire', async () => {
    const users = createMemoryUserStore();
    const decision = await resolveGoogleLogin(profile({ emailVerified: false }), {
      allowlist,
      users,
    });
    expect(decision).toEqual({ allowed: false, reason: 'email_not_verified' });
    expect(users.all()).toHaveLength(0);
  });

  it('refuse un e-mail absent du profil', async () => {
    const users = createMemoryUserStore();
    const decision = await resolveGoogleLogin(profile({ email: undefined }), { allowlist, users });
    expect(decision).toEqual({ allowed: false, reason: 'no_email' });
  });

  it('refuse un e-mail hors allowlist sans écrire en base', async () => {
    const users = createMemoryUserStore();
    const decision = await resolveGoogleLogin(profile({ email: 'autre@example.com' }), {
      allowlist,
      users,
    });
    expect(decision).toEqual({ allowed: false, reason: 'not_allowlisted' });
    expect(users.all()).toHaveLength(0);
  });

  it('accepte un e-mail allowlisté avec une casse différente', async () => {
    const users = createMemoryUserStore();
    const decision = await resolveGoogleLogin(profile({ email: '  Mere@EXAMPLE.com ' }), {
      allowlist,
      users,
    });
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.user.email).toBe('mere@example.com');
      expect(decision.user.googleSub).toBe('sub-1');
    }
  });

  it('relie une ligne préexistante (seedée par e-mail) au sub Google lors de la première connexion', async () => {
    const users = createMemoryUserStore();
    await users.ensureAllowlisted(['frere@example.com']);
    const seeded = users.all()[0];

    const decision = await resolveGoogleLogin(
      profile({ sub: 'sub-frere', email: 'frere@example.com' }),
      {
        allowlist,
        users,
      },
    );

    expect(decision.allowed).toBe(true);
    expect(users.all()).toHaveLength(1);
    expect(users.all()[0]?.id).toBe(seeded?.id);
    expect(users.all()[0]?.googleSub).toBe('sub-frere');
  });

  it("refuse si l'e-mail est déjà lié à un autre sub Google", async () => {
    const users = createMemoryUserStore();
    await resolveGoogleLogin(profile({ sub: 'sub-original', email: 'moi@example.com' }), {
      allowlist,
      users,
    });

    const decision = await resolveGoogleLogin(
      profile({ sub: 'sub-usurpe', email: 'moi@example.com' }),
      {
        allowlist,
        users,
      },
    );

    expect(decision).toEqual({ allowed: false, reason: 'sub_mismatch' });
    expect(users.all()[0]?.googleSub).toBe('sub-original');
  });

  it("met à jour le nom et l'avatar lors d'une reconnexion", async () => {
    const users = createMemoryUserStore();
    await resolveGoogleLogin(profile({ name: 'Ancien' }), { allowlist, users });
    const decision = await resolveGoogleLogin(
      profile({ name: 'Nouveau', avatarUrl: 'https://x/y.jpg' }),
      {
        allowlist,
        users,
      },
    );
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.user.name).toBe('Nouveau');
      expect(decision.user.avatarUrl).toBe('https://x/y.jpg');
    }
  });
});
