import { fr } from '../i18n/fr';
import { useAudit } from '../api/medications';
import { formatDateTime } from '../lib/tunis';

export function AuditPage() {
  const audit = useAudit();
  if (audit.isPending) return null;
  if (audit.isError) return <p role="alert">{fr.errors.generic}</p>;

  const entries = audit.data;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-2xl font-extrabold">
        <span aria-hidden="true">{fr.icons.audit}</span>
        {fr.audit.title}
      </h2>
      {entries.length === 0 && <p className="text-lg">{fr.audit.empty}</p>}
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => {
          const name = entry.after?.name ?? entry.before?.name ?? '';
          return (
            <li
              key={entry.id}
              className="rounded-3xl border-2 border-line bg-surface p-4 shadow-md"
            >
              <p className="flex items-center gap-2 text-lg font-bold">
                <span aria-hidden="true">✏️</span>
                {fr.audit.actions[entry.action] ?? entry.action}
                {name && ` : ${name}`}
              </p>
              <p className="text-base text-muted">
                <span aria-hidden="true">{fr.icons.person} </span>
                {entry.user} · {formatDateTime(entry.createdAt)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
