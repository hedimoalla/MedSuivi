import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import type { AppConfig } from './config';

export const SESSION_COOKIE_NAME = 'medsuivi.sid';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function createSessionStore(config: AppConfig): session.Store {
  const PgStore = connectPgSimple(session);
  // Le paramètre sslmode de l'URL remplace l'option ssl ; on le retire et on fixe le TLS ici.
  // La vérification du certificat reste active : le certificat racine Supabase est fourni
  // explicitement via DATABASE_CA_PATH.
  const url = new URL(config.databaseUrl);
  url.searchParams.delete('sslmode');
  const ssl = config.databaseCaPath
    ? { ca: readFileSync(config.databaseCaPath, 'utf8'), rejectUnauthorized: true }
    : { rejectUnauthorized: true };
  const pool = new pg.Pool({ connectionString: url.toString(), ssl });
  return new PgStore({ pool, tableName: 'session', createTableIfMissing: false });
}

export function createSessionMiddleware(config: AppConfig, store?: session.Store) {
  return session({
    name: SESSION_COOKIE_NAME,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    // Glissante : chaque requête prolonge la session de 30 jours.
    rolling: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: THIRTY_DAYS_MS,
    },
  });
}
