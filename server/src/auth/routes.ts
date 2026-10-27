import { Router } from 'express';
import passport from 'passport';
import type { AppConfig } from '../config';
import { accessDeniedPage, loginPage } from '../http/pages';
import type { LoginDecision } from './policy';
import { destroySession, establishSession } from './session';
import { GOOGLE_SCOPES } from './googleStrategy';
import type { UserStore } from './userStore';
import { SESSION_COOKIE_NAME } from '../session';

export function createAuthRouter(deps: { config: AppConfig; users: UserStore }): Router {
  const router = Router();

  router.get('/login', (_req, res) => {
    res.type('html').send(loginPage());
  });

  router.get(
    '/auth/google',
    passport.authenticate('google', {
      scope: GOOGLE_SCOPES,
      prompt: 'select_account',
      session: false,
    }),
  );

  router.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate(
      'google',
      { session: false },
      async (error: unknown, decision: LoginDecision | false) => {
        try {
          if (error || !decision) {
            res
              .status(400)
              .type('html')
              .send(loginPage({ error: 'La connexion a échoué. Réessayez.' }));
            return;
          }
          if (!decision.allowed) {
            // Motif seulement, sans l'adresse e-mail : les logs ne contiennent pas de données personnelles.
            console.warn(`[auth] connexion refusée : ${decision.reason}`);
            res.status(403).type('html').send(accessDeniedPage());
            return;
          }
          await establishSession(req, decision.user.id);
          res.redirect('/');
        } catch (sessionError) {
          next(sessionError);
        }
      },
    )(req, res, next);
  });

  router.post('/auth/logout', async (req, res, next) => {
    try {
      await destroySession(req);
      res.clearCookie(SESSION_COOKIE_NAME);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  if (deps.config.devAuthBypass && deps.config.nodeEnv === 'development') {
    // Connexion locale sans Google. Impossible à activer hors développement (voir config.ts).
    router.get('/auth/dev-login', async (req, res, next) => {
      try {
        const email = String(req.query.email ?? '')
          .trim()
          .toLowerCase();
        if (!deps.config.allowedEmails.has(email)) {
          res.status(403).type('html').send(accessDeniedPage());
          return;
        }
        await deps.users.ensureAllowlisted([email]);
        const user = await deps.users.findByEmail(email);
        if (!user) {
          res.status(500).end();
          return;
        }
        await establishSession(req, user.id);
        res.redirect('/');
      } catch (error) {
        next(error);
      }
    });
  }

  return router;
}
