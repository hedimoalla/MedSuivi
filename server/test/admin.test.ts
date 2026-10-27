import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { requireAdmin } from '../src/auth/requireAuth';
import { loadConfig } from '../src/config';

function run(user: { isAdmin: boolean } | undefined) {
  const req = { user } as unknown as Request;
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  const res = { status, json } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  requireAdmin(req, res, next);
  return { status, json, next };
}

describe('requireAdmin', () => {
  it("laisse passer l'administrateur", () => {
    const { next, status } = run({ isAdmin: true });
    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it("refuse un membre de la famille qui n'est pas administrateur", () => {
    const { next, status, json } = run({ isAdmin: false });
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'forbidden' }));
  });
});

describe('ADMIN_EMAILS', () => {
  const base = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://unused',
    SESSION_SECRET: 'x'.repeat(40),
    APP_BASE_URL: 'http://localhost:3000',
    ALLOWED_EMAILS: 'moi@example.com,frere@example.com',
  };

  it("accepte un administrateur présent dans l'allowlist", () => {
    const config = loadConfig({ ...base, ADMIN_EMAILS: 'Moi@example.com' });
    expect([...config.adminEmails]).toEqual(['moi@example.com']);
  });

  it("refuse un administrateur absent de l'allowlist", () => {
    expect(() => loadConfig({ ...base, ADMIN_EMAILS: 'intrus@example.com' })).toThrow(
      /ALLOWED_EMAILS/,
    );
  });
});
