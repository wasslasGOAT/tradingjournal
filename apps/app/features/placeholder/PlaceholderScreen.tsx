import { EmptyState, Screen } from '@repo/ui';
import type { LucideIcon } from 'lucide-react-native';

export interface PlaceholderScreenProps {
  readonly testID: string;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
}

/**
 * Écran générique « bientôt disponible » (M1-8) pour les sections dont le
 * contenu réel arrive après M1 (Analytics, Règles, Réglages). Pas d'action :
 * l'utilisateur revient par la navigation (tab bar/sidebar), pas de
 * raccourci vers un endroit qui n'existe pas encore non plus.
 */
export function PlaceholderScreen({ testID, icon, title, description }: PlaceholderScreenProps) {
  return (
    <Screen testID={testID} edges={{ top: false, bottom: false }}>
      <EmptyState
        testID={`${testID}-empty-state`}
        icon={icon}
        title={title}
        description={description}
      />
    </Screen>
  );
}
