# MedSuivi

Checklist partagée de prise de médicaments pour la famille. Chaque jour, les prises sont regroupées par créneau (petit-déjeuner, déjeuner, dîner, coucher, hors repas). Chacun peut cocher une prise, et tout le monde voit le même état.

> **Outil de suivi et de rappel, pas un avis médical.** La liste doit toujours suivre l'ordonnance du médecin. L'application ne suggère jamais de doses ni d'interactions.

## État d'avancement

| Phase | Contenu                                                                                  | État |
| ----- | ---------------------------------------------------------------------------------------- | ---- |
| a     | Structure, base de données, connexion Google, allowlist, sessions, tests d'auth          | ✅   |
| b     | Gestion des médicaments, horaires datés, journal des modifications, seed de l'ordonnance | ✅   |
| c     | Checklist du jour et enregistrement des prises (cases à cocher, doses au besoin)         | ✅   |
| d     | Historique (calendrier) et rapport imprimable pour le cardiologue                        | ✅   |
| e     | Déploiement Render (`render.yaml`, base Supabase) et PWA installable                     | ✅   |

## Fonctionnalités

- **Écran Aujourd'hui** : les prises sont regroupées par moment (🍳 petit-déjeuner, 🥗 déjeuner, 🍲 dîner, 🛏️ avant le coucher, ⏰ hors repas). Chaque prise a une case à cocher ; l'app affiche qui a coché et à quelle heure. Les flèches ← → permettent de revoir ou de corriger un jour passé. Un moment est marqué ✅ terminé ou ⚠️ en retard selon son heure indicative. La page se rafraîchit toutes les 20 secondes, pour que toute la famille voie le même état.
- **Doses au besoin** : une dose hors planning peut être ajoutée avec une remarque facultative.
- **Médicaments** : réservés à l'administrateur (voir `ADMIN_EMAILS`). Création, modification à partir d'une date d'effet, archivage et restauration. Une modification ne change jamais les jours passés, et rien n'est supprimé physiquement.
- **Journal des modifications** : qui a changé quoi, et quand. Accessible depuis la page Médicaments.
- **Historique** : calendrier mensuel. Chaque jour est coloré selon ✅ tout pris, 🟡 en partie, ❌ rien de pris, ⏳ en cours. Toucher un jour l'ouvre dans l'écran Aujourd'hui.
- **Rapport** (🖨️) : médicaments en cours, observance sur les 30 derniers jours par médicament, doses au besoin. Imprimable ou enregistrable en PDF depuis le navigateur.
- **Installation sur téléphone** : l'app s'installe sur l'écran d'accueil (Android : bouton « Installer » ou menu du navigateur ; iPhone : Partager → « Sur l'écran d'accueil »). Elle s'ouvre alors en plein écran, avec l'icône 💊. Seuls les fichiers de l'interface sont mis en cache ; les données de santé ne sont jamais stockées sur l'appareil.
- **Alertes** : chaque membre peut activer les alertes sur son téléphone. Si une prise d'un repas (petit-déjeuner, déjeuner, dîner) n'est pas cochée une heure après l'heure indicative, tous les membres ayant activé les alertes reçoivent une notification. Une seule alerte par repas et par jour. Le message ne mentionne aucun médicament.
- **Thème** : mode clair par défaut, mode sombre activable avec le bouton 🌙 / ☀️. Le choix est mémorisé sur l'appareil.

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
| `ADMIN_EMAILS`         | Administrateur(s) : seuls eux peuvent ajouter, modifier ou archiver un médicament. Doit être inclus dans `ALLOWED_EMAILS`                              | `moi@gmail.com`                                                                                                |
| `NODE_ENV`             | `development`, `test` ou `production`                                                                                                                  | `development`                                                                                                  |
| `DEV_AUTH_BYPASS`      | `true` = connexion locale sans Google. **Refusé** si `NODE_ENV` n'est pas `development`                                                                | `false`                                                                                                        |
| `ALERTS_ENABLED`       | Active les alertes « prise non enregistrée ». Exige les trois clés VAPID                                                                               | `false`                                                                                                        |
| `VAPID_PUBLIC_KEY`     | Clé publique Web Push, générée une fois avec `npx web-push generate-vapid-keys`                                                                        | (voir ci-dessous)                                                                                              |
| `VAPID_PRIVATE_KEY`    | Clé privée Web Push (même commande). Ne jamais la committer                                                                                            |                                                                                                                |
| `VAPID_SUBJECT`        | Contact de l'application : `mailto:` suivi d'une adresse                                                                                               | `mailto:moi@gmail.com`                                                                                         |
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

Le seed charge l'ordonnance du Dr Mehdi Kerkeni (du 26/10/2026 au 26/01/2027). Il est séparé des migrations et n'est jamais lancé automatiquement.

```bash
npm run seed:prescription   # ajoute les médicaments absents ; les existants sont ignorés
npm run sync:allowlist      # crée les comptes des adresses de ALLOWED_EMAILS
```

- Le seed est idempotent : le relancer ne crée pas de doublons.
- Il refuse de tourner avec `NODE_ENV=production` sans l'option `--force`.
- Les modifications du seed sont attribuées au premier e-mail de `ALLOWED_EMAILS`.
- La synchronisation ne supprime rien : un compte retiré de `ALLOWED_EMAILS` est simplement refusé à sa prochaine connexion, et déconnecté à sa prochaine requête.
- La famille doit vérifier la liste à l'écran contre l'ordonnance et les boîtes.

## Tests et qualité

```bash
npm test          # 80 tests du serveur
npm run typecheck # vérification TypeScript de tous les espaces de travail
npm run lint      # ESLint
npm run format    # Prettier
```

Les tests couvrent : la connexion Google et l'allowlist, les horaires datés (le passé reste figé), la checklist du jour (créneaux, jours de la semaine, dates de début et de fin, prises « hors repas »), l'observance, la validation des saisies et les droits de l'administrateur. Les tests n'appellent jamais Google et n'ont pas besoin de base de données : les réponses de Google sont simulées.

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

## Déploiement sur Render

Adresse de production : https://medsuivi.onrender.com

Le fichier `render.yaml` décrit le service web. La base reste sur Supabase : Render n'en crée pas.

**1. Créer le service**

1. Sur https://dashboard.render.com : **New → Blueprint**, puis choisissez le dépôt `hedimoalla/MedSuivi`.
2. Render lit `render.yaml` et propose le service `medsuivi` (région Francfort, plan Starter). Validez.

**2. Renseigner les variables** (**Environment** du service). Les valeurs ne sont jamais dans le dépôt.

| Variable               | Valeur                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`         | URL **Session pooler** de Supabase, avec le mot de passe et `?sslmode=require`     |
| `SESSION_SECRET`       | chaîne aléatoire de 32 caractères ou plus (`openssl rand -base64 48`)              |
| `GOOGLE_CLIENT_ID`     | ID du client OAuth                                                                 |
| `GOOGLE_CLIENT_SECRET` | code secret du client OAuth                                                        |
| `APP_BASE_URL`         | `https://medsuivi.onrender.com` (ou l'adresse affichée par Render, sans `/` final) |
| `ALLOWED_EMAILS`       | les trois adresses, en minuscules, séparées par des virgules                       |
| `ADMIN_EMAILS`         | l'administrateur, inclus dans `ALLOWED_EMAILS`                                     |
| `ALERTS_ENABLED`       | `true` (déjà fixé par le blueprint). Ne jamais activer en local                    |
| `VAPID_PUBLIC_KEY`     | clé publique Web Push (voir ci-dessous)                                            |
| `VAPID_PRIVATE_KEY`    | clé privée Web Push. Ne jamais la committer                                        |
| `VAPID_SUBJECT`        | contact de l'application, `mailto:` suivi d'une adresse                            |

`NODE_ENV=production` et `DEV_AUTH_BYPASS=false` sont déjà fixés par le blueprint. L'application refuse de démarrer si `DEV_AUTH_BYPASS` est activé hors développement.

**3. Ajouter le certificat Supabase** (**Environment → Secret Files → Add Secret File**) :

- **Filename** : `supabase-ca.crt` (le chemin `/etc/secrets/supabase-ca.crt` est déjà configuré)
- **Contents** : le contenu du fichier `prod-ca-2021.crt`, de `-----BEGIN CERTIFICATE-----` à `-----END CERTIFICATE-----`

Ce certificat permet de vérifier la connexion TLS à Supabase. Ne le committez jamais.

**4. Autoriser l'adresse Render dans Google Cloud**. Dans le client OAuth, ajoutez aux **URI de redirection autorisés** :
`https://medsuivi.onrender.com/auth/google/callback` (remplacez par votre adresse exacte).

**5. Démarrer et vérifier**

- Le premier déploiement lance les migrations puis le serveur (`npm run db:migrate && npm start`).
- Vérifiez `https://<votre-adresse>/health` : la réponse doit être `{"status":"ok"}`.
- Ouvrez l'adresse dans un navigateur, connectez-vous avec Google.

**Points à connaître**

- **Plan Starter** (7 $/mois) : le service ne se met pas en veille, donc les alertes partent à l'heure. Le plan Free ferait dormir le service et retarderait les alertes.
- **Une seule base** : la production et le développement local utilisent la même base Supabase. Une prise cochée en local apparaît donc sur Render, et réciproquement. Pour séparer les deux, créez un second projet Supabase et utilisez son URL dans votre `.env` local.
- **Seed** : l'ordonnance est déjà chargée dans la base. Ne relancez pas `seed:prescription` en production.
- **Changer l'adresse** : si l'adresse `APP_BASE_URL` change, mettez à jour aussi les URI de redirection Google.

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
- En production, les journaux ne contiennent que le nom de l'erreur : ni médicaments, ni adresses e-mail. En développement, le message d'erreur complet est affiché pour faciliter la correction.
- Les modifications de médicaments et les prises cochées sont attribuées à la personne connectée.
- Ne committez jamais `.env`, un certificat ou une sauvegarde de base.

## Structure du dépôt

```
shared/   constantes partagées (créneaux, relations aux repas)
server/   API Express, Prisma, authentification, horaires, checklist, historique, tests
web/      interface React (Vite, Tailwind) : Aujourd'hui, Médicaments, Historique, Rapport
```

Les conventions du projet sont décrites dans [CLAUDE.md](CLAUDE.md).
