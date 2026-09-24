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
        theme: { label: 'Thème', dark: 'Sombre', light: 'Clair', system: 'Système' },
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
    // Coquille applicative (M1-8, ARCHITECTURE §6.1) : tab bar mobile / sidebar
    // web, header (compte, période, masquage), bouton d'ajout rapide.
    nav: {
      dashboard: 'Dashboard',
      calendar: 'Calendrier',
      trades: 'Trades',
      journal: 'Journal',
      more: 'Plus',
      analytics: 'Analytics',
      rules: 'Règles',
      settings: 'Réglages',
    },
    header: {
      accounts: {
        triggerAccessibility: 'Changer de compte',
        all: 'Tous les comptes',
        sample: {
          main: 'Compte principal',
          prop: 'Compte prop 50K',
        },
      },
      period: {
        triggerAccessibility: 'Changer de période',
        day: 'Jour',
        week: 'Semaine',
        month: 'Mois',
        year: 'Année',
      },
      hideAmounts: {
        show: 'Afficher les montants',
        hide: 'Masquer les montants',
      },
      quickAdd: {
        accessibilityLabel: 'Ajouter un trade',
        comingSoon: "L'ajout de trade sera bientôt disponible.",
      },
    },
    dashboard: {
      balance: 'Solde du compte',
      pnlToday: 'P&L du jour',
      pnlMonth: 'P&L du mois',
      returnRate: 'Rendement',
      shortcuts: {
        addTrade: 'Ajouter un trade',
        viewCalendar: 'Voir le calendrier',
        openJournal: 'Ouvrir le journal',
      },
      equity: {
        title: "Courbe d'equity",
        placeholder: 'Graphique bientôt disponible.',
      },
    },
    calendar: {
      title: 'Calendrier',
      weekTotal: 'Total',
      monthStats: {
        netPnl: 'P&L net',
        winningDays: 'Jours gagnants',
        losingDays: 'Jours perdants',
        tradesCount: 'Trades',
      },
      dayState: {
        profit: 'Jour gagnant',
        loss: 'Jour perdant',
        flat: 'Jour neutre',
        journalOnly: 'Journal uniquement',
        today: "Aujourd'hui",
        empty: 'Aucun trade',
      },
      dayAccessibility: '{{day}}, {{state}}',
    },
    trades: {
      empty: {
        title: 'Aucun trade enregistré',
        description: 'Ajoute ton premier trade pour commencer à suivre tes performances.',
        action: 'Ajouter un trade',
      },
    },
    journal: {
      empty: {
        title: 'Aucune entrée de journal',
        description: 'Écris ta première entrée pour suivre ta discipline et ton état d’esprit.',
        action: 'Écrire une entrée',
      },
    },
    more: {
      sections: {
        analytics: { label: 'Analytics', description: 'Rapports et statistiques détaillées.' },
        rules: { label: 'Règles', description: 'Règles perso et checklists.' },
        settings: { label: 'Réglages', description: 'Préférences, compte, thème.' },
        catalog: {
          label: 'Catalogue de composants',
          description: 'Aperçu du design system — développement uniquement.',
        },
      },
    },
    comingSoon: {
      title: 'Bientôt disponible',
      description: 'Cet écran est en cours de construction.',
    },
  },
} as const;
