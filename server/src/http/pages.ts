const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Palette claire, identique à l'application (web/src/index.css).
function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#0c6b5e" />
  <title>${escapeHtml(title)} · MedSuivi</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 16px; box-sizing: border-box; overflow-wrap: anywhere; background: #f4f7fb; color: #14202e;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 22px; line-height: 1.5; }
    main { max-width: 420px; width: 100%; min-width: 0; text-align: center; box-sizing: border-box; background: #ffffff;
      border-radius: 28px; padding: 32px 24px; box-shadow: 0 8px 30px rgb(20 32 46 / 0.12); }
    .logo { font-size: 56px; line-height: 1; }
    h1 { font-size: 34px; margin: 12px 0 8px; }
    p { line-height: 1.5; color: #14202e; }
    .muted { color: #4b5a6b; font-size: 18px; }
    a.button { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 64px; margin-top: 28px;
      padding: 16px; border-radius: 16px; background: #0c6b5e; color: #ffffff; font-weight: 700; text-decoration: none;
      font-size: 22px; box-sizing: border-box; box-shadow: 0 4px 12px rgb(12 107 94 / 0.3); }
    a.button:focus-visible { outline: 3px solid #0c6b5e; outline-offset: 3px; }
    .alert { background: #fde4e1; color: #7a1d15; border-radius: 14px; padding: 14px; font-size: 18px; }
    .note { margin-top: 28px; padding: 14px; border-radius: 16px; background: #eaf0f7; font-size: 16px; color: #4b5a6b; }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

export function loginPage(options: { error?: string } = {}): string {
  const error = options.error
    ? `<p class="alert" role="alert">⚠️ ${escapeHtml(options.error)}</p>`
    : '';
  return shell(
    'Connexion',
    `<div class="logo" aria-hidden="true">💊</div>
    <h1>MedSuivi</h1>
    <p>Bienvenue 👋 Connectez-vous avec votre compte Google de la famille.</p>
    ${error}
    <a class="button" href="/auth/google"><span aria-hidden="true">🔐</span> Se connecter avec Google</a>
    <p class="note">ℹ️ Outil de suivi, pas un avis médical. La liste doit suivre l'ordonnance du médecin.</p>`,
  );
}

export function accessDeniedPage(): string {
  return shell(
    'Accès non autorisé',
    `<div class="logo" aria-hidden="true">🔒</div>
    <h1>Accès non autorisé</h1>
    <p>Ce compte Google n'est pas autorisé à utiliser MedSuivi.</p>
    <p class="muted">Si vous êtes de la famille et que c'est une erreur, contactez la personne qui administre l'application.</p>
    <a class="button" href="/login">↩️ Retour</a>`,
  );
}
