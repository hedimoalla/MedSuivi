import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Prisma, PrismaClient, Schedule } from '@prisma/client';
import { medicationInputSchema, planScheduleChange, type ScheduleRow } from '../domain/schedules';
import { todayInTunis } from '../domain/dates';
import { requireAdmin } from '../auth/requireAuth';

type Tx = Prisma.TransactionClient;

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const fromIsoDate = (value: string) => new Date(`${value}T00:00:00Z`);

function toRow(schedule: Schedule): ScheduleRow {
  return {
    id: schedule.id,
    slot: schedule.slot,
    mealRelation: schedule.mealRelation,
    dose: schedule.dose,
    notes: schedule.notes,
    daysOfWeek: schedule.daysOfWeek,
    startDate: toIsoDate(schedule.startDate),
    endDate: schedule.endDate ? toIsoDate(schedule.endDate) : null,
  };
}

/** Lignes encore pertinentes : en cours ou à venir. L'historique n'est pas renvoyé ici. */
function currentRows(schedules: Schedule[], today: string) {
  return schedules
    .map(toRow)
    .filter((row) => row.endDate === null || row.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function serialize(
  medication: { id: string; name: string; archivedAt: Date | null; createdAt: Date },
  schedules: Schedule[],
  today: string,
) {
  return {
    id: medication.id,
    name: medication.name,
    archivedAt: medication.archivedAt?.toISOString() ?? null,
    schedules: currentRows(schedules, today),
  };
}

function snapshot(medication: { name: string; archivedAt: Date | null }, schedules: Schedule[]) {
  return {
    name: medication.name,
    archivedAt: medication.archivedAt?.toISOString() ?? null,
    schedules: schedules.map(toRow),
  } as unknown as Prisma.InputJsonValue;
}

async function writeAudit(
  tx: Tx,
  entry: {
    userId: string;
    action: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entityType: 'medication',
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
    },
  });
}

/** Envoie une erreur de validation lisible en français. */
function validationError(
  res: Response,
  error: { issues: { message: string; path: PropertyKey[] }[] },
) {
  res.status(400).json({
    error: 'validation',
    issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

export function createApiRouter(deps: { prisma: PrismaClient }): Router {
  const router = Router();
  const { prisma } = deps;

  // Liste des médicaments, avec les prises en cours et à venir.
  router.get('/medications', async (req, res, next) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const today = todayInTunis();
      const medications = await prisma.medication.findMany({
        where: includeArchived ? {} : { archivedAt: null },
        include: { schedules: true },
        orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
      });
      res.json({
        medications: medications.map((m) => serialize(m, m.schedules, today)),
      });
    } catch (error) {
      next(error);
    }
  });

  // Création d'un médicament. La date d'effet ne peut pas être dans le passé.
  router.post(
    '/medications',
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = medicationInputSchema.safeParse(req.body);
        if (!parsed.success) {
          validationError(res, parsed.error);
          return;
        }
        const input = parsed.data;
        const today = todayInTunis();
        if (input.effectiveDate < today) {
          res.status(400).json({
            error: 'validation',
            issues: [
              { path: 'effectiveDate', message: 'La date de début ne peut pas être dans le passé' },
            ],
          });
          return;
        }

        const created = await prisma.$transaction(async (tx) => {
          const medication = await tx.medication.create({
            data: {
              name: input.name,
              schedules: {
                create: input.schedules.map((s) => ({
                  slot: s.slot,
                  mealRelation: s.mealRelation,
                  dose: s.dose,
                  notes: s.notes,
                  daysOfWeek: s.daysOfWeek,
                  startDate: fromIsoDate(input.effectiveDate),
                  endDate: s.endDate ? fromIsoDate(s.endDate) : null,
                })),
              },
            },
            include: { schedules: true },
          });
          await writeAudit(tx, {
            userId: req.user!.id,
            action: 'medication.create',
            entityId: medication.id,
            after: snapshot(medication, medication.schedules),
          });
          return medication;
        });

        res.status(201).json({ medication: serialize(created, created.schedules, today) });
      } catch (error) {
        next(error);
      }
    },
  );

  // Modification : nom, et horaires à partir d'une date d'effet. Le passé n'est jamais réécrit.
  router.put(
    '/medications/:id',
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = medicationInputSchema.safeParse(req.body);
        if (!parsed.success) {
          validationError(res, parsed.error);
          return;
        }
        const input = parsed.data;
        const today = todayInTunis();
        if (input.effectiveDate < today) {
          res.status(400).json({
            error: 'validation',
            issues: [
              { path: 'effectiveDate', message: "La date d'effet ne peut pas être dans le passé" },
            ],
          });
          return;
        }

        const outcome = await prisma.$transaction(async (tx) => {
          const medication = await tx.medication.findUnique({
            where: { id: String(req.params.id) },
            include: { schedules: true },
          });
          if (!medication) return 'not_found' as const;
          if (medication.archivedAt) return 'archived' as const;

          const before = snapshot(medication, medication.schedules);
          const plan = planScheduleChange(
            medication.schedules.map(toRow),
            input.effectiveDate,
            input.schedules,
          );

          if (plan.delete.length > 0) {
            await tx.schedule.deleteMany({ where: { id: { in: plan.delete } } });
          }
          for (const change of plan.close) {
            await tx.schedule.update({
              where: { id: change.id },
              data: { endDate: fromIsoDate(change.endDate) },
            });
          }
          await tx.schedule.createMany({
            data: plan.create.map((s) => ({
              medicationId: medication.id,
              slot: s.slot,
              mealRelation: s.mealRelation,
              dose: s.dose,
              notes: s.notes,
              daysOfWeek: s.daysOfWeek,
              startDate: fromIsoDate(s.startDate),
              endDate: s.endDate ? fromIsoDate(s.endDate) : null,
            })),
          });

          const updated = await tx.medication.update({
            where: { id: medication.id },
            data: { name: input.name },
            include: { schedules: true },
          });
          await writeAudit(tx, {
            userId: req.user!.id,
            action: 'medication.update',
            entityId: medication.id,
            before,
            after: snapshot(updated, updated.schedules),
          });
          return { medication: updated };
        });

        if (outcome === 'not_found') {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        if (outcome === 'archived') {
          res.status(409).json({
            error: 'archived',
            message: 'Ce médicament est archivé. Restaurez-le avant de le modifier.',
          });
          return;
        }
        res.json({
          medication: serialize(outcome.medication, outcome.medication.schedules, today),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  // Archivage et restauration : jamais de suppression physique.
  for (const action of ['archive', 'restore'] as const) {
    router.post(
      `/medications/:id/${action}`,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const today = todayInTunis();
          const outcome = await prisma.$transaction(async (tx) => {
            const medication = await tx.medication.findUnique({
              where: { id: String(req.params.id) },
              include: { schedules: true },
            });
            if (!medication) return 'not_found' as const;
            const isArchived = medication.archivedAt !== null;
            if (action === 'archive' && isArchived) return 'already' as const;
            if (action === 'restore' && !isArchived) return 'already' as const;

            const before = snapshot(medication, medication.schedules);
            const updated = await tx.medication.update({
              where: { id: medication.id },
              data: { archivedAt: action === 'archive' ? new Date() : null },
              include: { schedules: true },
            });
            await writeAudit(tx, {
              userId: req.user!.id,
              action: `medication.${action}`,
              entityId: medication.id,
              before,
              after: snapshot(updated, updated.schedules),
            });
            return { medication: updated };
          });

          if (outcome === 'not_found') {
            res.status(404).json({ error: 'not_found' });
            return;
          }
          if (outcome === 'already') {
            res.status(409).json({ error: 'already' });
            return;
          }
          res.json({
            medication: serialize(outcome.medication, outcome.medication.schedules, today),
          });
        } catch (error) {
          next(error);
        }
      },
    );
  }

  // Journal des modifications : qui a changé quoi, et quand.
  router.get('/audit', async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const entries = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      });
      res.json({
        entries: entries.map((entry) => ({
          id: entry.id,
          createdAt: entry.createdAt.toISOString(),
          action: entry.action,
          entityId: entry.entityId,
          user: entry.user.name ?? entry.user.email,
          before: entry.before,
          after: entry.after,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
