# MedSuivi : contexte pour Claude

Application privée et partagée (3 membres de la famille) pour suivre la prise quotidienne des médicaments d'un père, après 3 stents. C'est une checklist et un outil de rappel, **pas un avis médical**. La liste doit toujours suivre l'ordonnance du médecin. L'app ne suggère jamais de doses ni d'interactions, et ne modifie jamais le planning automatiquement.

## Stack

- Monorepo npm workspaces : `shared/` (constantes de créneaux), `server/` (Express + TypeScript), `web/` (React + Vite + Tailwind, PWA prévue).
- Base : PostgreSQL (Supabase en développement, Prisma pour l'accès et les migrations). Migrations committées dans `server/prisma/migrations`.
- Auth : Google Sign-In uniquement (passport + passport-google-oauth20, flux serveur). Aucun mot de passe stocké. Sessions dans PostgreSQL (table `session`, connect-pg-simple).
- Validation : zod. Tests : Vitest + supertest. Lint : ESLint + Prettier.
- Node 20.18 : éviter les options récentes (`--env-file-if-exists`). Vite 6 (Vite 7 demande Node 20.19+).

## Commandes

- `npm run dev:server` : API sur http://localhost:3000 (tsx watch, lit `.env`).
- `npm run dev:web` : rebuild continu de `web/dist`, servi par Express.
- `npm run build` : construit le web puis le serveur.
- `npm test` : tests serveur. `npm run lint`, `npm run typecheck`.
- `npm run db:migrate` : applique les migrations (lit `../.env`).

## Conventions

- Tout texte d'interface en français, dans `web/src/i18n/fr.ts`. Les pages serveur (connexion, accès refusé) ont leurs textes dans `server/src/http/pages.ts`.
- Pas de données médicales dans les logs ni dans les URL. En production, le journal ne contient que le nom de l'erreur.
- Ne jamais committer `.env` ni le certificat `~/.config/medsuivi/`. `DATABASE_CA_PATH` pointe vers le certificat racine Supabase, qui reste hors du dépôt.
- `DEV_AUTH_BYPASS=true` n'est accepté qu'en `NODE_ENV=development` : la configuration refuse de démarrer sinon.
- Les dates « aujourd'hui » se calculent en `Africa/Tunis`, jamais avec le fuseau du serveur.
- Un médicament n'est jamais supprimé physiquement : on l'archive. Une modification de dose crée de nouvelles lignes `Schedule` datées, et clôt les anciennes. Le passé ne change pas.
- Le journal d'audit enregistre qui a changé quoi, et quand.

## Exigences clés

- Accès : seules les adresses de `ALLOWED_EMAILS` peuvent ouvrir une session. Vérification de `email_verified`, comparaison insensible à la casse, recherche par `sub` Google. Une session est fermée dès que l'adresse n'est plus autorisée.
- Sessions : cookie httpOnly, secure en production, SameSite=Lax, 30 jours glissants.
- Chaque action (cocher une dose, modifier un médicament) est attribuée à l'utilisateur connecté.
- Fuseau : `Africa/Tunis`. Le retard se calcule à partir d'heures indicatives par créneau (`shared/src/slots.ts`).
- Mobile d'abord : utilisation sur téléphone seul, zones tactiles d'au moins 48 px, texte à 20 px, contraste élevé.

## Seed de l'ordonnance (Dr Mehdi Kerkeni, 2026-10-26 au 2027-01-26)

À charger par `npm run seed:prescription`, séparément des migrations, jamais lancé automatiquement en production.

- Atrovast 80 mg : 1 comprimé, Dîner
- Pidogrel 75 mg : 1 comprimé, Petit-déjeuner
- Cardiocine 100 mg : 1 comprimé, Déjeuner (note : Aspégic est une alternative prescrite par le médecin, pas un médicament en plus)
- Cincor 25 mg : 1 comprimé, Petit-déjeuner
- Aldactone 50 mg : 1/2 comprimé, Petit-déjeuner
- Lasilix 40 mg : 1 comprimé, Petit-déjeuner
- Albifer 120 mg : 1 comprimé, Hors repas (loin des repas), prise quotidienne
- **Rugdal 40 mg : 1 comprimé, Coucher** (pansement gastrique). Confirmé par la famille. Il n'y a **pas** de ligne Rugdal au petit-déjeuner.

La famille vérifiera la liste contre l'ordonnance et les boîtes. Ne rien ajouter ni suggérer de changement.

## Hors périmètre pour l'instant

Rappels push, e-mail ou SMS ; suivi des stocks ; tension artérielle ; plusieurs patients. Les points d'accroche sont prévus dans le plan (`server/src/reminders` pour les rappels, un module de stock lié à `Medication`).
