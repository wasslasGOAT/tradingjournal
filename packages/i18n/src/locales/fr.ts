/** Ressources FR — namespace `common`. Toute clé ajoutée ici doit exister aussi dans `en.ts` (ADR-013). */
export const fr = {
  common: {
    hello: {
      title: 'Bonjour depuis {{appName}}',
      subtitle: 'Ton journal de trading, sur web, iOS et Android.',
      schemaVersion: 'Version du schéma : {{version}}',
      loading: 'Chargement…',
      retry: 'Réessayer',
      empty: {
        title: 'Aucune donnée',
        description:
          "La table de référence de l'application ne contient pas encore de version de schéma.",
      },
      error: {
        title: 'Une erreur est survenue',
        description:
          'Impossible de charger les informations de l’application. Vérifie ta connexion puis réessaie.',
      },
      configError: {
        title: 'Configuration manquante',
        description:
          "Les variables d'environnement Supabase ne sont pas renseignées. Copie apps/app/.env.example vers .env et renseigne l'URL et la clé anon de ton projet Supabase, puis relance l'app.",
      },
      invalidEnv: {
        title: 'Configuration invalide',
        url: "L'URL Supabase configurée n'est pas valide. Vérifie EXPO_PUBLIC_SUPABASE_URL dans apps/app/.env (https:// requis, sauf sur localhost).",
        secretKey:
          "Clé secrète interdite dans l'app. Renseigne la clé publique (anon/publishable) dans EXPO_PUBLIC_SUPABASE_ANON_KEY, jamais une clé sb_secret_.",
      },
      refreshError: {
        description:
          'Dernière actualisation impossible. Les données affichées peuvent être obsolètes.',
        retrying: 'Nouvelle tentative…',
      },
    },
    notFound: {
      title: 'Page introuvable',
      description: "Cet écran n'existe pas.",
      backHome: "Retour à l'accueil",
    },
  },
} as const;
