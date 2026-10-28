import { describe, expect, it, vi } from 'vitest';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { Slot } from '@medsuivi/shared';
import { alertTimeFor, dueAlerts, type SlotProgress } from '../src/domain/alerts';
import { runDueAlerts, type PushTarget } from '../src/reminders/alerts';

const DAY = '2026-10-28';

/** Heure Tunis HH:mm du 28 octobre 2026 (Tunis = UTC+1) sous forme de Date. */
function tunis(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 28, hours - 1, minutes));
}

const progress = (slot: Slot, taken: number, total: number): SlotProgress => ({
  slot,
  taken,
  total,
});

describe('alertTimeFor', () => {
  it('ajoute une heure à l’heure indicative de chaque repas', () => {
    expect(alertTimeFor('BREAKFAST')).toBe('10:00');
    expect(alertTimeFor('LUNCH')).toBe('14:30');
    expect(alertTimeFor('DINNER')).toBe('21:00');
  });
});

describe('dueAlerts', () => {
  it("n'alerte pas avant l'heure d'alerte", () => {
    expect(
      dueAlerts({
        nowHHmm: '09:59',
        progress: [progress('BREAKFAST', 0, 2)],
        alreadySent: new Set(),
      }),
    ).toEqual([]);
  });

  it("alerte à l'heure d'alerte si une prise du repas manque", () => {
    expect(
      dueAlerts({
        nowHHmm: '10:00',
        progress: [progress('BREAKFAST', 0, 2)],
        alreadySent: new Set(),
      }),
    ).toEqual(['BREAKFAST']);
  });

  it('alerte aussi si une seule prise sur deux est cochée', () => {
    expect(
      dueAlerts({
        nowHHmm: '10:30',
        progress: [progress('BREAKFAST', 1, 2)],
        alreadySent: new Set(),
      }),
    ).toEqual(['BREAKFAST']);
  });

  it("n'alerte pas quand toutes les prises du repas sont cochées", () => {
    expect(
      dueAlerts({
        nowHHmm: '15:00',
        progress: [progress('BREAKFAST', 2, 2), progress('LUNCH', 1, 1)],
        alreadySent: new Set(),
      }),
    ).toEqual([]);
  });

  it("n'alerte pas pour un repas sans prise prévue ce jour-là", () => {
    expect(
      dueAlerts({
        nowHHmm: '15:00',
        progress: [progress('LUNCH', 0, 0)],
        alreadySent: new Set(),
      }),
    ).toEqual([]);
  });

  it("n'envoie pas deux fois la même alerte le même jour", () => {
    expect(
      dueAlerts({
        nowHHmm: '16:00',
        progress: [progress('BREAKFAST', 0, 2)],
        alreadySent: new Set<Slot>(['BREAKFAST']),
      }),
    ).toEqual([]);
  });

  it("n'alerte jamais pour le coucher ni hors repas", () => {
    expect(
      dueAlerts({
        nowHHmm: '23:59',
        progress: [progress('BEDTIME', 0, 1), progress('OUTSIDE_MEALS', 0, 1)],
        alreadySent: new Set(),
      }),
    ).toEqual([]);
  });
});

interface Row {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user: { email: string };
}

interface FakeState {
  medications: {
    id: string;
    name: string;
    archivedAt: null;
    schedules: {
      id: string;
      slot: Slot;
      mealRelation: 'NONE';
      dose: string;
      notes: null;
      daysOfWeek: number[];
      startDate: Date;
      endDate: null;
    }[];
  }[];
  doseLogs: {
    medicationId: string;
    slot: Slot;
    date: Date;
    takenAt: Date;
    takenBy: { name: null; email: string };
  }[];
  alerts: { date: Date; slot: Slot }[];
  subscriptions: Row[];
}

const iso = (value: Date) => value.toISOString().slice(0, 10);

/** Faux client Prisma : seulement les méthodes utilisées par les alertes. */
function fakePrisma(state: FakeState): PrismaClient {
  const fake = {
    medication: { findMany: async () => state.medications },
    doseLog: {
      findMany: async ({ where }: { where: { date: { gte: Date; lte: Date } } }) =>
        state.doseLogs.filter(
          (log) => iso(log.date) >= iso(where.date.gte) && iso(log.date) <= iso(where.date.lte),
        ),
    },
    extraDoseLog: { findMany: async () => [] },
    alertLog: {
      findMany: async ({ where }: { where: { date: Date } }) =>
        state.alerts
          .filter((alert) => iso(alert.date) === iso(where.date))
          .map((alert) => ({ slot: alert.slot })),
      create: async ({ data }: { data: { date: Date; slot: Slot } }) => {
        const exists = state.alerts.some(
          (alert) => iso(alert.date) === iso(data.date) && alert.slot === data.slot,
        );
        if (exists) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '6.0.0',
          });
        }
        state.alerts.push({ date: data.date, slot: data.slot });
      },
    },
    pushSubscription: {
      findMany: async ({ where }: { where: { user: { email: { in: string[] } } } }) =>
        state.subscriptions.filter((row) => where.user.email.in.includes(row.user.email)),
      deleteMany: async ({ where }: { where: { id: string } }) => {
        state.subscriptions = state.subscriptions.filter((row) => row.id !== where.id);
      },
    },
  };
  return fake as unknown as PrismaClient;
}

function newState(overrides: Partial<FakeState> = {}): FakeState {
  const schedule = (id: string, slot: Slot) => ({
    id,
    slot,
    mealRelation: 'NONE' as const,
    dose: '1 comprimé',
    notes: null,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    startDate: new Date('2026-10-26T00:00:00Z'),
    endDate: null,
  });
  return {
    medications: [
      {
        id: 'm1',
        name: 'Pidogrel 75 mg',
        archivedAt: null,
        schedules: [schedule('s1', 'BREAKFAST')],
      },
      {
        id: 'm2',
        name: 'Cardiocine 100 mg',
        archivedAt: null,
        schedules: [schedule('s2', 'LUNCH')],
      },
    ],
    doseLogs: [],
    alerts: [],
    subscriptions: [
      {
        id: 'a',
        endpoint: 'https://push.example/a',
        p256dh: 'p1',
        auth: 'a1',
        user: { email: 'moi@example.com' },
      },
      {
        id: 'b',
        endpoint: 'https://push.example/b',
        p256dh: 'p2',
        auth: 'a2',
        user: { email: 'intrus@example.com' },
      },
    ],
    ...overrides,
  };
}

const ALLOWED = new Set(['moi@example.com', 'frere@example.com']);

describe('runDueAlerts', () => {
  it('envoie une alerte aux seuls membres autorisés', async () => {
    const sendPush = vi.fn<(target: PushTarget, payload: unknown) => Promise<void>>(async () => {});
    const result = await runDueAlerts({
      prisma: fakePrisma(newState()),
      allowedEmails: ALLOWED,
      sendPush,
      now: tunis('10:05'),
    });

    expect(result).toEqual(['BREAKFAST']);
    expect(sendPush).toHaveBeenCalledTimes(1);
    const [target, payload] = sendPush.mock.calls[0] as unknown as [PushTarget, { body: string }];
    expect(target.id).toBe('a');
    expect(payload.body).toBe('Prise du petit-déjeuner non enregistrée');
  });

  it("n'envoie qu'une fois, même si la vérification tourne à nouveau", async () => {
    const state = newState();
    const sendPush = vi.fn(async () => {});
    const prisma = fakePrisma(state);
    await runDueAlerts({ prisma, allowedEmails: ALLOWED, sendPush, now: tunis('10:05') });
    const second = await runDueAlerts({
      prisma,
      allowedEmails: ALLOWED,
      sendPush,
      now: tunis('10:20'),
    });

    expect(second).toEqual([]);
    expect(sendPush).toHaveBeenCalledTimes(1);
  });

  it("n'alerte pas si la prise a déjà été cochée", async () => {
    const state = newState({
      doseLogs: [
        {
          medicationId: 'm1',
          slot: 'BREAKFAST',
          date: new Date(`${DAY}T00:00:00Z`),
          takenAt: new Date(),
          takenBy: { name: null, email: 'frere@example.com' },
        },
      ],
    });
    const sendPush = vi.fn(async () => {});
    const result = await runDueAlerts({
      prisma: fakePrisma(state),
      allowedEmails: ALLOWED,
      sendPush,
      now: tunis('10:05'),
    });

    expect(result).toEqual([]);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("n'envoie rien avant l'heure d'alerte", async () => {
    const sendPush = vi.fn(async () => {});
    const result = await runDueAlerts({
      prisma: fakePrisma(newState()),
      allowedEmails: ALLOWED,
      sendPush,
      now: tunis('09:59'),
    });

    expect(result).toEqual([]);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it('supprime un abonnement que le service push déclare disparu (410)', async () => {
    const state = newState();
    const sendPush = vi.fn(async () => {
      throw Object.assign(new Error('gone'), { statusCode: 410 });
    });
    await runDueAlerts({
      prisma: fakePrisma(state),
      allowedEmails: ALLOWED,
      sendPush,
      now: tunis('10:05'),
    });

    expect(state.subscriptions.map((row) => row.id)).toEqual(['b']);
  });
});
