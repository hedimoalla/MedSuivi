import { useReport } from '../api/history';
import { fr } from '../i18n/fr';
import { formatDate, formatTime } from '../lib/tunis';

const SLOT_LABEL: Record<string, string> = {
  BREAKFAST: 'Petit-déjeuner',
  LUNCH: 'Déjeuner',
  DINNER: 'Dîner',
  BEDTIME: 'Avant le coucher',
  OUTSIDE_MEALS: 'Hors repas',
};
const MEAL_LABEL: Record<string, string> = {
  BEFORE: 'à jeun, avant le repas',
  DURING: 'pendant le repas',
  AFTER: 'après le repas',
  AWAY: 'loin des repas',
  NONE: '',
};
const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

function daysLabel(days: number[]): string {
  return days.length === 7 ? 'tous les jours' : days.map((d) => DAYS[d - 1]).join(', ');
}

export function ReportPage() {
  const report = useReport(30);

  if (report.isPending) return <p className="text-lg text-muted">{fr.today.loading}</p>;
  if (report.isError)
    return (
      <p role="alert" className="text-lg">
        {fr.errors.generic}
      </p>
    );
  const data = report.data;

  return (
    <article className="flex flex-col gap-6 print:gap-4">
      <div className="flex flex-col gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-14 rounded-2xl bg-accent px-4 text-lg font-bold text-accent-fg shadow-md"
        >
          <span aria-hidden="true">🖨️ </span>
          Imprimer ou enregistrer en PDF
        </button>
        <p className="text-base text-muted">
          Sur téléphone : menu du navigateur → « Imprimer » → « Enregistrer au format PDF ».
        </p>
      </div>

      <header className="rounded-3xl border-2 border-line bg-surface p-5 print:border-0 print:p-0">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold">
          <span aria-hidden="true" className="print:hidden">
            💊{' '}
          </span>
          Rapport de suivi des médicaments
        </h2>
        <p className="pt-2 text-lg">
          Période : {formatDate(data.from)} au {formatDate(data.to)} ({data.days} jours)
        </p>
        <p className="text-base text-muted">Édité le {formatTime(data.generatedAt)} · MedSuivi</p>
      </header>

      <section
        className="rounded-3xl border-2 border-line bg-surface p-5 print:border-0 print:p-0"
        aria-labelledby="meds-title"
      >
        <h3 id="meds-title" className="pb-3 text-xl font-extrabold">
          <span aria-hidden="true">💊 </span>Médicaments en cours
        </h3>
        {data.medications.length === 0 && <p className="text-lg">Aucun médicament en cours.</p>}
        <ul className="flex flex-col gap-4">
          {data.medications.map((med) => (
            <li key={med.name} className="border-b border-line pb-3 last:border-0">
              <p className="text-lg font-bold">{med.name}</p>
              <ul className="pl-4 text-base">
                {med.schedules.map((s, index) => (
                  <li key={index}>
                    {SLOT_LABEL[s.slot]} · {s.dose} · {daysLabel(s.daysOfWeek)}
                    {MEAL_LABEL[s.mealRelation] ? ` · ${MEAL_LABEL[s.mealRelation]}` : ''}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-3xl border-2 border-line bg-surface p-5 print:border-0 print:p-0"
        aria-labelledby="adh-title"
      >
        <h3 id="adh-title" className="pb-2 text-xl font-extrabold">
          <span aria-hidden="true">📊 </span>Observance sur {data.days} jours
        </h3>
        <p className="text-3xl font-extrabold">{data.adherence.percent} %</p>
        <p className="pb-3 text-base text-muted">
          {data.adherence.taken} prises cochées sur {data.adherence.planned} prévues
        </p>
        <ul className="flex flex-col gap-3">
          {data.perMedication.map((entry) => (
            <li key={entry.medicationId}>
              <div className="flex justify-between text-base">
                <span className="font-semibold">{entry.name}</span>
                <span>
                  {entry.taken} / {entry.planned} · {entry.percent} %
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2 print:border print:border-black">
                <div
                  className="h-full bg-accent print:bg-black"
                  style={{ width: `${entry.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-3xl border-2 border-line bg-surface p-5 print:border-0 print:p-0"
        aria-labelledby="extra-title"
      >
        <h3 id="extra-title" className="pb-3 text-xl font-extrabold">
          <span aria-hidden="true">🆘 </span>Doses au besoin
        </h3>
        {data.extras.length === 0 && (
          <p className="text-lg">Aucune dose au besoin sur la période.</p>
        )}
        <ul className="flex flex-col gap-2 text-base">
          {data.extras.map((extra, index) => (
            <li key={index}>
              {formatDate(extra.date)} · {formatTime(extra.takenAt)} · {extra.name} ·{' '}
              {extra.takenBy}
              {extra.note ? ` · ${extra.note}` : ''}
            </li>
          ))}
        </ul>
      </section>

      <footer className="rounded-2xl bg-surface-2 p-4 text-base text-muted print:bg-transparent">
        <span aria-hidden="true">ℹ️ </span>
        {fr.app.disclaimer}
      </footer>
    </article>
  );
}
