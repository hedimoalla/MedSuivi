import { describe, expect, it } from 'vitest';
import { adherenceByMedication, dateRange, dayStatus, percent } from '../src/domain/history';
import { buildChecklist, type MedicationForDay } from '../src/domain/checklist';

const TODAY = '2026-10-27';

describe('dayStatus', () => {
  it('marque un jour sans prévu comme « none »', () => {
    expect(dayStatus('2026-10-20', TODAY, 0, 0)).toBe('none');
  });

  it('distingue complet, partiel et manqué pour un jour passé', () => {
    expect(dayStatus('2026-10-20', TODAY, 4, 4)).toBe('complete');
    expect(dayStatus('2026-10-20', TODAY, 2, 4)).toBe('partial');
    expect(dayStatus('2026-10-20', TODAY, 0, 4)).toBe('missed');
  });

  it("laisse aujourd'hui en cours tant que tout n'est pas coché", () => {
    expect(dayStatus(TODAY, TODAY, 1, 4)).toBe('pending');
    expect(dayStatus(TODAY, TODAY, 4, 4)).toBe('complete');
  });

  it('marque les jours à venir comme « future »', () => {
    expect(dayStatus('2026-10-28', TODAY, 0, 4)).toBe('future');
  });
});

describe('dateRange', () => {
  it('inclut les deux bornes, y compris à cheval sur un mois', () => {
    expect(dateRange('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });

  it('renvoie une seule date si from = to', () => {
    expect(dateRange(TODAY, TODAY)).toEqual([TODAY]);
  });
});

describe('observance', () => {
  const med = (id: string, name: string, slot: 'BREAKFAST' | 'DINNER'): MedicationForDay => ({
    id,
    name,
    archivedAt: null,
    schedules: [
      {
        id: `${id}-s`,
        slot,
        mealRelation: 'NONE',
        dose: '1 comprimé',
        notes: null,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        startDate: '2026-10-01',
        endDate: null,
      },
    ],
  });

  it('compte les prises prévues et cochées par médicament sur plusieurs jours', () => {
    const meds = [med('a', 'Atrovast', 'DINNER'), med('p', 'Pidogrel', 'BREAKFAST')];
    const checklists = [
      buildChecklist(
        '2026-10-25',
        meds,
        [
          {
            medicationId: 'a',
            slot: 'DINNER',
            takenAt: '2026-10-25T20:00:00Z',
            takenByName: 'Moi',
          },
        ],
        [],
      ),
      buildChecklist('2026-10-26', meds, [], []),
    ];
    const result = adherenceByMedication(checklists);
    expect(result).toEqual([
      { medicationId: 'a', name: 'Atrovast', planned: 2, taken: 1 },
      { medicationId: 'p', name: 'Pidogrel', planned: 2, taken: 0 },
    ]);
  });

  it('calcule un pourcentage arrondi et gère le cas sans prévu', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});
