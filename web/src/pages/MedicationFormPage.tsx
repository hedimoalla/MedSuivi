import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { ApiError, type ValidationIssue } from '../api/client';
import {
  useArchiveAction,
  useMedications,
  useSaveMedication,
  type MedicationInput,
  type ScheduleInput,
} from '../api/medications';
import { ScheduleEditor, emptySchedule } from '../components/ScheduleEditor';
import { activeOn } from '../lib/schedules';
import { todayInTunis } from '../lib/tunis';
import { useMe } from '../api/me';

const inputClass =
  'mt-2 min-h-14 w-full rounded-2xl border-2 border-line bg-surface px-4 text-lg text-fg';

export function MedicationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = todayInTunis();
  const medications = useMedications(true);
  const me = useMe();
  const medication = medications.data?.find((m) => m.id === id);

  const [name, setName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [schedules, setSchedules] = useState<ScheduleInput[]>([emptySchedule()]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Pré-remplissage avec les prises en cours, une seule fois, quand le médicament est chargé.
  const [loaded, setLoaded] = useState(!id);
  useEffect(() => {
    if (!id || loaded || !medication) return;
    setName(medication.name);
    const current = activeOn(medication.schedules, today).map((row) => ({
      slot: row.slot,
      mealRelation: row.mealRelation,
      dose: row.dose,
      notes: row.notes,
      daysOfWeek: row.daysOfWeek,
      endDate: row.endDate,
    }));
    setSchedules(current.length > 0 ? current : [emptySchedule()]);
    setLoaded(true);
  }, [id, loaded, medication, today]);

  const save = useSaveMedication(id);
  const archive = useArchiveAction(id ?? '');

  // Seul l'administrateur peut modifier la liste : les autres sont renvoyés vers la liste.
  if (me.isSuccess && !me.data.isAdmin) return <Navigate to="/medicaments" replace />;
  if (id && medications.isPending) return null;
  if (id && medications.isSuccess && !medication) {
    return <p role="alert">{fr.medications.notFound}</p>;
  }

  const isArchived = Boolean(medication?.archivedAt);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setIssues([]);
    setFormError(null);
    const input: MedicationInput = { name, effectiveDate, schedules };
    save.mutate(input, {
      onSuccess: () => navigate('/medicaments'),
      onError: (error) => {
        if (error instanceof ApiError && error.issues.length > 0) {
          setIssues(error.issues);
          return;
        }
        if (error instanceof ApiError && error.code === 'archived') {
          setFormError(fr.errors.archived);
          return;
        }
        setFormError(fr.errors.generic);
      },
    });
  };

  const issueFor = (path: string) => issues.find((issue) => issue.path === path)?.message;

  return (
    <section className="flex flex-col gap-6">
      <Link to="/medicaments" className="text-lg underline">
        ← {fr.medications.back}
      </Link>
      <h2 className="flex items-center gap-2 text-2xl font-extrabold">
        <span aria-hidden="true">{fr.icons.medications}</span>
        {id ? fr.medications.editTitle : fr.medications.newTitle}
      </h2>

      {isArchived && (
        <p className="rounded-2xl border-2 border-line bg-surface p-4 text-lg">
          {fr.medications.archivedNotice}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <label className="block text-lg font-semibold">
          {fr.medications.name}
          <input
            className={inputClass}
            value={name}
            placeholder={fr.medications.namePlaceholder}
            disabled={isArchived}
            onChange={(e) => setName(e.target.value)}
          />
          {issueFor('name') && <span className="block pt-1 text-base">{issueFor('name')}</span>}
        </label>

        <label className="block text-lg font-semibold">
          {fr.medications.effectiveDate}
          <input
            type="date"
            className={inputClass}
            min={today}
            value={effectiveDate}
            disabled={isArchived}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
          <span className="block pt-1 text-base font-normal text-muted">
            <span aria-hidden="true">{fr.icons.info} </span>
            {fr.medications.effectiveDateHint}
          </span>
          {issueFor('effectiveDate') && (
            <span className="block pt-1 text-base">{issueFor('effectiveDate')}</span>
          )}
        </label>

        <div>
          <h3 className="flex items-center gap-2 pb-3 text-xl font-extrabold">
            <span aria-hidden="true">{fr.icons.time}</span>
            {fr.medications.schedules}
          </h3>
          <ScheduleEditor value={schedules} onChange={setSchedules} today={today} />
          {issueFor('schedules') && <p className="pt-2 text-base">{issueFor('schedules')}</p>}
        </div>

        {formError && (
          <p role="alert" className="rounded-2xl border-2 border-line bg-surface p-4 text-lg">
            {formError}
          </p>
        )}
        {issues.length > 0 &&
          !issueFor('name') &&
          !issueFor('effectiveDate') &&
          !issueFor('schedules') && (
            <p role="alert" className="text-lg">
              {issues[0]?.message}
            </p>
          )}

        {!isArchived && (
          <button
            type="submit"
            disabled={save.isPending}
            className="min-h-14 rounded-2xl bg-accent px-4 text-lg font-bold text-accent-fg shadow-md disabled:opacity-60"
          >
            {save.isPending ? fr.medications.saving : fr.medications.save}
          </button>
        )}
      </form>

      {id && (
        <div className="flex flex-col gap-3 border-t-2 border-line pt-6">
          <p className="text-base text-muted">{fr.medications.archiveHint}</p>
          <button
            type="button"
            disabled={archive.isPending}
            onClick={() => {
              if (isArchived) {
                archive.mutate('restore');
                return;
              }
              if (window.confirm(fr.medications.confirmArchive)) {
                archive.mutate('archive');
              }
            }}
            className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-semibold shadow-sm"
          >
            {isArchived ? fr.medications.restore : fr.medications.archive}
          </button>
        </div>
      )}
    </section>
  );
}
