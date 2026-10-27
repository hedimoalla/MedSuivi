import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { useMedications, type Medication } from '../api/medications';
import { activeOn } from '../lib/schedules';
import { todayInTunis } from '../lib/tunis';
import { useMe } from '../api/me';

function summarize(medication: Medication): string {
  const today = todayInTunis();
  const rows = activeOn(medication.schedules, today);
  if (rows.length === 0) return 'Aucune prise en cours';
  return rows
    .map((row) => {
      const days =
        row.daysOfWeek.length === 7
          ? fr.days.everyDay
          : row.daysOfWeek.map((d) => fr.days.short[d - 1]).join(', ');
      return `${fr.slots[row.slot]} : ${row.dose}, ${days.toLowerCase()}`;
    })
    .join(' · ');
}

export function MedicationsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const medications = useMedications(showArchived);
  const me = useMe();
  const isAdmin = me.data?.isAdmin ?? false;

  if (medications.isPending) return null;
  if (medications.isError) return <p role="alert">{fr.errors.generic}</p>;

  const list = medications.data;
  return (
    <section className="flex flex-col gap-6">
      {!isAdmin && (
        <p className="rounded-2xl border-2 border-line bg-surface p-4 text-lg">
          {fr.medications.readOnlyHint}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {isAdmin && (
          <Link
            to="/medicaments/nouveau"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-accent px-4 text-lg font-bold text-accent-fg shadow-md"
          >
            <span aria-hidden="true">{fr.icons.add} </span>
            {fr.medications.add}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setShowArchived((value) => !value)}
          className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-semibold shadow-sm"
        >
          {showArchived ? fr.medications.hideArchived : fr.medications.showArchived}
        </button>
      </div>

      {list.length === 0 && <p className="text-lg">{fr.medications.empty}</p>}

      <ul className="flex flex-col gap-4">
        {list.map((medication) => (
          <li
            key={medication.id}
            className="rounded-3xl border-2 border-line bg-surface p-4 shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <span aria-hidden="true">{fr.icons.medications}</span>
                {medication.name}
              </h2>
              {medication.archivedAt && (
                <span className="rounded-lg border-2 border-line bg-surface px-2 text-base">
                  <span aria-hidden="true">📦 </span>
                  {fr.medications.archivedBadge}
                </span>
              )}
            </div>
            <p className="pt-2 text-lg text-muted">{summarize(medication)}</p>
            {isAdmin && (
              <Link
                to={`/medicaments/${medication.id}`}
                className="mt-3 flex min-h-12 items-center justify-center rounded-xl border-2 border-line px-4 text-lg font-semibold"
              >
                {fr.medications.edit}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
