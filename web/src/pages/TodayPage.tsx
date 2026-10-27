import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Slot } from '@medsuivi/shared';
import { fr } from '../i18n/fr';
import { useDay, useToggleDose, type ChecklistItem } from '../api/day';
import { useMe } from '../api/me';
import { useMedications } from '../api/medications';
import { DayNav } from '../components/DayNav';
import { SlotCard } from '../components/SlotCard';
import { ExtraDoses } from '../components/ExtraDoses';
import { nowInTunis, todayInTunis } from '../lib/tunis';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function TodayPage() {
  const today = todayInTunis();
  const [params, setParams] = useSearchParams();
  const requested = params.get('date');
  const date = requested && ISO.test(requested) ? requested : today;

  // L'heure courante sert à marquer les créneaux en retard. Mise à jour toutes les 30 s.
  const [nowHHmm, setNowHHmm] = useState(nowInTunis());
  useEffect(() => {
    const timer = setInterval(() => setNowHHmm(nowInTunis()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const me = useMe();
  const day = useDay(date);
  const toggle = useToggleDose(date);
  const medications = useMedications(true);

  const changeDate = (next: string) => {
    setParams(next === today ? {} : { date: next });
  };

  const onToggle = (item: ChecklistItem, slot: Slot) => {
    toggle.mutate({ medicationId: item.medicationId, slot, taken: !item.taken });
  };

  const medicationNames = new Map((medications.data ?? []).map((m) => [m.id, m.name]));
  const totals = day.data?.sections.reduce(
    (acc, section) => ({ taken: acc.taken + section.taken, total: acc.total + section.total }),
    { taken: 0, total: 0 },
  );

  return (
    <section className="flex flex-col gap-6">
      <DayNav date={date} today={today} onChange={changeDate} />

      {day.isPending && <p className="text-lg text-muted">{fr.today.loading}</p>}
      {day.isError && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-lg">
          {fr.errors.generic}
        </p>
      )}

      {day.data && totals && totals.total > 0 && (
        <div className="flex items-center justify-between rounded-3xl bg-accent-soft p-4 text-lg font-bold">
          <span>
            <span aria-hidden="true">{fr.icons.done} </span>
            {fr.today.dayProgress}
          </span>
          <span className="text-2xl">{fr.today.progress(totals.taken, totals.total)}</span>
        </div>
      )}

      {day.data && (
        <>
          {day.data.sections.map((section) => (
            <SlotCard
              key={section.slot}
              section={section}
              date={date}
              today={today}
              nowHHmm={nowHHmm}
              pending={toggle.isPending}
              onToggle={onToggle}
            />
          ))}

          <ExtraDoses date={date} extras={day.data.extras} medicationNames={medicationNames} />
        </>
      )}

      {me.data && !me.data.isAdmin && (
        <p className="flex items-center gap-2 text-base text-muted">
          <span aria-hidden="true">{fr.icons.readOnly}</span>
          {fr.today.readOnly}
        </p>
      )}
    </section>
  );
}
