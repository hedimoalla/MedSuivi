import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requis'),
  DATABASE_CA_PATH: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET doit faire au moins 32 caractères'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APP_BASE_URL: z.string().url(),
  ALLOWED_EMAILS: z.string().default(''),
  ADMIN_EMAILS: z.string().default(''),
  DEV_AUTH_BYPASS: bool,
  // Alertes « prise non enregistrée ». Désactivées par défaut : la base est partagée avec le
  // développement local, qui ne doit pas envoyer d'alertes à la famille.
  ALERTS_ENABLED: bool,
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

export type AppConfig = ReturnType<typeof loadConfig>;

/**
 * Lit et valide la configuration. Échoue au démarrage si quelque chose manque ou est incohérent.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.parse(env);

  if (parsed.DEV_AUTH_BYPASS && parsed.NODE_ENV !== 'development') {
    throw new Error('DEV_AUTH_BYPASS ne peut être activé que lorsque NODE_ENV=development');
  }

  const googleRequired = parsed.NODE_ENV === 'production' && !parsed.DEV_AUTH_BYPASS;
  if (googleRequired && (!parsed.GOOGLE_CLIENT_ID || !parsed.GOOGLE_CLIENT_SECRET)) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis en production');
  }

  const allowedEmails = parsed.ALLOWED_EMAILS.split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

  if (allowedEmails.length === 0) {
    throw new Error('ALLOWED_EMAILS doit contenir au moins une adresse');
  }

  const adminEmails = parsed.ADMIN_EMAILS.split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
  for (const admin of adminEmails) {
    if (!allowedEmails.includes(admin)) {
      throw new Error(`ADMIN_EMAILS contient ${admin}, qui n'est pas dans ALLOWED_EMAILS`);
    }
  }

  // Clés VAPID : générées une fois avec « npx web-push generate-vapid-keys ».
  const vapidKeys = [parsed.VAPID_PUBLIC_KEY, parsed.VAPID_PRIVATE_KEY, parsed.VAPID_SUBJECT];
  const vapidComplete = vapidKeys.every((value) => value && value.length > 0);
  if (parsed.ALERTS_ENABLED && !vapidComplete) {
    throw new Error(
      'ALERTS_ENABLED=true exige VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY et VAPID_SUBJECT',
    );
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    alertsEnabled: parsed.ALERTS_ENABLED,
    /** Null tant que les clés ne sont pas renseignées : l'abonnement aux alertes est alors refusé. */
    vapid: vapidComplete
      ? {
          publicKey: parsed.VAPID_PUBLIC_KEY!,
          privateKey: parsed.VAPID_PRIVATE_KEY!,
          subject: parsed.VAPID_SUBJECT!,
        }
      : null,
    adminEmails: new Set(adminEmails),
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    databaseCaPath: parsed.DATABASE_CA_PATH || undefined,
    sessionSecret: parsed.SESSION_SECRET,
    googleClientId: parsed.GOOGLE_CLIENT_ID,
    googleClientSecret: parsed.GOOGLE_CLIENT_SECRET,
    appBaseUrl: parsed.APP_BASE_URL.replace(/\/$/, ''),
    allowedEmails: new Set(allowedEmails),
    devAuthBypass: parsed.DEV_AUTH_BYPASS,
    isProduction: parsed.NODE_ENV === 'production',
  };
}
