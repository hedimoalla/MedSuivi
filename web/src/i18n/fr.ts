// Toutes les chaînes de l'interface. Ajouter une langue = dupliquer ce fichier.
export const fr = {
  app: {
    name: 'MedSuivi',
    disclaimer:
      "Outil de suivi et de rappel, pas un avis médical. La liste doit toujours suivre l'ordonnance du médecin.",
  },
  nav: {
    today: "Aujourd'hui",
    history: 'Historique',
    medications: 'Médicaments',
    print: 'Imprimer',
    logout: 'Se déconnecter',
  },
  today: {
    greeting: (name: string) => `Bonjour ${name}`,
    placeholder: 'La checklist du jour arrive à la prochaine étape.',
  },
  errors: {
    generic: 'Une erreur est survenue. Réessayez.',
  },
} as const;
