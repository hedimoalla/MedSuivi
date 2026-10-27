import { useState, type FormEvent } from 'react';
import { fr } from '../i18n/fr';
import { useMedications } from '../api/medications';
import { useAddExtraDose, useDeleteExtraDose, type ExtraDose } from '../api/day';
import { formatTime } from '../lib/tunis';

interface Props {
  date: string;
  extras: ExtraDose[];
  medicationNames: Map<string, string>;
}

const inputClass =
  'mt-2 min-h-14 w-full rounded-2xl border-2 border-line bg-surface px-4 text-lg text-fg';

export function ExtraDoses({ date, extras, medicationNames }: Props) {
  const [open, setOpen] = useState(false);
  const [medicationId, setMedicationId] = useState('');
  const [note, setNote] = useState('');
  const medications = useMedications(false);
  const add = useAddExtraDose(date);
  const remove = useDeleteExtraDose(date);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!medicationId) return;
    add.mutate(
      { medicationId, note: note.trim() || null },
      {
        onSuccess: () => {
          setNote('');
          setMedicationId('');
          setOpen(false);
        },
      },
    );
  };

  return (
    <section
      className="flex flex-col gap-4 rounded-3xl border-2 border-line bg-surface p-4 shadow-md"
      aria-labelledby="extras-title"
    >
      <div>
        <h2 id="extras-title" className="flex items-center gap-2 text-2xl font-extrabold">
          <span aria-hidden="true" className="text-3xl">
            {fr.icons.extra}
          </span>
          {fr.today.extrasTitle}
        </h2>
        <p className="text-base text-muted">{fr.today.extrasHint}</p>
      </div>

      {extras.length === 0 && <p className="text-lg text-muted">{fr.today.extraEmpty}</p>}
      <ul className="flex flex-col gap-3">
        {extras.map((extra) => (
          <li
            key={extra.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-line bg-surface-2 p-3"
          >
            <span className="flex flex-col">
              <span className="text-lg font-bold">
                <span aria-hidden="true">{fr.icons.medications} </span>
                {medicationNames.get(extra.medicationId) ?? '—'}
              </span>
              <span className="text-base text-muted">
                <span aria-hidden="true">{fr.icons.time} </span>
                {formatTime(extra.takenAt)} · <span aria-hidden="true">{fr.icons.person} </span>
                {extra.takenByName}
                {extra.note ? ` · ${extra.note}` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(fr.today.extraDeleteConfirm)) remove.mutate(extra.id);
              }}
              className="min-h-12 rounded-xl border-2 border-line bg-surface px-3 text-base font-semibold"
            >
              {fr.today.extraDelete}
            </button>
          </li>
        ))}
      </ul>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-14 rounded-2xl border-2 border-dashed border-accent px-4 text-lg font-bold text-accent"
        >
          <span aria-hidden="true">{fr.icons.add} </span>
          {fr.today.addExtra}
        </button>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="block text-lg font-semibold">
            {fr.today.extraMedication}
            <select
              className={inputClass}
              value={medicationId}
              onChange={(e) => setMedicationId(e.target.value)}
              required
            >
              <option value="">—</option>
              {(medications.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-lg font-semibold">
            <span aria-hidden="true">{fr.icons.note} </span>
            {fr.today.extraNote}
            <input
              className={inputClass}
              value={note}
              placeholder={fr.today.extraNotePlaceholder}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!medicationId || add.isPending}
              className="min-h-14 flex-1 rounded-2xl bg-accent px-4 text-lg font-bold text-accent-fg shadow-sm disabled:opacity-60"
            >
              {fr.today.extraSave}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-14 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-semibold"
            >
              {fr.today.extraCancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
