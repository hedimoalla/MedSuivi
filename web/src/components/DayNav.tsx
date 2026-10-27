import { fr } from '../i18n/fr';
import { formatDate, shiftDate } from '../lib/tunis';

interface Props {
  date: string;
  today: string;
  onChange: (date: string) => void;
}

const arrowClass =
  'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-line bg-surface text-3xl font-bold shadow-sm transition-transform active:scale-95';

/** Navigation entre les jours : flèche précédente, date, aujourd'hui, flèche suivante. */
export function DayNav({ date, today, onChange }: Props) {
  const isToday = date === today;
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={arrowClass}
          aria-label={fr.today.previousDay}
          onClick={() => onChange(shiftDate(date, -1))}
        >
          ←
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            <span aria-hidden="true">{fr.icons.today} </span>
            {isToday
              ? fr.today.todayLabel
              : date < today
                ? fr.today.pastLabel
                : fr.today.futureLabel}
          </p>
          <p className="text-xl font-bold capitalize">{formatDate(date)}</p>
        </div>
        <button
          type="button"
          className={arrowClass}
          aria-label={fr.today.nextDay}
          onClick={() => onChange(shiftDate(date, 1))}
        >
          →
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(today)}
          disabled={isToday}
          className="min-h-14 flex-1 rounded-2xl bg-accent px-4 text-lg font-bold text-accent-fg shadow-sm disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
        >
          {fr.today.goToToday}
        </button>
        <label className="relative min-h-14 flex-1">
          <span className="sr-only">{fr.today.pickDate}</span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-2xl border-2 border-line bg-surface text-lg font-semibold"
          >
            {fr.icons.today} {fr.today.chooseDate}
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
