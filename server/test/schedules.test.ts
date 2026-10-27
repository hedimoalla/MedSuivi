import { describe, expect, it } from 'vitest';
import {
  activeOn,
  medicationInputSchema,
  planScheduleChange,
  type ScheduleRow,
} from '../src/domain/schedules';
import { addDays, isValidIsoDate, todayInTunis } from '../src/domain/dates';

const spec = (overrides: Partial<ScheduleRow> = {}) => ({
  slot: 'BREAKFAST' as const,
  mealRelation: 'NONE' as const,
  dose: '1 comprimé',
  notes: null,
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  endDate: null,
  ...overrides,
});

const row = (overrides: Partial<ScheduleRow>): ScheduleRow => ({
  id: 'r1',
  slot: 'BREAKFAST',
  mealRelation: 'NONE',
  dose: '1 comprimé',
  notes: null,
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  startDate: '2026-10-26',
  endDate: null,
  ...overrides,
});

describe('dates', () => {
  it('calcule la date du jour à Tunis, même juste avant minuit à Paris', () => {
    // 2026-10-27 22:30 UTC = 23:30 à Tunis (UTC+1) : toujours le 27.
    expect(todayInTunis(new Date('2026-10-27T22:30:00Z'))).toBe('2026-10-27');
    // 2026-10-27 23:30 UTC = minuit passé à Tunis : c'est le 28.
    expect(todayInTunis(new Date('2026-10-27T23:30:00Z'))).toBe('2026-10-28');
  });

  it("ajoute des jours en gérant les fins de mois et d'année", () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-27', -1)).toBe('2026-10-26');
  });

  it('refuse les dates inexistantes', () => {
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-10-27')).toBe(true);
  });
});

describe('planScheduleChange', () => {
  it('clôt une prise en cours la veille de la modification', () => {
    const plan = planScheduleChange([row({ id: 'a', startDate: '2026-10-26' })], '2026-11-01', [
      spec({ dose: '1/2 comprimé' }),
    ]);
    expect(plan.close).toEqual([{ id: 'a', endDate: '2026-10-31' }]);
    expect(plan.delete).toEqual([]);
    expect(plan.create).toEqual([
      expect.objectContaining({ dose: '1/2 comprimé', startDate: '2026-11-01' }),
    ]);
  });

  it("ne touche jamais à l'historique terminé avant la date d'effet", () => {
    const past = row({ id: 'old', startDate: '2026-10-01', endDate: '2026-10-20' });
    const plan = planScheduleChange([past], '2026-11-01', [spec()]);
    expect(plan.close).toEqual([]);
    expect(plan.delete).toEqual([]);
  });

  it("remplace directement une ligne qui n'a jamais été appliquée", () => {
    const future = row({ id: 'future', startDate: '2026-11-05' });
    const plan = planScheduleChange([future], '2026-11-01', [spec()]);
    expect(plan.delete).toEqual(['future']);
    expect(plan.close).toEqual([]);
  });

  it('remplace une ligne qui commence le jour même, sans fin négative', () => {
    const today = row({ id: 'today', startDate: '2026-11-01' });
    const plan = planScheduleChange([today], '2026-11-01', [spec()]);
    expect(plan.delete).toEqual(['today']);
    expect(plan.close).toEqual([]);
  });

  it('garde le passé figé : une prise historique et une prise en cours coexistent après le changement', () => {
    const rows = [
      row({ id: 'old', startDate: '2026-10-01', endDate: '2026-10-25', dose: '1 comprimé' }),
      row({ id: 'current', startDate: '2026-10-26', dose: '1/2 comprimé' }),
    ];
    const plan = planScheduleChange(rows, '2026-11-01', [spec({ dose: '1 comprimé et demi' })]);

    expect(plan.close).toEqual([{ id: 'current', endDate: '2026-10-31' }]);
    const after = [
      ...rows.map((r) =>
        plan.close.find((c) => c.id === r.id) ? { ...r, endDate: '2026-10-31' } : r,
      ),
      ...plan.create.map((c, i) => row({ id: `new-${i}`, ...c })),
    ];
    expect(activeOn(after, '2026-10-25').map((r) => r.id)).toEqual(['old']);
    expect(activeOn(after, '2026-10-30').map((r) => r.dose)).toEqual(['1/2 comprimé']);
    expect(activeOn(after, '2026-11-01').map((r) => r.dose)).toEqual(['1 comprimé et demi']);
  });
});

describe('activeOn : prise programmée et fin de traitement', () => {
  const seedRow = row({
    id: 'albifer',
    slot: 'OUTSIDE_MEALS',
    startDate: '2026-10-26',
    endDate: '2027-01-26',
  });

  it('est active pendant toute la durée du traitement, bornes incluses', () => {
    expect(activeOn([seedRow], '2026-10-26')).toHaveLength(1);
    expect(activeOn([seedRow], '2027-01-26')).toHaveLength(1);
  });

  it("n'est plus active après la date de fin", () => {
    expect(activeOn([seedRow], '2027-01-27')).toHaveLength(0);
  });

  it("n'est pas active avant la date de début", () => {
    expect(activeOn([seedRow], '2026-10-25')).toHaveLength(0);
  });
});

describe('medicationInputSchema', () => {
  const base = {
    name: 'Atrovast 80 mg',
    effectiveDate: '2026-10-27',
    schedules: [{ slot: 'DINNER', dose: '1 comprimé', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }],
  };

  it('accepte une saisie valide et applique les valeurs par défaut', () => {
    const parsed = medicationInputSchema.parse(base);
    expect(parsed.schedules[0]).toMatchObject({ mealRelation: 'NONE', notes: null, endDate: null });
  });

  it('rejette un créneau répété pour le même médicament', () => {
    const result = medicationInputSchema.safeParse({
      ...base,
      schedules: [base.schedules[0], base.schedules[0]],
    });
    expect(result.success).toBe(false);
  });

  it("rejette une date d'effet inexistante et un jour de semaine hors 1 à 7", () => {
    expect(medicationInputSchema.safeParse({ ...base, effectiveDate: '2026-02-30' }).success).toBe(
      false,
    );
    expect(
      medicationInputSchema.safeParse({
        ...base,
        schedules: [{ ...base.schedules[0], daysOfWeek: [8] }],
      }).success,
    ).toBe(false);
  });

  it('dédoublonne et trie les jours de la semaine', () => {
    const parsed = medicationInputSchema.parse({
      ...base,
      schedules: [{ ...base.schedules[0], daysOfWeek: [7, 1, 7, 3] }],
    });
    expect(parsed.schedules[0]?.daysOfWeek).toEqual([1, 3, 7]);
  });
});
