import { MEAL_RELATIONS, SLOTS, type MealRelation, type Slot } from '@medsuivi/shared';
import { fr } from '../i18n/fr';
import type { ScheduleInput } from '../api/medications';

interface Props {
  value: ScheduleInput[];
  onChange: (next: ScheduleInput[]) => void;
  today: string;
}

const inputClass =
  'mt-2 min-h-14 w-full rounded-2xl border-2 border-line bg-surface px-4 text-lg text-fg';
const labelClass = 'block text-lg font-semibold';

export function ScheduleEditor({ value, onChange, today }: Props) {
  const update = (index: number, patch: Partial<ScheduleInput>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const toggleDay = (index: number, day: number) => {
    const current = value[index]?.daysOfWeek ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    update(index, { daysOfWeek: next.sort((a, b) => a - b) });
  };

  return (
    <div className="flex flex-col gap-6">
      {value.map((row, index) => (
        <fieldset
          key={index}
          className="flex flex-col gap-4 rounded-3xl border-2 border-line bg-surface p-4 shadow-md"
        >
          <legend className="px-2 text-xl font-extrabold">
            <span aria-hidden="true">💊 </span>Prise {index + 1}
          </legend>

          <label className={labelClass}>
            {fr.medications.slot}
            <select
              className={inputClass}
              value={row.slot}
              onChange={(e) => update(index, { slot: e.target.value as Slot })}
            >
              {SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {fr.slots[slot]}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            {fr.medications.mealRelation}
            <select
              className={inputClass}
              value={row.mealRelation}
              onChange={(e) => update(index, { mealRelation: e.target.value as MealRelation })}
            >
              {MEAL_RELATIONS.map((relation) => (
                <option key={relation} value={relation}>
                  {fr.mealRelations[relation]}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            {fr.medications.dose}
            <input
              className={inputClass}
              value={row.dose}
              placeholder={fr.medications.dosePlaceholder}
              onChange={(e) => update(index, { dose: e.target.value })}
            />
          </label>

          <div>
            <span className={labelClass}>{fr.medications.days}</span>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {fr.days.short.map((label, dayIndex) => {
                const day = dayIndex + 1;
                const selected = row.daysOfWeek.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleDay(index, day)}
                    className={`min-h-12 rounded-lg border-2 border-line text-base font-semibold ${
                      selected ? 'bg-accent text-accent-fg' : ''
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className={labelClass}>
            {fr.medications.notes}
            <input
              className={inputClass}
              value={row.notes ?? ''}
              placeholder={fr.medications.notesPlaceholder}
              onChange={(e) => update(index, { notes: e.target.value || null })}
            />
          </label>

          <label className={labelClass}>
            {fr.medications.endDate}
            <input
              type="date"
              className={inputClass}
              min={today}
              value={row.endDate ?? ''}
              onChange={(e) => update(index, { endDate: e.target.value || null })}
            />
          </label>

          {value.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-semibold shadow-sm"
            >
              {fr.medications.removeSchedule}
            </button>
          )}
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, emptySchedule()])}
        className="min-h-14 rounded-2xl border-2 border-dashed border-accent px-4 text-lg font-bold text-accent"
      >
        + {fr.medications.addSchedule}
      </button>
    </div>
  );
}

export const emptySchedule = (): ScheduleInput => ({
  slot: 'BREAKFAST',
  mealRelation: 'NONE',
  dose: '',
  notes: null,
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  endDate: null,
});
