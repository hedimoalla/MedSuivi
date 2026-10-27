const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(title)} · MedSuivi</title>
  <style>
    :root { color-scheme: light dark; --bg: #ffffff; --fg: #111111; --accent: #0b5cad; }
    @media (prefers-color-scheme: dark) { :root { --bg: #111111; --fg: #ffffff; --accent: #7fb8ff; } }
    body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 16px; box-sizing: border-box; overflow-wrap: anywhere;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 22px;
      background: var(--bg); color: var(--fg); }
    main { max-width: 420px; width: 100%; min-width: 0; text-align: center; box-sizing: border-box; }
    h1 { font-size: 34px; margin: 0 0 16px; }
    p { line-height: 1.5; }
    a.button { display: flex; align-items: center; justify-content: center; min-height: 64px; margin-top: 24px; padding: 16px; border-radius: 14px; box-sizing: border-box;
      background: var(--accent); color: #000000; font-weight: 700; text-decoration: none; font-size: 24px; }
    .small { font-size: 18px; opacity: 0.85; margin-top: 24px; }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

export function loginPage(options: { error?: string } = {}): string {
  const error = options.error ? `<p role="alert">${escapeHtml(options.error)}</p>` : '';
  return shell(
    'Connexion',
    `<h1>MedSuivi</h1>
    <p>Connectez-vous avec votre compte Google de la famille.</p>
    ${error}
    <a class="button" href="/auth/google">Se connecter avec Google</a>
    <p class="small">Outil de suivi, pas un avis médical. La liste doit suivre l'ordonnance du médecin.</p>`,
  );
}

export function accessDeniedPage(): string {
  return shell(
    'Accès non autorisé',
    `<h1>Accès non autorisé</h1>
    <p>Ce compte Google n'est pas autorisé à utiliser MedSuivi.</p>
    <p>Si vous êtes de la famille et que vous pensez que c'est une erreur, contactez la personne qui administre l'application.</p>
    <a class="button" href="/login">Retour</a>`,
  );
}
