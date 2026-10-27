import type { NextFunction, Request, Response } from 'express';
import type { UserRecord, UserStore } from './userStore';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // Étend le type déjà déclaré par @types/passport : req.user devient l'utilisateur de l'app.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthenticatedUser {}
  }
}

/**
 * Retrouve l'utilisateur de la session. Si son e-mail n'est plus dans l'allowlist,
 * la session est fermée : retirer quelqu'un de ALLOWED_EMAILS le déconnecte immédiatement.
 */
export async function resolveSessionUser(
  req: Request,
  users: UserStore,
  allowlist: ReadonlySet<string>,
  adminEmails: ReadonlySet<string> = new Set(),
): Promise<AuthenticatedUser | null> {
  const userId = req.session?.userId;
  if (!userId) {
    return null;
  }
  const record: UserRecord | null = await users.findById(userId);
  if (!record || !allowlist.has(record.email)) {
    delete req.session.userId;
    return null;
  }
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    avatarUrl: record.avatarUrl,
    isAdmin: adminEmails.has(record.email),
  };
}

export function requireApiAuth(
  users: UserStore,
  allowlist: ReadonlySet<string>,
  adminEmails: ReadonlySet<string> = new Set(),
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveSessionUser(req, users, allowlist, adminEmails);
      if (!user) {
        res.status(401).json({ error: 'unauthenticated' });
        return;
      }
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Pour les pages HTML : redirection vers la page de connexion au lieu d'un 401. */
export function requirePageAuth(
  users: UserStore,
  allowlist: ReadonlySet<string>,
  adminEmails: ReadonlySet<string> = new Set(),
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveSessionUser(req, users, allowlist, adminEmails);
      if (!user) {
        res.redirect('/login');
        return;
      }
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** À placer après requireApiAuth : seuls les administrateurs peuvent modifier la liste. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'forbidden', message: "Réservé à l'administrateur" });
    return;
  }
  next();
}
