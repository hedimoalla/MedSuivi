import { useEffect, useState } from 'react';
import { fr } from '../i18n/fr';
import { currentSubscription, disableAlerts, enableAlerts, pushSupported } from '../lib/push';

type State = 'loading' | 'unsupported' | 'off' | 'on' | 'denied' | 'unavailable' | 'error';

export function AlertsToggle() {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!pushSupported()) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    currentSubscription()
      .then((subscription) => active && setState(subscription ? 'on' : 'off'))
      .catch(() => active && setState('error'));
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const result = await enableAlerts();
      setState(result === 'enabled' ? 'on' : result);
    } catch {
      setState('error');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await disableAlerts();
      setState('off');
    } catch {
      setState('error');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return null;

  const message = {
    unsupported: fr.alerts.unsupported,
    denied: fr.alerts.denied,
    unavailable: fr.alerts.unavailable,
    error: fr.alerts.failed,
    on: fr.alerts.enabled,
    off: fr.alerts.intro,
  }[state];

  const showEnable = state === 'off' || state === 'error';
  const showDisable = state === 'on';

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4 text-lg">
      <p>
        <span aria-hidden="true">{fr.icons.bell} </span>
        {message}
      </p>
      {showEnable && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-accent bg-accent-soft px-4 text-lg font-bold text-accent disabled:opacity-60"
        >
          {fr.alerts.enable}
        </button>
      )}
      {showDisable && (
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-line bg-surface px-4 text-lg font-semibold disabled:opacity-60"
        >
          {fr.alerts.disable}
        </button>
      )}
    </section>
  );
}
