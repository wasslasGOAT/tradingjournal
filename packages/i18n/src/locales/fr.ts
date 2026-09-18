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
      catalogButton: 'Voir le catalogue',
    },
    notFound: {
      title: 'Page introuvable',
      description: "Cet écran n'existe pas.",
      backHome: "Retour à l'accueil",
    },
    // Catalogue de composants (M1-3, `apps/app/features/catalog`) : accessible en
    // développement uniquement — voir `apps/app/app/(dev)/catalog.tsx`.
    catalog: {
      title: 'Catalogue de composants',
      subtitle:
        'Aperçu des primitives du design system, avec des données factices — pour vérification visuelle uniquement.',
      back: 'Retour',
      controls: {
        theme: { label: 'Thème', dark: 'Sombre', light: 'Clair' },
        pnlColors: { label: 'Couleurs P&L', blueGray: 'Bleu / gris', greenRed: 'Vert / rouge' },
        hideAmounts: { label: 'Masquer les montants' },
        language: { label: 'Langue' },
      },
      sections: {
        statTiles: 'StatTile',
        buttons: 'Button',
        loaders: 'Chargement',
        emptyState: 'État vide',
        calendar: 'DayCell',
        cards: 'Card / GlowCard',
      },
      statTiles: {
        netPnl: 'P&L net',
        loss: 'Perte du jour',
        winRate: 'Taux de réussite',
        trades: 'Nombre de trades',
      },
      buttons: {
        primary: 'Primaire',
        secondary: 'Secondaire',
        ghost: 'Fantôme',
        danger: 'Danger',
        loading: 'Chargement…',
        disabled: 'Désactivé',
      },
      emptyState: {
        title: 'Aucun trade',
        description: 'Importe ou ajoute ton premier trade pour voir tes statistiques ici.',
        action: 'Ajouter un trade',
      },
      dayCell: {
        profit: 'Jour gagnant',
        loss: 'Jour perdant',
        journalOnly: 'Journal seul',
        today: "Aujourd'hui",
        empty: 'Vide',
      },
      progress: {
        label: "Progression de l'objectif mensuel",
      },
      cards: {
        cardTitle: 'Card',
        cardBody: 'Contenu neutre, ombre discrète.',
        glowCardTitle: 'GlowCard',
        glowCardBody: 'Mise en avant, lueur teintée accent.',
      },
    },
  },
} as const;
