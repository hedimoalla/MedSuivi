// Charge le .env de la racine s'il existe (développement), puis lance la commande.
// Sur Render il n'y a pas de fichier : les variables viennent du tableau de bord.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
