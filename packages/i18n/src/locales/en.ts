/** EN resources — `common` namespace. Any key added here must also exist in `fr.ts` (ADR-013). */
export const en = {
  common: {
    hello: {
      title: 'Hello from {{appName}}',
      subtitle: 'Your trading journal, on web, iOS and Android.',
      schemaVersion: 'Schema version: {{version}}',
      loading: 'Loading…',
      retry: 'Retry',
      empty: {
        title: 'No data yet',
        description: "The app's reference table doesn't have a schema version yet.",
      },
      error: {
        title: 'Something went wrong',
        description: "Couldn't load the app's information. Check your connection, then retry.",
      },
      configError: {
        title: 'Missing configuration',
        description:
          'The Supabase environment variables are not set. Copy apps/app/.env.example to .env and fill in your Supabase project URL and anon key, then restart the app.',
      },
      invalidEnv: {
        title: 'Invalid configuration',
        url: 'The configured Supabase URL is not valid. Check EXPO_PUBLIC_SUPABASE_URL in apps/app/.env (https:// required, except on localhost).',
        secretKey:
          'Secret key not allowed in the app. Set the public (anon/publishable) key in EXPO_PUBLIC_SUPABASE_ANON_KEY, never an sb_secret_ key.',
      },
      refreshError: {
        description: 'Last refresh failed. The data shown may be out of date.',
        retrying: 'Retrying…',
      },
      catalogButton: 'View catalog',
    },
    // Temporary theme toggle button (W-3, `apps/web`) : replaced by the
    // Settings screen in M2 — reuses `settings.theme` labels.
    themeToggle: {
      cycleButton: 'Theme: {{theme}}',
      accessibilityLabel: 'Change theme (current: {{theme}})',
    },
    notFound: {
      title: 'Page not found',
      description: "This screen doesn't exist.",
      backHome: 'Back to home',
    },
    // Generic labels reused across primitives (M1-4, `packages/ui`) — `Sheet`/`Select`/
    // `DateRangePicker` close buttons.
    close: 'Close',
    // Component catalog (M1-3, `apps/app/features/catalog`) : development-only —
    // see `apps/app/app/(dev)/catalog.tsx`.
    catalog: {
      title: 'Component catalog',
      subtitle:
        'Preview of the design system primitives, with sample data — for visual review only.',
      back: 'Back',
      controls: {
        theme: { label: 'Theme', dark: 'Dark', light: 'Light', system: 'System' },
        pnlColors: { label: 'P&L colors', blueGray: 'Blue / gray', greenRed: 'Green / red' },
        hideAmounts: { label: 'Hide amounts' },
        language: { label: 'Language' },
      },
      sections: {
        statTiles: 'StatTile',
        buttons: 'Button',
        loaders: 'Loading',
        emptyState: 'Empty state',
        calendar: 'DayCell',
        cards: 'Card / GlowCard',
        segmented: 'Segmented',
        select: 'Select',
        dateRangePicker: 'DateRangePicker',
        sheet: 'Sheet',
        toast: 'Toast',
        chartsLineArea: 'Chart — Line / Area',
        chartsBar: 'Chart — Bar',
        chartsHistogram: 'Chart — Histogram',
        chartsHeatmap: 'Chart — Heatmap',
        list: 'VirtualizedList',
      },
      statTiles: {
        netPnl: 'Net P&L',
        loss: "Today's loss",
        winRate: 'Win rate',
        trades: 'Number of trades',
      },
      buttons: {
        primary: 'Primary',
        secondary: 'Secondary',
        ghost: 'Ghost',
        danger: 'Danger',
        loading: 'Loading…',
        disabled: 'Disabled',
      },
      emptyState: {
        title: 'No trades yet',
        description: 'Import or add your first trade to see your stats here.',
        action: 'Add a trade',
      },
      dayCell: {
        profit: 'Winning day',
        loss: 'Losing day',
        journalOnly: 'Journal only',
        today: 'Today',
        empty: 'Empty',
      },
      progress: {
        label: 'Monthly goal progress',
      },
      cards: {
        cardTitle: 'Card',
        cardBody: 'Neutral content, subtle shadow.',
        glowCardTitle: 'GlowCard',
        glowCardBody: 'Highlighted, accent-tinted glow.',
      },
      segmented: {
        label: 'View',
        amount: '$',
        percent: '%',
        rMultiple: 'R',
      },
      select: {
        label: 'Example select',
        optionA: 'Option A',
        optionB: 'Option B',
        optionC: 'Option C',
      },
      dateRangePicker: {
        label: 'Example period',
      },
      sheet: {
        trigger: 'Open sheet',
        title: 'Sheet example',
        body: 'Slide down, tap outside, or press Escape (web) to close.',
      },
      toast: {
        success: 'Success',
        error: 'Error',
        info: 'Info',
        successMessage: 'Trade saved.',
        errorMessage: 'Failed to save.',
        infoMessage: 'Syncing…',
      },
      charts: {
        stateLoaded: 'Loaded',
        stateLoading: 'Loading',
        stateEmpty: 'Empty',
        equityAccessibilityLabel: 'Equity curve example',
        pnlByDayAccessibilityLabel: 'P&L by weekday example',
        rDistributionAccessibilityLabel: 'R multiple distribution example',
        heatmapAccessibilityLabel: 'Hour by weekday heatmap example',
        empty: {
          title: 'No data',
          description: 'This chart has nothing to show yet.',
        },
        legend: { low: 'Low', high: 'High' },
        weekday: {
          mon: 'Mon',
          tue: 'Tue',
          wed: 'Wed',
          thu: 'Thu',
          fri: 'Fri',
          sat: 'Sat',
          sun: 'Sun',
        },
      },
      list: {
        sectionTitle: 'Sample trades (1,000)',
        empty: {
          title: 'No trades',
          description: 'Sample rows will appear here.',
        },
        endOfList: 'End of list',
        direction: { long: 'Long', short: 'Short' },
      },
    },
    // App shell (M1-8, ARCHITECTURE §6.1): mobile tab bar / web sidebar, header
    // (account, period, hide amounts), global quick-add button.
    nav: {
      dashboard: 'Dashboard',
      calendar: 'Calendar',
      trades: 'Trades',
      journal: 'Journal',
      more: 'More',
      analytics: 'Analytics',
      rules: 'Rules',
      settings: 'Settings',
      landmark: 'Primary navigation',
    },
    header: {
      accounts: {
        triggerAccessibility: 'Switch account',
        all: 'All accounts',
        sample: {
          main: 'Main account',
          prop: 'Prop 50K account',
        },
      },
      period: {
        triggerAccessibility: 'Switch period',
        today: 'Today',
        last7Days: 'Last 7 days',
        currentMonth: 'Current month',
        previousMonth: 'Previous month',
        custom: 'Custom',
        apply: 'Apply',
        cancel: 'Cancel',
        previousMonthNav: 'Show previous month',
        nextMonthNav: 'Show next month',
      },
      hideAmounts: {
        show: 'Show amounts',
        hide: 'Hide amounts',
      },
      quickAdd: {
        accessibilityLabel: 'Add a trade',
        comingSoon: 'Adding a trade will be available soon.',
      },
    },
    dashboard: {
      balance: 'Account balance',
      pnlToday: "Today's P&L",
      pnlMonth: "This month's P&L",
      returnRate: 'Return',
      shortcuts: {
        addTrade: 'Add a trade',
        viewCalendar: 'View calendar',
        openJournal: 'Open journal',
      },
      equity: {
        title: 'Equity curve',
        accessibilityLabel: 'Equity curve for the selected period',
        empty: {
          title: 'No data yet',
          description: 'Add trades to see your equity curve here.',
        },
        tooltipLabel: 'Balance',
      },
      loading: 'Loading dashboard…',
      error: {
        title: 'Could not load the dashboard',
        description: 'Check your connection and try again.',
        retry: 'Retry',
      },
      empty: {
        title: 'No trades for this period',
        description: 'Add a trade or change the period to see your stats.',
        action: 'Add a trade',
      },
    },
    calendar: {
      title: 'Calendar',
      weekTotal: 'Total',
      monthStats: {
        netPnl: 'Net P&L',
        winningDays: 'Winning days',
        losingDays: 'Losing days',
        tradesCount: 'Trades',
      },
      dayState: {
        profit: 'Winning day',
        loss: 'Losing day',
        flat: 'Flat day',
        journalOnly: 'Journal only',
        today: 'Today',
        empty: 'No trades',
      },
      dayAccessibility: '{{day}}, {{state}}',
      monthNav: {
        previous: 'Previous month',
        next: 'Next month',
      },
      loading: 'Loading calendar…',
      error: {
        title: 'Could not load the calendar',
        description: 'Check your connection and try again.',
        retry: 'Retry',
      },
      empty: {
        title: 'No data this month',
        description: 'No trades or journal entries for this month — change month or add a trade.',
        action: 'Add a trade',
      },
      detail: {
        titleWithJournal: '{{day}} · Journal',
        tradesTitle: "Day's trades",
        noTrades: 'No trades on this day.',
        journalNote: 'A journal entry exists for this day (preview coming soon).',
        direction: { long: 'Long', short: 'Short' },
      },
    },
    trades: {
      empty: {
        title: 'No trades yet',
        description: 'Add your first trade to start tracking your performance.',
        action: 'Add a trade',
      },
    },
    journal: {
      empty: {
        title: 'No journal entries yet',
        description: 'Write your first entry to track your discipline and mindset.',
        action: 'Write an entry',
      },
    },
    more: {
      sections: {
        analytics: { label: 'Analytics', description: 'Detailed reports and statistics.' },
        rules: { label: 'Rules', description: 'Personal rules and checklists.' },
        settings: { label: 'Settings', description: 'Preferences, account, theme.' },
        catalog: {
          label: 'Component catalog',
          description: 'Design system preview — development only.',
        },
      },
    },
    // Settings screen (M1-9) : toggles persisted between launches (theme,
    // P&L colors, hide amounts, language).
    settings: {
      title: 'Settings',
      sections: {
        appearance: 'Appearance',
        language: 'Language',
      },
      theme: {
        label: 'Theme',
        system: 'System',
        dark: 'Dark',
        light: 'Light',
      },
      pnlColors: {
        label: 'P&L colors',
        blueGray: 'Blue / gray',
        greenRed: 'Green / red',
      },
      hideAmounts: {
        label: 'Amounts',
        visible: 'Visible',
        hidden: 'Hidden',
      },
      language: {
        label: 'App language',
        system: 'System',
        fr: 'Français',
        en: 'English',
      },
    },
    comingSoon: {
      title: 'Coming soon',
      description: 'This screen is under construction.',
    },
    // Service worker update prompt (W-7, PWA) : shown via the toast
    // (`sonner`) already mounted at the root — never a forced reload.
    pwa: {
      updateAvailable: {
        message: 'A new version is available.',
        action: 'Update',
      },
      offlineReady: {
        message: 'The app is ready to work offline.',
      },
    },
  },
} as const;
