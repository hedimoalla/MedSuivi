import { fr } from '../i18n/fr';
import { useMe } from '../api/me';

export function TodayPage() {
  const me = useMe();
  if (me.isPending) {
    return null;
  }
  if (me.isError || !me.data) {
    return <p role="alert">{fr.errors.generic}</p>;
  }
  return (
    <section>
      <h2 className="text-2xl font-semibold">{fr.today.greeting(me.data.name ?? me.data.email)}</h2>
      <p className="pt-2 text-lg">{fr.today.placeholder}</p>
    </section>
  );
}
