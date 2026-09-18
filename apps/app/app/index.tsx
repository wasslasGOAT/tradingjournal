import { HelloScreen } from '@/features/hello/HelloScreen';

/**
 * Route racine (M0). Délègue à `features/hello` (T6) : lecture de
 * `app_meta.schema_version` via Supabase + TanStack Query, 4 états d'écran.
 */
export default function IndexRoute() {
  return <HelloScreen />;
}
