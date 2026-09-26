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
    // Bouton temporaire de bascule de thème (W-3, `apps/web`) : remplacé par
    // l'écran Réglages en M2 — réutilise les libellés de `settings.theme`.
    themeToggle: {
      cycleButton: 'Thème : {{theme}}',
      accessibilityLabel: 'Changer de thème (actuel : {{theme}})',
    },
    notFound: {
      title: 'Page introuvable',
      description: "Cet écran n'existe pas.",
      backHome: "Retour à l'accueil",
    },
    // Libellés génériques réutilisés par plusieurs primitives (M1-4, `packages/ui`) —
    // boutons de fermeture de `Sheet`/`Select`/`DateRangePicker`.
    close: 'Fermer',
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
        segmented: 'Segmented',
        select: 'Select',
        dateRangePicker: 'DateRangePicker',
        sheet: 'Sheet',
        toast: 'Toast',
        chartsLineArea: 'Chart — Ligne / Aire',
        chartsBar: 'Chart — Barres',
        chartsHistogram: 'Chart — Histogramme',
        chartsHeatmap: 'Chart — Heatmap',
        list: 'VirtualizedList',
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
      segmented: {
        label: 'Vue',
        amount: '$',
        percent: '%',
        rMultiple: 'R',
      },
      select: {
        label: 'Exemple de select',
        optionA: 'Option A',
        optionB: 'Option B',
        optionC: 'Option C',
      },
      dateRangePicker: {
        label: 'Exemple de période',
      },
      sheet: {
        trigger: 'Ouvrir la sheet',
        title: 'Exemple de sheet',
        body: 'Glisse vers le bas, touche à l’extérieur, ou appuie sur Échap (web) pour fermer.',
      },
      toast: {
        success: 'Succès',
        error: 'Erreur',
        info: 'Info',
        successMessage: 'Trade enregistré.',
        errorMessage: "Échec de l'enregistrement.",
        infoMessage: 'Synchronisation en cours…',
      },
      charts: {
        stateLoaded: 'Rempli',
        stateLoading: 'Chargement',
        stateEmpty: 'Vide',
        equityAccessibilityLabel: "Exemple de courbe d'equity",
        pnlByDayAccessibilityLabel: 'Exemple de P&L par jour de semaine',
        rDistributionAccessibilityLabel: 'Exemple de distribution des R multiples',
        heatmapAccessibilityLabel: 'Exemple de heatmap heure × jour de semaine',
        empty: {
          title: 'Aucune donnée',
          description: 'Ce graphique n’a rien à afficher pour le moment.',
        },
        legend: { low: 'Faible', high: 'Élevé' },
        weekday: {
          mon: 'Lun',
          tue: 'Mar',
          wed: 'Mer',
          thu: 'Jeu',
          fri: 'Ven',
          sat: 'Sam',
          sun: 'Dim',
        },
      },
      list: {
        sectionTitle: 'Trades factices (1 000)',
        empty: {
          title: 'Aucun trade',
          description: 'Les lignes factices apparaîtront ici.',
        },
        endOfList: 'Fin de la liste',
        direction: { long: 'Achat', short: 'Vente' },
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
      landmark: 'Navigation principale',
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
        today: "Aujourd'hui",
        last7Days: '7 derniers jours',
        currentMonth: 'Mois en cours',
        previousMonth: 'Mois précédent',
        custom: 'Personnalisé',
        apply: 'Appliquer',
        cancel: 'Annuler',
        previousMonthNav: 'Afficher le mois précédent',
        nextMonthNav: 'Afficher le mois suivant',
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
      // Jour effectivement retenu (revue W-10) : peut différer d'« aujourd'hui »
      // en mode « Tous les comptes » (dernier jour où au moins un compte a
      // tradé, voir `computeLastDayPnl`) — le libellé l'affiche pour lever
      // toute ambiguïté.
      pnlTodayWithDay: 'P&L · {{weekday}} {{day}}',
      pnlMonth: 'P&L du mois',
      returnRate: 'Rendement',
      shortcuts: {
        addTrade: 'Ajouter un trade',
        viewCalendar: 'Voir le calendrier',
        openJournal: 'Ouvrir le journal',
      },
      equity: {
        title: "Courbe d'equity",
        accessibilityLabel: "Courbe d'equity de la période sélectionnée",
        empty: {
          title: 'Aucune donnée',
          description: 'Ajoute des trades pour voir ta courbe d’equity ici.',
        },
        tooltipLabel: 'Solde',
      },
      loading: 'Chargement du dashboard…',
      error: {
        title: 'Impossible de charger le dashboard',
        description: 'Vérifie ta connexion puis réessaie.',
        retry: 'Réessayer',
      },
      empty: {
        title: 'Aucun trade sur cette période',
        description: 'Ajoute un trade ou change de période pour voir tes statistiques.',
        action: 'Ajouter un trade',
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
      monthNav: {
        previous: 'Mois précédent',
        next: 'Mois suivant',
      },
      loading: 'Chargement du calendrier…',
      error: {
        title: 'Impossible de charger le calendrier',
        description: 'Vérifie ta connexion puis réessaie.',
        retry: 'Réessayer',
      },
      empty: {
        title: 'Aucune donnée ce mois-ci',
        description:
          'Aucun trade ni entrée de journal pour ce mois — change de mois ou ajoute un trade.',
        action: 'Ajouter un trade',
      },
      detail: {
        titleWithJournal: '{{day}} · Journal',
        sheetTitle: '{{weekday}} {{day}} {{month}}',
        tradesTitle: 'Trades du jour',
        noTrades: 'Aucun trade ce jour-là.',
        journalNote: 'Une entrée de journal existe pour ce jour (aperçu à venir).',
        direction: { long: 'Achat', short: 'Vente' },
        tradeAccessibility: '{{symbol}}, {{pnl}}',
      },
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
    // Écran Réglages (M1-9) : bascules persistées entre deux lancements
    // (thème, couleurs P&L, masquage des montants, langue).
    settings: {
      title: 'Réglages',
      sections: {
        appearance: 'Apparence',
        language: 'Langue',
      },
      theme: {
        label: 'Thème',
        system: 'Système',
        dark: 'Sombre',
        light: 'Clair',
      },
      pnlColors: {
        label: 'Couleurs P&L',
        blueGray: 'Bleu / gris',
        greenRed: 'Vert / rouge',
      },
      hideAmounts: {
        label: 'Montants',
        visible: 'Visibles',
        hidden: 'Masqués',
      },
      language: {
        label: 'Langue de l’app',
        system: 'Système',
        fr: 'Français',
        en: 'English',
      },
    },
    comingSoon: {
      title: 'Bientôt disponible',
      description: 'Cet écran est en cours de construction.',
    },
    // Invite de mise à jour du service worker (W-7, PWA) : affichée via le
    // toast (`sonner`) déjà monté à la racine, jamais de rechargement forcé.
    pwa: {
      updateAvailable: {
        message: 'Une nouvelle version est disponible.',
        action: 'Mettre à jour',
      },
      offlineReady: {
        message: "L'app est prête à fonctionner hors connexion.",
      },
    },
  },
} as const;
