import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { useHistory, type DayStatus } from '../api/history';
import { currentMonth, isoWeekday, monthBounds, monthLabel, shiftMonth } from '../lib/calendar';

const WEEK_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH = /^\d{4}-\d{2}$/;

const STATUS_STYLE: Record<DayStatus, { cell: string; icon: string }> = {
  complete: { cell: 'bg-success-soft border-success', icon: '✅' },
  partial: { cell: 'bg-warning-soft border-warning', icon: '🟡' },
  missed: { cell: 'bg-danger-soft border-danger', icon: '❌' },
  pending: { cell: 'bg-accent-soft border-accent', icon: '⏳' },
  future: { cell: 'bg-surface border-line text-muted', icon: '' },
  none: { cell: 'bg-surface border-line text-muted', icon: '' },
};

export function HistoryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = params.get('mois');
  const month = requested && MONTH.test(requested) ? requested : currentMonth();
  const { from, to } = monthBounds(month);
  const history = useHistory(from, to);

  const byDate = new Map((history.data?.days ?? []).map((day) => [day.date, day]));
  const leading = isoWeekday(from) - 1;
  const cells: (string | null)[] = [
    ...Array(leading).fill(null),
    ...(history.data?.days ?? []).map((d) => d.date),
  ];

  const go = (next: string) => setParams({ mois: next });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 rounded-3xl bg-surface p-4 shadow-md">
        <button
          type="button"
          onClick={() => go(shiftMonth(month, -1))}
          aria-label="Mois précédent"
          className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-line text-3xl font-bold"
        >
          ←
        </button>
        <h2 className="text-center text-2xl font-extrabold capitalize">
          <span aria-hidden="true">📅 </span>
          {monthLabel(month)}
        </h2>
        <button
          type="button"
          onClick={() => go(shiftMonth(month, 1))}
          aria-label="Mois suivant"
          className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-line text-3xl font-bold"
        >
          →
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-bold text-muted">
          {WEEK_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, index) =>
            date === null ? (
              <span key={`pad-${index}`} />
            ) : (
              <DayCell
                key={date}
                date={date}
                status={byDate.get(date)?.status ?? 'none'}
                taken={byDate.get(date)?.taken ?? 0}
                total={byDate.get(date)?.total ?? 0}
                onOpen={() => navigate(`/?date=${date}`)}
              />
            ),
          )}
        </div>
        {history.isPending && <p className="text-lg text-muted">{fr.today.loading}</p>}
        {history.isError && (
          <p role="alert" className="text-lg">
            {fr.errors.generic}
          </p>
        )}
      </div>

      <Legend />

      <Link
        to="/imprimer"
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-lg font-bold text-accent-fg shadow-md"
      >
        <span aria-hidden="true">🖨️</span>
        Rapport pour le cardiologue
      </Link>
    </section>
  );
}

function DayCell({
  date,
  status,
  taken,
  total,
  onOpen,
}: {
  date: string;
  status: DayStatus;
  taken: number;
  total: number;
  onOpen: () => void;
}) {
  const style = STATUS_STYLE[status];
  const day = Number(date.slice(8, 10));
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${date} : ${total === 0 ? 'rien de prévu' : `${taken} sur ${total} pris`}`}
      className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 p-1 text-lg font-bold ${style.cell}`}
    >
      <span>{day}</span>
      <span aria-hidden="true" className="text-base leading-none">
        {style.icon}
      </span>
    </button>
  );
}

function Legend() {
  const items: [string, string][] = [
    ['✅', 'Tout pris'],
    ['🟡', 'En partie'],
    ['❌', 'Rien de pris'],
    ['⏳', "Aujourd'hui, en cours"],
  ];
  return (
    <ul className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-4 text-base">
      {items.map(([icon, text]) => (
        <li key={text} className="flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          {text}
        </li>
      ))}
    </ul>
  );
}
