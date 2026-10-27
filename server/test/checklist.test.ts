import { describe, expect, it } from 'vitest';
import { buildChecklist, isoWeekday, type MedicationForDay } from '../src/domain/checklist';
import type { ScheduleRow } from '../src/domain/schedules';

const ALL = [1, 2, 3, 4, 5, 6, 7];

function row(overrides: Partial<ScheduleRow>): ScheduleRow {
  return {
    id: 's',
    slot: 'BREAKFAST',
    mealRelation: 'NONE',
    dose: '1 comprimé',
    notes: null,
    daysOfWeek: ALL,
    startDate: '2026-10-26',
    endDate: '2027-01-26',
    ...overrides,
  };
}

function med(
  id: string,
  name: string,
  schedules: ScheduleRow[],
  archivedAt: string | null = null,
): MedicationForDay {
  return { id, name, archivedAt, schedules };
}

const itemsOf = (checklist: ReturnType<typeof buildChecklist>, slot: string) =>
  checklist.sections.find((section) => section.slot === slot)!.items.map((item) => item.name);

describe('isoWeekday', () => {
  it('renvoie 1 pour lundi et 7 pour dimanche', () => {
    expect(isoWeekday('2026-10-26')).toBe(1); // lundi
    expect(isoWeekday('2026-10-31')).toBe(6); // samedi
    expect(isoWeekday('2026-11-01')).toBe(7); // dimanche
  });
});

describe('buildChecklist', () => {
  it("range chaque prise dans son créneau, dans l'ordre de la journée", () => {
    const checklist = buildChecklist(
      '2026-10-27',
      [
        med('a', 'Atrovast', [row({ id: 'a', slot: 'DINNER' })]),
        med('p', 'Pidogrel', [row({ id: 'p', slot: 'BREAKFAST' })]),
      ],
      [],
      [],
    );
    expect(checklist.sections.map((section) => section.slot)).toEqual([
      'BREAKFAST',
      'LUNCH',
      'DINNER',
      'OUTSIDE_MEALS',
      'BEDTIME',
    ]);
    expect(itemsOf(checklist, 'BREAKFAST')).toEqual(['Pidogrel']);
    expect(itemsOf(checklist, 'DINNER')).toEqual(['Atrovast']);
  });

  it('respecte les jours de la semaine', () => {
    // 2026-10-27 est un mardi (2).
    const weekdaysOnly = row({ id: 'w', daysOfWeek: [1, 3, 5] });
    const tuesday = buildChecklist('2026-10-27', [med('m', 'Rare', [weekdaysOnly])], [], []);
    expect(itemsOf(tuesday, 'BREAKFAST')).toEqual([]);

    const monday = buildChecklist('2026-10-26', [med('m', 'Rare', [weekdaysOnly])], [], []);
    expect(itemsOf(monday, 'BREAKFAST')).toEqual(['Rare']);
  });

  it("n'affiche une prise qu'entre sa date de début et sa date de fin, bornes incluses", () => {
    const seasonal = row({ id: 'x', startDate: '2026-10-26', endDate: '2026-10-30' });
    const meds = [med('m', 'Temporaire', [seasonal])];
    expect(itemsOf(buildChecklist('2026-10-25', meds, [], []), 'BREAKFAST')).toEqual([]);
    expect(itemsOf(buildChecklist('2026-10-30', meds, [], []), 'BREAKFAST')).toEqual([
      'Temporaire',
    ]);
    expect(itemsOf(buildChecklist('2026-10-31', meds, [], []), 'BREAKFAST')).toEqual([]);
  });

  it('affiche la prise programmée « Hors repas » tous les jours, sans heure fixe', () => {
    const albifer = row({
      id: 'alb',
      slot: 'OUTSIDE_MEALS',
      mealRelation: 'AWAY',
      dose: '1 comprimé',
    });
    const checklist = buildChecklist(
      '2026-12-15',
      [med('alb', 'Albifer 120 mg', [albifer])],
      [],
      [],
    );
    const section = checklist.sections.find((s) => s.slot === 'OUTSIDE_MEALS')!;
    expect(section.items).toHaveLength(1);
    expect(section.items[0]).toMatchObject({
      name: 'Albifer 120 mg',
      mealRelation: 'AWAY',
      taken: false,
    });
  });

  it("utilise l'horaire en vigueur à la date demandée, pas celui d'aujourd'hui", () => {
    const before = row({
      id: 'old',
      startDate: '2026-10-26',
      endDate: '2026-10-31',
      dose: '1 comprimé',
    });
    const after = row({ id: 'new', startDate: '2026-11-01', dose: '1/2 comprimé' });
    const meds = [med('m', 'Aldactone', [before, after])];
    expect(buildChecklist('2026-10-30', meds, [], []).sections[0]!.items[0]!.dose).toBe(
      '1 comprimé',
    );
    expect(buildChecklist('2026-11-02', meds, [], []).sections[0]!.items[0]!.dose).toBe(
      '1/2 comprimé',
    );
  });

  it('marque une prise cochée avec qui et quand', () => {
    const meds = [med('m', 'Lasilix', [row({ id: 'l' })])];
    const checklist = buildChecklist(
      '2026-10-27',
      meds,
      [
        {
          medicationId: 'm',
          slot: 'BREAKFAST',
          takenAt: '2026-10-27T07:12:00Z',
          takenByName: 'Mère',
        },
      ],
      [],
    );
    const section = checklist.sections[0]!;
    expect(section.items[0]).toMatchObject({
      taken: true,
      takenBy: 'Mère',
      takenAt: '2026-10-27T07:12:00Z',
    });
    expect(section).toMatchObject({ taken: 1, total: 1 });
  });

  it('ne compte pas une prise cochée dans un autre créneau du même médicament', () => {
    const meds = [
      med('m', 'Multi', [row({ id: 'b', slot: 'BREAKFAST' }), row({ id: 'd', slot: 'DINNER' })]),
    ];
    const checklist = buildChecklist(
      '2026-10-27',
      meds,
      [
        {
          medicationId: 'm',
          slot: 'BREAKFAST',
          takenAt: '2026-10-27T07:00:00Z',
          takenByName: 'Frère',
        },
      ],
      [],
    );
    expect(checklist.sections[0]!.items[0]!.taken).toBe(true);
    expect(checklist.sections.find((s) => s.slot === 'DINNER')!.items[0]!.taken).toBe(false);
  });

  it("masque un médicament archivé sauf s'il a été pris ce jour-là", () => {
    const archived = med('z', 'Ancien', [row({ id: 'z' })], '2026-10-20T10:00:00Z');
    expect(buildChecklist('2026-10-27', [archived], [], []).sections[0]!.items).toEqual([]);

    const log = [
      {
        medicationId: 'z',
        slot: 'BREAKFAST' as const,
        takenAt: '2026-10-27T07:00:00Z',
        takenByName: 'Moi',
      },
    ];
    expect(buildChecklist('2026-10-27', [archived], log, []).sections[0]!.items).toHaveLength(1);
  });

  it("trie les prises d'un même créneau par nom", () => {
    const meds = [med('b', 'Zocor', [row({ id: 'b' })]), med('a', 'Atrovast', [row({ id: 'a' })])];
    expect(itemsOf(buildChecklist('2026-10-27', meds, [], []), 'BREAKFAST')).toEqual([
      'Atrovast',
      'Zocor',
    ]);
  });

  it('renvoie les prises au besoin du jour, sans les mélanger aux prises programmées', () => {
    const checklist = buildChecklist(
      '2026-10-27',
      [med('m', 'Paracétamol', [])],
      [],
      [
        {
          id: 'e1',
          medicationId: 'm',
          takenAt: '2026-10-27T15:00:00Z',
          takenByName: 'Moi',
          note: 'douleur',
        },
      ],
    );
    expect(checklist.extras).toHaveLength(1);
    expect(checklist.sections.every((s) => s.items.length === 0)).toBe(true);
  });
});
