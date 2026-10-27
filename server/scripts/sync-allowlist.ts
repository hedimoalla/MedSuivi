/**
 * Synchronise la table users avec ALLOWED_EMAILS.
 *
 * Commande : npm run sync:allowlist
 * - Crée une ligne pour chaque adresse autorisée qui n'en a pas encore.
 * - Ne supprime rien : un compte retiré de ALLOWED_EMAILS est simplement refusé à la
 *   connexion, et déconnecté à sa prochaine requête.
 */
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../src/config';
import { createPrismaUserStore } from '../src/auth/userStore';

async function main() {
  const config = loadConfig();
  const prisma = new PrismaClient();
  try {
    const users = createPrismaUserStore(prisma);
    const emails = [...config.allowedEmails];
    const before = await prisma.user.count();
    await users.ensureAllowlisted(emails);
    const after = await prisma.user.count();
    console.log(`Adresses autorisées : ${emails.length}. Comptes ajoutés : ${after - before}.`);

    const stale = await prisma.user.findMany({
      where: { email: { notIn: emails } },
      select: { email: true },
    });
    for (const user of stale) {
      console.warn(
        `Attention : ${user.email} n'est plus autorisé (il sera refusé à la connexion).`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
