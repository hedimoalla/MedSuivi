import { Router, type NextFunction, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { SLOTS } from '@medsuivi/shared';
import { z } from 'zod';
import { buildChecklist, type DoseLogForDay, type ExtraDoseForDay } from '../domain/checklist';
import { isValidIsoDate } from '../domain/dates';
import type { ScheduleRow } from '../domain/schedules';

const fromIsoDate = (value: string) => new Date(`${value}T00:00:00Z`);
const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const doseSchema = z.object({
  medicationId: z.string().min(1),
  slot: z.enum(SLOTS),
  taken: z.boolean(),
});

const extraSchema = z.object({
  medicationId: z.string().min(1),
  note: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value) => value || null),
});

function parseDate(req: Request, res: Response): string | null {
  const date = String(req.params.date ?? '');
  if (!isValidIsoDate(date)) {
    res.status(400).json({ error: 'validation', message: 'Date invalide' });
    return null;
  }
  return date;
}

export function createDaysRouter(deps: { prisma: PrismaClient }): Router {
  const router = Router();
  const { prisma } = deps;

  // Checklist d'un jour : prises par créneau, état coché, et doses au besoin.
  router.get('/days/:date', async (req, res, next) => {
    try {
      const date = parseDate(req, res);
      if (!date) return;
      const day = fromIsoDate(date);

      const medications = await prisma.medication.findMany({
        where: {
          OR: [
            { archivedAt: null },
            { doseLogs: { some: { date: day } } },
            { extraDoseLogs: { some: { date: day } } },
          ],
        },
        include: {
          schedules: true,
          doseLogs: {
            where: { date: day },
            include: { takenBy: { select: { name: true, email: true } } },
          },
          extraDoseLogs: {
            where: { date: day },
            include: { takenBy: { select: { name: true, email: true } } },
            orderBy: { takenAt: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      const doseLogs: DoseLogForDay[] = medications.flatMap((m) =>
        m.doseLogs.map((log) => ({
          medicationId: m.id,
          slot: log.slot,
          takenAt: log.takenAt.toISOString(),
          takenByName: log.takenBy.name ?? log.takenBy.email,
        })),
      );
      const extras: ExtraDoseForDay[] = medications.flatMap((m) =>
        m.extraDoseLogs.map((log) => ({
          id: log.id,
          medicationId: m.id,
          takenAt: log.takenAt.toISOString(),
          takenByName: log.takenBy.name ?? log.takenBy.email,
          note: log.note,
        })),
      );

      const checklist = buildChecklist(
        date,
        medications.map((m) => ({
          id: m.id,
          name: m.name,
          archivedAt: m.archivedAt?.toISOString() ?? null,
          schedules: m.schedules.map((s) => ({
            id: s.id,
            slot: s.slot,
            mealRelation: s.mealRelation,
            dose: s.dose,
            notes: s.notes,
            daysOfWeek: s.daysOfWeek,
            startDate: toIsoDate(s.startDate),
            endDate: s.endDate ? toIsoDate(s.endDate) : null,
          })) as ScheduleRow[],
        })),
        doseLogs,
        extras,
      );

      res.json(checklist);
    } catch (error) {
      next(error);
    }
  });

  // Cocher ou décocher une prise programmée. Le premier cochage est conservé (qui, quand).
  router.put('/days/:date/doses', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = parseDate(req, res);
      if (!date) return;
      const parsed = doseSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'validation', message: 'Requête invalide' });
        return;
      }
      const { medicationId, slot, taken } = parsed.data;
      const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
      if (!medication) {
        res.status(404).json({ error: 'not_found' });
        return;
      }

      const day = fromIsoDate(date);
      if (taken) {
        await prisma.doseLog.upsert({
          where: { medicationId_slot_date: { medicationId, slot, date: day } },
          create: {
            medicationId,
            slot,
            date: day,
            takenAt: new Date(),
            takenByUserId: req.user!.id,
          },
          update: {},
        });
      } else {
        await prisma.doseLog.deleteMany({ where: { medicationId, slot, date: day } });
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  // Dose « au besoin » : sans limite, avec une note facultative.
  router.post(
    '/days/:date/extra-doses',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const date = parseDate(req, res);
        if (!date) return;
        const parsed = extraSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'validation', message: 'Requête invalide' });
          return;
        }
        const medication = await prisma.medication.findUnique({
          where: { id: parsed.data.medicationId },
        });
        if (!medication) {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        const created = await prisma.extraDoseLog.create({
          data: {
            medicationId: medication.id,
            date: fromIsoDate(date),
            takenAt: new Date(),
            takenByUserId: req.user!.id,
            note: parsed.data.note,
          },
        });
        res.status(201).json({ id: created.id });
      } catch (error) {
        next(error);
      }
    },
  );

  // Suppression d'une dose au besoin saisie par erreur.
  router.delete('/extra-doses/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.extraDoseLog.deleteMany({ where: { id: String(req.params.id) } });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
