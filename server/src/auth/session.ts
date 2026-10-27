import type { Request } from 'express';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

/**
 * Ouvre une session pour un utilisateur. La session est régénérée pour éviter la fixation.
 */
export function establishSession(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError);
        return;
      }
      req.session.userId = userId;
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
}

export function destroySession(req: Request): Promise<void> {
  return new Promise((resolve) => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.destroy(() => resolve());
  });
}
