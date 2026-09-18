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
    },
    notFound: {
      title: 'Page not found',
      description: "This screen doesn't exist.",
      backHome: 'Back to home',
    },
  },
} as const;
