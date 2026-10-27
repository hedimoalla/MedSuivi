import type { Slot } from '@medsuivi/shared';
import { fr } from '../i18n/fr';
import type { ChecklistItem, ChecklistSection } from '../api/day';
import { formatTime } from '../lib/tunis';
import { slotStatus } from '../lib/status';

interface Props {
  section: ChecklistSection;
  date: string;
  today: string;
  nowHHmm: string;
  pending: boolean;
  onToggle: (item: ChecklistItem, slot: Slot) => void;
}

const MEAL_HINT: Record<string, string> = {
  BEFORE: 'à jeun, avant le repas',
  DURING: 'pendant le repas',
  AFTER: 'après le repas',
  AWAY: 'loin des repas',
};

const STATUS_TONE = {
  done: 'border-success bg-success-soft',
  late: 'border-danger bg-danger-soft',
  pending: 'border-line bg-surface',
  empty: 'border-line bg-surface',
} as const;

export function SlotCard({ section, date, today, nowHHmm, pending, onToggle }: Props) {
  const status = slotStatus(section.slot, section.taken, section.total, date, today, nowHHmm);
  const percent = section.total === 0 ? 0 : Math.round((section.taken / section.total) * 100);

  return (
    <section
      className={`overflow-hidden rounded-3xl border-2 shadow-md ${STATUS_TONE[status]}`}
      aria-labelledby={`slot-${section.slot}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h2 id={`slot-${section.slot}`} className="flex items-center gap-2 text-2xl font-extrabold">
          <span aria-hidden="true" className="text-3xl">
            {fr.icons.slots[section.slot]}
          </span>
          {fr.slots[section.slot]}
        </h2>
        <div className="flex items-center gap-2">
          {section.total > 0 && (
            <span className="rounded-full bg-surface px-3 py-1 text-lg font-bold shadow-sm">
              {fr.today.progress(section.taken, section.total)}
            </span>
          )}
          {status === 'done' && (
            <span className="rounded-full bg-success px-3 py-1 text-base font-bold text-white">
              <span aria-hidden="true">{fr.icons.done} </span>
              {fr.today.done}
            </span>
          )}
          {status === 'late' && (
            <span className="rounded-full bg-danger px-3 py-1 text-base font-bold text-white">
              <span aria-hidden="true">{fr.icons.late} </span>
              {fr.today.late}
            </span>
          )}
        </div>
      </header>

      {section.total > 0 && (
        <div className="px-4 pb-3">
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={section.total}
            aria-valuenow={section.taken}
            aria-label={fr.slots[section.slot]}
          >
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {section.total === 0 ? (
        <p className="px-4 pb-4 text-lg text-muted">{fr.today.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3 px-3 pb-4">
          {section.items.map((item) => (
            <li key={item.medicationId}>
              <label
                className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border-2 p-3 transition-colors ${
                  item.taken ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
                } ${pending ? 'opacity-80' : ''}`}
              >
                <input
                  type="checkbox"
                  className="h-10 w-10 shrink-0 cursor-pointer accent-[var(--color-accent)]"
                  checked={item.taken}
                  disabled={pending}
                  onChange={() => onToggle(item, section.slot)}
                  aria-label={`${item.name} ${item.dose}`}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-xl font-bold">
                    <span aria-hidden="true">{fr.icons.medications} </span>
                    {item.name}
                  </span>
                  <span className="text-lg">{item.dose}</span>
                  {(MEAL_HINT[item.mealRelation] || item.notes) && (
                    <span className="text-base text-muted">
                      {MEAL_HINT[item.mealRelation] ?? ''}
                      {item.notes && (
                        <>
                          {MEAL_HINT[item.mealRelation] ? ' · ' : ''}
                          <span aria-hidden="true">{fr.icons.note} </span>
                          {item.notes}
                        </>
                      )}
                    </span>
                  )}
                  {item.taken && item.takenAt && item.takenBy && (
                    <span className="pt-1 text-base font-semibold text-accent">
                      <span aria-hidden="true">{fr.icons.done} </span>
                      {fr.today.takenAt(formatTime(item.takenAt), item.takenBy)}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
