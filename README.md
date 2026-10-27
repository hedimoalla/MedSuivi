# MedSuivi

Checklist partagée de prise de médicaments pour la famille. Chaque jour, les prises sont regroupées par créneau (petit-déjeuner, déjeuner, dîner, coucher, hors repas). Chacun peut cocher une prise, et tout le monde voit le même état.

> **Outil de suivi et de rappel, pas un avis médical.** La liste doit toujours suivre l'ordonnance du médecin. L'application ne suggère jamais de doses ni d'interactions.

## État d'avancement

| Phase | Contenu                                                                                  | État    |
| ----- | ---------------------------------------------------------------------------------------- | ------- |
| a     | Structure, base de données, connexion Google, allowlist, sessions, tests d'auth          | ✅      |
| b     | Gestion des médicaments, horaires datés, journal des modifications, seed de l'ordonnance | à venir |
| c     | Checklist du jour et enregistrement des prises                                           | à venir |
| d     | Historique et vue imprimable                                                             | à venir |
| e     | PWA, déploiement Render, `render.yaml`                                                   | à venir |

## Prérequis

- Node.js 20.18 ou plus (`.nvmrc` fixe la version 20.18.0)
- Une base PostgreSQL. En développement, c'est un projet **Supabase** (gratuit). Le plan gratuit met le projet en pause après une semaine sans activité.
- Un projet Google Cloud avec un client OAuth (voir ci-dessous)

## Installation locale

```bash
git clone https://github.com/hedimoalla/MedSuivi.git
cd MedSuivi
npm install
cp .env.example .env     # puis remplir les valeurs (voir ci-dessous)
npm run db:migrate       # applique les migrations à la base
npm run build            # construit l'interface web dans web/dist
npm run dev              # lance l'API et la reconstruction de l'interface
```

Ouvrez ensuite http://localhost:3000. Le serveur sert l'interface construite, donc pas besoin d'un second serveur. Après une modification de l'interface, rechargez la page : `npm run dev` la reconstruit en continu.

## Variables d'environnement

Toutes les variables sont listées dans `.env.example`. Le fichier `.env` n'est jamais committé.

| Variable               | Rôle                                                                                                                                                   | Exemple (local)                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Connexion PostgreSQL. Supabase : **Connect → Direct → Session pooler**, mot de passe à la place de `[YOUR-PASSWORD]`, puis `?sslmode=require` à la fin | `postgresql://postgres.<ref>:<mot-de-passe>@aws-1-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DATABASE_CA_PATH`     | Chemin du certificat racine Supabase, pour vérifier la connexion TLS (voir ci-dessous)                                                                 | `/Users/vous/.config/medsuivi/prod-ca-2021.crt`                                                                |
| `SESSION_SECRET`       | Clé de signature des cookies, 32 caractères au minimum                                                                                                 | `openssl rand -base64 48`                                                                                      |
| `GOOGLE_CLIENT_ID`     | ID du client OAuth Google                                                                                                                              | `…apps.googleusercontent.com`                                                                                  |
| `GOOGLE_CLIENT_SECRET` | Code secret du client OAuth                                                                                                                            |                                                                                                                |
| `APP_BASE_URL`         | Adresse publique de l'app, sans `/` final                                                                                                              | `http://localhost:3000` en local                                                                               |
| `ALLOWED_EMAILS`       | Adresses Google autorisées, séparées par des virgules                                                                                                  | `moi@gmail.com,frere@gmail.com,mere@gmail.com`                                                                 |
| `NODE_ENV`             | `development`, `test` ou `production`                                                                                                                  | `development`                                                                                                  |
| `DEV_AUTH_BYPASS`      | `true` = connexion locale sans Google. **Refusé** si `NODE_ENV` n'est pas `development`                                                                | `false`                                                                                                        |
| `PORT`                 | Port d'écoute                                                                                                                                          | `3000`                                                                                                         |
| `TZ`                   | Fuseau du serveur. Les dates « aujourd'hui » sont toujours calculées en `Africa/Tunis`                                                                 | `Africa/Tunis`                                                                                                 |

### Certificat Supabase

Sur certains Mac, un antivirus ou un proxy réécrit le certificat TLS de Supabase, et la connexion est refusée (« self-signed certificate in certificate chain »). Pour garder la vérification complète :

1. Dans Supabase, **Project Settings → Database → SSL Configuration**, téléchargez le certificat racine.
2. Enregistrez-le hors du dépôt, par exemple `~/.config/medsuivi/prod-ca-2021.crt`.
3. Renseignez `DATABASE_CA_PATH` avec ce chemin.

## Migrations

Les migrations sont committées dans `server/prisma/migrations`.

```bash
npm run db:migrate
```

Cette commande applique les migrations en attente (`prisma migrate deploy`). Ne pas utiliser `prisma migrate dev` sur la base de production : elle peut proposer de réinitialiser les données.

Pour créer une nouvelle migration après avoir modifié `server/prisma/schema.prisma`, lancez `npx prisma migrate dev --name <nom>` depuis `server/`, sur la base de développement uniquement.

## Seed de l'ordonnance et synchronisation de l'allowlist

_À venir (phase b)._ Le seed chargera l'ordonnance du Dr Mehdi Kerkeni, séparément des migrations, et ne sera jamais lancé automatiquement en production. La synchronisation de `ALLOWED_EMAILS` vers la table `users` sera une commande dédiée. Les deux sont décrites ici à leur sortie.

## Tests et qualité

```bash
npm test          # tests du serveur (auth, politique de connexion, config)
npm run typecheck # vérification TypeScript de tous les espaces de travail
npm run lint      # ESLint
npm run format    # Prettier
```

Les tests n'appellent jamais Google : la réponse de Google est simulée. Ils n'ont pas besoin de base de données.

## Configurer Google Cloud Console

1. Allez sur https://console.cloud.google.com et créez un projet, par exemple « MedSuivi ».
2. **Google Auth Platform → Branding** (ou « Écran de consentement OAuth ») : type d'utilisateur **Externe**, nom de l'app, e-mail d'assistance et e-mail du développeur.
3. **Audience** : ajoutez les trois adresses comme utilisateurs test, ou passez l'app **« En production »**. Avec les scopes ci-dessous, le passage en production ne demande pas de validation Google. L'allowlist de l'application reste la vraie barrière.
4. **Data Access** : ajoutez uniquement `openid`, `.../auth/userinfo.email` et `.../auth/userinfo.profile`.
5. **Clients → Créer un client → Type « Application Web »**.
6. **Origines JavaScript autorisées** : laisser vide.
7. **URI de redirection autorisés** :
   - `http://localhost:3000/auth/google/callback`
   - `https://<votre-service>.onrender.com/auth/google/callback` (à ajouter après le premier déploiement sur Render)
8. Copiez l'**ID client** dans `GOOGLE_CLIENT_ID` et le **code secret** dans `GOOGLE_CLIENT_SECRET`.

**Domaine personnalisé** : si vous ajoutez un domaine plus tard, ajoutez `https://<votre-domaine>/auth/google/callback` aux URI de redirection, et mettez `APP_BASE_URL` à `https://<votre-domaine>`. Les deux doivent correspondre exactement, sinon Google refuse la connexion.

## Sauvegarde de la base

Supabase fait des sauvegardes automatiques sur les offres payantes. Pour une copie locale, utilisez `pg_dump` avec l'URL Session pooler :

```bash
pg_dump "$DATABASE_URL" --no-owner --format=custom --file=medsuivi-$(date +%F).dump
```

Conservez ces fichiers hors du dépôt, car ils contiennent des données de santé. Pour restaurer :

```bash
pg_restore --clean --no-owner --dbname="$DATABASE_URL" medsuivi-AAAA-MM-JJ.dump
```

Testez la restauration sur une base de test avant d'en avoir besoin.

## Sécurité

- Seules les adresses de `ALLOWED_EMAILS` peuvent ouvrir une session. Une adresse retirée de la liste est déconnectée à sa prochaine requête.
- Aucun mot de passe n'est stocké. La connexion passe uniquement par Google (flux de code d'autorisation, côté serveur).
- Les cookies sont `httpOnly`, `SameSite=Lax`, et `secure` en production. Ils durent 30 jours et se renouvellent à chaque visite.
- Les journaux ne contiennent ni médicaments ni adresses e-mail.
- Ne committez jamais `.env`, un certificat ou une sauvegarde de base.

## Structure du dépôt

```
shared/   constantes partagées (créneaux, relations aux repas)
server/   API Express, Prisma, authentification, tests
web/      interface React (Vite, Tailwind)
```

Les conventions du projet sont décrites dans [CLAUDE.md](CLAUDE.md).
