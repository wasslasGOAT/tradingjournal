import { defineProject } from 'vitest/config';

// Logique pure uniquement (lib/*, features/**/*.test.ts non-.tsx) : pas de rendu
// React Native dans Vitest (M0/M1-8) — les fichiers `.test.ts` sous `features/`
// couvrent des helpers purs colocalisés (ex. `features/calendar/buildCalendarGrid.ts`),
// jamais un composant `.tsx`. `.web.ts` résolu en priorité sur `.ts` : permet de
// tester des modules qui importent du code spécifique plateforme (ex.
// `lib/query/storage`, `lib/supabase/authStorage`) sans dépendre de modules
// natifs (SecureStore, AsyncStorage...) absents sous Node — la variante web se
// dégrade proprement (`createSafeWebStorage`) plutôt que de planter.
export default defineProject({
  resolve: {
    extensions: ['.web.ts', '.web.tsx', '.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  test: { name: 'app', include: ['lib/**/*.test.ts', 'features/**/*.test.ts'] },
});
