/**
 * Charge l'ordonnance initiale (Dr Mehdi Kerkeni, 2026-10-26 au 2027-01-26).
 *
 * Commande : npm run seed:prescription
 * Exécution sûre : les médicaments déjà présents (même nom) sont ignorés.
 * En production, la commande refuse de tourner sans --force.
 *
 * Ce script n'est jamais lancé automatiquement. La famille vérifie la liste à la main
 * dans l'application après le chargement.
 */
import { PrismaClient, type MealRelation, type Slot } from '@prisma/client';
import { loadConfig } from '../src/config';
import { createPrismaUserStore } from '../src/auth/userStore';

const START = new Date('2026-10-26T00:00:00Z');
const END = new Date('2027-01-26T00:00:00Z');
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

interface SeedMedication {
  name: string;
  slot: Slot;
  mealRelation: MealRelation;
  dose: string;
  notes?: string;
}

// Liste reprise de l'ordonnance. Ne rien ajouter ni suggérer de changement.
const PRESCRIPTION: SeedMedication[] = [
  { name: 'Atrovast 80 mg', slot: 'DINNER', mealRelation: 'NONE', dose: '1 comprimé' },
  { name: 'Pidogrel 75 mg', slot: 'BREAKFAST', mealRelation: 'NONE', dose: '1 comprimé' },
  {
    name: 'Cardiocine 100 mg',
    slot: 'LUNCH',
    mealRelation: 'NONE',
    dose: '1 comprimé',
    notes:
      'Aspégic est une alternative possible prescrite par le médecin, pas un médicament en plus.',
  },
  { name: 'Cincor 25 mg', slot: 'BREAKFAST', mealRelation: 'NONE', dose: '1 comprimé' },
  { name: 'Aldactone 50 mg', slot: 'BREAKFAST', mealRelation: 'NONE', dose: '1/2 comprimé' },
  { name: 'Lasilix 40 mg', slot: 'BREAKFAST', mealRelation: 'NONE', dose: '1 comprimé' },
  // Rugdal est le pansement gastrique du coucher (confirmé par la famille).
  { name: 'Rugdal 40 mg', slot: 'BEDTIME', mealRelation: 'NONE', dose: '1 comprimé' },
  { name: 'Albifer 120 mg', slot: 'OUTSIDE_MEALS', mealRelation: 'AWAY', dose: '1 comprimé' },
];

async function main() {
  const config = loadConfig();
  const force = process.argv.includes('--force');
  if (config.isProduction && !force) {
    console.error('Refus : seed lancé en production sans --force.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    // Les modifications du seed sont attribuées au premier e-mail autorisé.
    const users = createPrismaUserStore(prisma);
    const [firstEmail] = [...config.allowedEmails];
    if (!firstEmail) throw new Error('ALLOWED_EMAILS est vide');
    await users.ensureAllowlisted([firstEmail]);
    const actor = await users.findByEmail(firstEmail);
    if (!actor) throw new Error("Impossible de retrouver l'utilisateur de référence");

    let created = 0;
    for (const item of PRESCRIPTION) {
      const exists = await prisma.medication.findFirst({ where: { name: item.name } });
      if (exists) {
        console.log(`• ${item.name} : déjà présent, ignoré`);
        continue;
      }
      await prisma.$transaction(async (tx) => {
        const medication = await tx.medication.create({
          data: {
            name: item.name,
            schedules: {
              create: {
                slot: item.slot,
                mealRelation: item.mealRelation,
                dose: item.dose,
                notes: item.notes ?? null,
                daysOfWeek: ALL_DAYS,
                startDate: START,
                endDate: END,
              },
            },
          },
          include: { schedules: true },
        });
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            action: 'medication.create',
            entityType: 'medication',
            entityId: medication.id,
            after: { name: item.name, source: 'seed:prescription' },
          },
        });
      });
      created += 1;
      console.log(`• ${item.name} : ajouté`);
    }
    console.log(`Terminé : ${created} médicament(s) ajouté(s) sur ${PRESCRIPTION.length}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
