import { loadConfig } from './config';
import { createApp } from './app';
import { createPrismaUserStore } from './auth/userStore';
import { createSessionStore } from './session';
import { prisma } from './db';

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

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
