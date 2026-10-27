import { Router, type NextFunction, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { buildChecklist, type Checklist } from '../domain/checklist';
import { addDays, isValidIsoDate, todayInTunis } from '../domain/dates';
import { activeOn } from '../domain/schedules';
import { adherenceByMedication, dateRange, dayStatus, percent } from '../domain/history';
import { loadRange, type RangeData } from './load';

const MAX_RANGE_DAYS = 92;

function checklistFor(date: string, data: RangeData): Checklist {
  return buildChecklist(
    date,
    data.medications,
    data.doseLogsByDate.get(date) ?? [],
    data.extrasByDate.get(date) ?? [],
  );
}

function countsOf(checklist: Checklist) {
  return checklist.sections.reduce(
    (acc, section) => ({ taken: acc.taken + section.taken, total: acc.total + section.total }),
    { taken: 0, total: 0 },
  );
}

export function createHistoryRouter(deps: { prisma: PrismaClient }): Router {
  const router = Router();
  const { prisma } = deps;

  // Statut de chaque jour d'une plage, pour le calendrier.
  router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const from = String(req.query.from ?? '');
      const to = String(req.query.to ?? '');
      if (!isValidIsoDate(from) || !isValidIsoDate(to) || to < from) {
        res.status(400).json({ error: 'validation', message: 'Plage de dates invalide' });
        return;
      }
      const dates = dateRange(from, to);
      if (dates.length > MAX_RANGE_DAYS) {
        res
          .status(400)
          .json({ error: 'validation', message: `Plage limitée à ${MAX_RANGE_DAYS} jours` });
        return;
      }

      const today = todayInTunis();
      const data = await loadRange(prisma, from, to);
      const days = dates.map((date) => {
        const { taken, total } = countsOf(checklistFor(date, data));
        return { date, status: dayStatus(date, today, taken, total), taken, total };
      });
      res.json({ today, days });
    } catch (error) {
      next(error);
    }
  });

  // Rapport pour le cardiologue : médicaments en cours et observance sur les N derniers jours.
  router.get('/report', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requested = Number(req.query.days) || 30;
      const span = Math.min(Math.max(requested, 1), MAX_RANGE_DAYS);
      const today = todayInTunis();
      const from = addDays(today, -(span - 1));
      const data = await loadRange(prisma, from, today);
      const checklists = dateRange(from, today).map((date) => checklistFor(date, data));

      const perMedication = adherenceByMedication(checklists).map((entry) => ({
        ...entry,
        percent: percent(entry.taken, entry.planned),
      }));
      const planned = perMedication.reduce((sum, e) => sum + e.planned, 0);
      const taken = perMedication.reduce((sum, e) => sum + e.taken, 0);

      const names = new Map(data.medications.map((m) => [m.id, m.name]));
      const extras = dateRange(from, today).flatMap((date) =>
        (data.extrasByDate.get(date) ?? []).map((extra) => ({
          date,
          name: names.get(extra.medicationId) ?? '—',
          takenAt: extra.takenAt,
          takenBy: extra.takenByName,
          note: extra.note,
        })),
      );

      const current = data.medications
        .filter((m) => !m.archived)
        .map((m) => ({
          name: m.name,
          schedules: activeOn(m.schedules, today).map((s) => ({
            slot: s.slot,
            mealRelation: s.mealRelation,
            dose: s.dose,
            notes: s.notes,
            daysOfWeek: s.daysOfWeek,
          })),
        }))
        .filter((m) => m.schedules.length > 0);

      res.json({
        generatedAt: new Date().toISOString(),
        today,
        from,
        to: today,
        days: span,
        medications: current,
        adherence: { taken, planned, percent: percent(taken, planned) },
        perMedication,
        extras,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
