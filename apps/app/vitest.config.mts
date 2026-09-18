import { defineProject } from 'vitest/config';

// Logique pure uniquement (lib/*) : pas de rendu React Native dans Vitest en M0.
// `.web.ts` résolu en priorité sur `.ts` : permet de tester des modules qui
// importent du code spécifique plateforme (ex. `lib/query/storage`,
// `lib/supabase/authStorage`) sans dépendre de modules natifs (SecureStore,
// AsyncStorage...) absents sous Node — la variante web se dégrade proprement
// (`createSafeWebStorage`) plutôt que de planter.
export default defineProject({
  resolve: {
    extensions: ['.web.ts', '.web.tsx', '.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  test: { name: 'app', include: ['lib/**/*.test.ts'] },
});
