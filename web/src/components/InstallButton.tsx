import { useEffect, useState } from 'react';
import { fr } from '../i18n/fr';

// L'événement n'existe que sur Android et ordinateur (Chrome, Edge). Sur iPhone, l'installation
// se fait depuis le menu Partager de Safari : le bouton n'apparaît donc pas.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!prompt || installed) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') setInstalled(true);
        setPrompt(null);
      }}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-accent bg-accent-soft px-4 text-lg font-bold text-accent"
    >
      <span aria-hidden="true">📲 </span>
      {fr.install.button}
    </button>
  );
}
