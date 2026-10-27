import type { PrismaClient } from '@prisma/client';
import type { DoseLogForDay, ExtraDoseForDay, MedicationForDay } from '../domain/checklist';
import type { ScheduleRow } from '../domain/schedules';

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const fromIsoDate = (value: string) => new Date(`${value}T00:00:00Z`);

export interface RangeData {
  medications: (MedicationForDay & { archived: boolean })[];
  doseLogsByDate: Map<string, DoseLogForDay[]>;
  extrasByDate: Map<string, ExtraDoseForDay[]>;
}

/** Charge les médicaments, prises et doses au besoin d'une plage de dates, en une fois. */
export async function loadRange(
  prisma: PrismaClient,
  from: string,
  to: string,
): Promise<RangeData> {
  const start = fromIsoDate(from);
  const end = fromIsoDate(to);

  const [medications, doseLogs, extraLogs] = await Promise.all([
    prisma.medication.findMany({ include: { schedules: true }, orderBy: { name: 'asc' } }),
    prisma.doseLog.findMany({
      where: { date: { gte: start, lte: end } },
      include: { takenBy: { select: { name: true, email: true } } },
    }),
    prisma.extraDoseLog.findMany({
      where: { date: { gte: start, lte: end } },
      include: { takenBy: { select: { name: true, email: true } } },
      orderBy: { takenAt: 'asc' },
    }),
  ]);

  const doseLogsByDate = new Map<string, DoseLogForDay[]>();
  for (const log of doseLogs) {
    const date = toIsoDate(log.date);
    const list = doseLogsByDate.get(date) ?? [];
    list.push({
      medicationId: log.medicationId,
      slot: log.slot,
      takenAt: log.takenAt.toISOString(),
      takenByName: log.takenBy.name ?? log.takenBy.email,
    });
    doseLogsByDate.set(date, list);
  }

  const extrasByDate = new Map<string, ExtraDoseForDay[]>();
  for (const log of extraLogs) {
    const date = toIsoDate(log.date);
    const list = extrasByDate.get(date) ?? [];
    list.push({
      id: log.id,
      medicationId: log.medicationId,
      takenAt: log.takenAt.toISOString(),
      takenByName: log.takenBy.name ?? log.takenBy.email,
      note: log.note,
    });
    extrasByDate.set(date, list);
  }

  return {
    medications: medications.map((m) => ({
      id: m.id,
      name: m.name,
      archived: m.archivedAt !== null,
      archivedAt: m.archivedAt?.toISOString() ?? null,
      schedules: m.schedules.map((s): ScheduleRow => ({
        id: s.id,
        slot: s.slot,
        mealRelation: s.mealRelation,
        dose: s.dose,
        notes: s.notes,
        daysOfWeek: s.daysOfWeek,
        startDate: toIsoDate(s.startDate),
        endDate: s.endDate ? toIsoDate(s.endDate) : null,
      })),
    })),
    doseLogsByDate,
    extrasByDate,
  };
}
