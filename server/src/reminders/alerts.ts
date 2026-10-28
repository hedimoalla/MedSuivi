import { Prisma, type PrismaClient } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import webpush from 'web-push';
import { APP_TIMEZONE, type Slot } from '@medsuivi/shared';
import { buildChecklist } from '../domain/checklist';
import { dueAlerts, type AlertSlot } from '../domain/alerts';
import { todayInTunis } from '../domain/dates';
import { loadRange } from '../history/load';
import { alertPayload, type PushPayload } from './messages';

export interface PushTarget {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Envoie une notification. Rejette avec `statusCode` si le service push refuse. */
export type PushSender = (target: PushTarget, payload: PushPayload) => Promise<void>;

export interface AlertDeps {
  prisma: PrismaClient;
  /** Seuls les membres de cette liste reçoivent les alertes. */
  allowedEmails: ReadonlySet<string>;
  sendPush: PushSender;
  now?: Date;
}

export function createWebPushSender(vapid: {
  publicKey: string;
  privateKey: string;
  subject: string;
}): PushSender {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  return async (target, payload) => {
    // Une alerte de repas n'a d'intérêt qu'une heure : inutile de la garder plus longtemps.
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
  };
}

/** Insère la trace de l'alerte. Renvoie false si une autre exécution l'a déjà prise en charge. */
async function claimAlert(prisma: PrismaClient, date: string, slot: AlertSlot): Promise<boolean> {
  try {
    await prisma.alertLog.create({
      data: { date: new Date(`${date}T00:00:00Z`), slot },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }
    throw error;
  }
}

async function deliver(deps: AlertDeps, target: PushTarget, payload: PushPayload) {
  try {
    await deps.sendPush(target, payload);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    // 404 ou 410 : l'appareil a supprimé l'abonnement (désinstallation, navigateur réinitialisé).
    if (statusCode === 404 || statusCode === 410) {
      await deps.prisma.pushSubscription.deleteMany({ where: { id: target.id } });
      return;
    }
    // Pas de contenu dans le journal : seulement le code d'erreur.
    console.error('[alertes] envoi refusé', statusCode ?? 'unknown');
  }
}

/**
 * Vérifie les repas du jour et envoie les alertes dues. Renvoie les repas alertés.
 * Sans effet si tout est coché, si l'heure n'est pas encore atteinte, ou si l'alerte est déjà partie.
 */
export async function runDueAlerts(deps: AlertDeps): Promise<AlertSlot[]> {
  const now = deps.now ?? new Date();
  const today = todayInTunis(now);
  const nowHHmm = formatInTimeZone(now, APP_TIMEZONE, 'HH:mm');

  // Même calcul que l'écran Aujourd'hui : « prise cochée » a le même sens partout.
  const range = await loadRange(deps.prisma, today, today);
  const checklist = buildChecklist(
    today,
    range.medications,
    range.doseLogsByDate.get(today) ?? [],
    range.extrasByDate.get(today) ?? [],
  );

  const sent = await deps.prisma.alertLog.findMany({
    where: { date: new Date(`${today}T00:00:00Z`) },
    select: { slot: true },
  });
  const due = dueAlerts({
    nowHHmm,
    progress: checklist.sections.map((section) => ({
      slot: section.slot,
      taken: section.taken,
      total: section.total,
    })),
    alreadySent: new Set<Slot>(sent.map((row) => row.slot)),
  });
  if (due.length === 0) return [];

  const recipients = await deps.prisma.pushSubscription.findMany({
    where: { user: { email: { in: [...deps.allowedEmails] } } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  const fired: AlertSlot[] = [];
  for (const slot of due) {
    if (!(await claimAlert(deps.prisma, today, slot))) continue;
    fired.push(slot);
    const payload = alertPayload(today, slot);
    await Promise.all(recipients.map((target) => deliver(deps, target, payload)));
  }
  return fired;
}

/** Lance la vérification toutes les minutes. Renvoie la fonction d'arrêt. */
export function startAlertScheduler(deps: AlertDeps, intervalMs = 60_000): () => void {
  const tick = () => {
    runDueAlerts(deps).catch((error: unknown) => {
      console.error('[alertes] erreur', error instanceof Error ? error.name : 'unknown');
    });
  };
  const timer = setInterval(tick, intervalMs);
  tick();
  return () => clearInterval(timer);
}
