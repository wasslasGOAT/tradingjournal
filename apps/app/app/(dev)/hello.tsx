import { HelloScreen } from '@/features/hello/HelloScreen';

/**
 * Route de développement (M1-8) : l'écran Hello (M0/T6 — lecture de
 * `app_meta.schema_version`, 4 états) n'est plus la route racine depuis que
 * le Dashboard s'ouvre en premier (`(app)/index.tsx`, ARCHITECTURE §6.1). Déplacé
 * ici plutôt que supprimé : conservé pour l'e2e existant (`e2e/hello.spec.ts`,
 * `.maestro/hello.yaml`, testIDs inchangés) et comme vérification rapide de la
 * connexion Supabase pendant le développement.
 * M1-9 : seule la route `(dev)/catalog` est exclue du build de production
 * (`metro.config.js`, `EXPO_PUBLIC_ENABLE_CATALOG`) — ce fichier reste
 * embarqué ; son seul lien vers le catalogue (`HelloCatalogLink`) se masque
 * lui-même dans ce cas.
 */
export default function HelloRoute() {
  return <HelloScreen />;
}
