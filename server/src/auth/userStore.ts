import type { PrismaClient } from '@prisma/client';

export interface UserRecord {
  id: string;
  googleSub: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface LoginUpsert {
  existingId: string | null;
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  lastLoginAt: Date;
}

export interface UserStore {
  findById(id: string): Promise<UserRecord | null>;
  findByGoogleSub(sub: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  upsertFromLogin(input: LoginUpsert): Promise<UserRecord>;
  ensureAllowlisted(emails: readonly string[]): Promise<void>;
}

export function createPrismaUserStore(prisma: PrismaClient): UserStore {
  return {
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    findByGoogleSub: (googleSub) => prisma.user.findUnique({ where: { googleSub } }),
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

    async upsertFromLogin(input) {
      const data = {
        googleSub: input.googleSub,
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl,
        lastLoginAt: input.lastLoginAt,
      };
      if (input.existingId) {
        return prisma.user.update({ where: { id: input.existingId }, data });
      }
      return prisma.user.create({ data });
    },

    // Crée les lignes pour les e-mails autorisés sans toucher aux comptes déjà liés à Google.
    async ensureAllowlisted(emails) {
      for (const email of emails) {
        await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email },
        });
      }
    },
  };
}

/** Implémentation en mémoire, utilisée par les tests. */
export function createMemoryUserStore(): UserStore & { all(): UserRecord[] } {
  const rows = new Map<string, UserRecord>();
  let counter = 0;
  const byEmail = (email: string) => [...rows.values()].find((u) => u.email === email) ?? null;

  return {
    all: () => [...rows.values()],
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async findByGoogleSub(sub) {
      return [...rows.values()].find((u) => u.googleSub === sub) ?? null;
    },
    async findByEmail(email) {
      return byEmail(email);
    },
    async upsertFromLogin(input) {
      const id = input.existingId ?? `user-${++counter}`;
      const record: UserRecord = {
        id,
        googleSub: input.googleSub,
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl,
      };
      rows.set(id, record);
      return record;
    },
    async ensureAllowlisted(emails) {
      for (const email of emails) {
        if (!byEmail(email)) {
          const id = `user-${++counter}`;
          rows.set(id, { id, googleSub: null, email, name: null, avatarUrl: null });
        }
      }
    },
  };
}
