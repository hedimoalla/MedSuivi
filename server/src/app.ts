import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import passport from 'passport';
import type session from 'express-session';
import type { AppConfig } from './config';
import { createAuthRouter } from './auth/routes';
import { createGoogleStrategy } from './auth/googleStrategy';
import type { Strategy as PassportStrategy } from 'passport';
import { requireApiAuth, requirePageAuth } from './auth/requireAuth';
import type { UserStore } from './auth/userStore';
import { createSessionMiddleware } from './session';
import { createApiRouter } from './medications/routes';
import { createDaysRouter } from './days/routes';
import { createHistoryRouter } from './history/routes';
import type { PrismaClient } from '@prisma/client';

export interface AppDeps {
  config: AppConfig;
  users: UserStore;
  sessionStore?: session.Store;
  /** Accès à la base pour les médicaments et le journal. Absent dans les tests d'auth. */
  prisma?: PrismaClient;
  /** Remplace la stratégie Google (tests uniquement). */
  googleStrategy?: PassportStrategy;
  /** Dossier du build web (par défaut web/dist). */
  webDist?: string;
}

const DEFAULT_WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));

export function createApp(deps: AppDeps): express.Express {
  const { config, users } = deps;
  const app = express();
  const webDist = deps.webDist ?? DEFAULT_WEB_DIST;

  // Render et les autres proxys : nécessaire pour les cookies secure et l'URL de callback.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'https://lh3.googleusercontent.com', 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'same-origin' },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(createSessionMiddleware(config, deps.sessionStore));

  // Défense CSRF en plus de SameSite=Lax : les requêtes modifiantes doivent venir de notre origine.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      next();
      return;
    }
    const origin = req.get('origin');
    const expectedOrigin = new URL(config.appBaseUrl).origin;
    if (origin && origin !== expectedOrigin) {
      res.status(403).json({ error: 'forbidden_origin' });
      return;
    }
    next();
  });

  passport.use('google', deps.googleStrategy ?? createGoogleStrategy({ config, users }));
  app.use(passport.initialize());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createAuthRouter({ config, users }));

  // Ressources statiques (JS, CSS, icônes, manifest) : publiques, elles ne contiennent aucune donnée.
  if (existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
  }

  const apiAuth = requireApiAuth(users, config.allowedEmails, config.adminEmails);
  const pageAuth = requirePageAuth(users, config.allowedEmails, config.adminEmails);

  app.use('/api', apiAuth);
  app.get('/api/me', (req, res) => {
    res.json({ user: req.user });
  });
  if (deps.prisma) {
    app.use('/api', createApiRouter({ prisma: deps.prisma }));
    app.use('/api', createDaysRouter({ prisma: deps.prisma }));
    app.use('/api', createHistoryRouter({ prisma: deps.prisma }));
  }

  // Tout le reste (application React) : authentification requise.
  app.get(/^\/(?!api\/).*/, pageAuth, (_req, res, next) => {
    const index = `${webDist}/index.html`;
    if (!existsSync(index)) {
      res.status(503).type('text').send("L'interface n'est pas construite. Lancez npm run build.");
      return;
    }
    res.sendFile(index, (error) => error && next(error));
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    // En développement, le message et la pile aident à corriger. En production, seul le nom est journalisé.
    if (config.isProduction) {
      console.error('[server] erreur interne', error instanceof Error ? error.name : 'unknown');
    } else {
      console.error('[server] erreur interne', error);
    }
    if (res.headersSent) {
      next(error);
      return;
    }
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
