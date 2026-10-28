import { Router, type NextFunction, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const endpointSchema = z.url().max(2048);

const subscribeSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

const unsubscribeSchema = z.object({ endpoint: endpointSchema });

export function createPushRouter(deps: {
  prisma: PrismaClient;
  vapidPublicKey: string | null;
}): Router {
  const router = Router();
  const { prisma, vapidPublicKey } = deps;

  // Clé publique VAPID : l'appareil en a besoin pour s'abonner. Null si les alertes sont désactivées.
  router.get('/push/config', (_req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  // Abonnement de l'appareil courant. Un même appareil (même endpoint) n'est enregistré qu'une fois.
  router.post('/push/subscriptions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!vapidPublicKey) {
        res.status(503).json({ error: 'push_disabled' });
        return;
      }
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'validation', message: 'Requête invalide' });
        return;
      }
      const { endpoint, keys } = parsed.data;
      const userId = req.user!.id;
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        update: { userId, p256dh: keys.p256dh, auth: keys.auth },
      });
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  // Désabonnement : seul l'utilisateur qui a créé l'abonnement peut le supprimer.
  router.post('/push/unsubscribe', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = unsubscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'validation', message: 'Requête invalide' });
        return;
      }
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: parsed.data.endpoint, userId: req.user!.id },
      });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
