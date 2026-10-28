import { loadConfig } from './config';
import { createApp } from './app';
import { createPrismaUserStore } from './auth/userStore';
import { createSessionStore } from './session';
import { prisma } from './db';
import { createWebPushSender, startAlertScheduler } from './reminders/alerts';

const config = loadConfig();
const users = createPrismaUserStore(prisma);

const app = createApp({
  config,
  users,
  sessionStore: createSessionStore(config),
  prisma,
});

const server = app.listen(config.port, () => {
  console.log(`MedSuivi écoute sur le port ${config.port} (${config.nodeEnv})`);
});

const stopAlerts =
  config.alertsEnabled && config.vapid
    ? startAlertScheduler({
        prisma,
        allowedEmails: config.allowedEmails,
        sendPush: createWebPushSender(config.vapid),
      })
    : null;

const shutdown = async () => {
  stopAlerts?.();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
