import { Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { BarChart3, Blocks, Settings, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CATALOG_ENABLED } from '@/lib/flags';

import { MoreListItem } from './MoreListItem';

// M1-9 : le catalogue de composants est un outil de développement, exclu du bundle de
// production côté Metro (`metro.config.js`, `resolver.blockList`) — l'entrée de menu doit
// disparaître avec lui, sinon elle pointerait vers une route absente du bundle.
// Voir `@/lib/flags` pour la règle (mode développement, surchargeable).

/**
 * Écran « Plus » (M1-8, ADR-011 : contient Analytics, Règles, Réglages sur
 * mobile — la sidebar web ≥ 1024 px les affiche directement, ce groupement
 * n'y apparaît pas). Le catalogue de composants (développement) reste
 * accessible d'ici (CLAUDE.md M1-8), uniquement quand activé (M1-9).
 */
export function MoreScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <Screen
      testID="screen-more"
      scroll
      edges={{ top: false, bottom: false }}
      contentClassName="gap-sm pb-xl"
    >
      <View className="gap-sm">
        <MoreListItem
          testID="more-item-analytics"
          icon={BarChart3}
          label={t('more.sections.analytics.label')}
          description={t('more.sections.analytics.description')}
          onPress={() => router.push('/analytics')}
        />
        <MoreListItem
          testID="more-item-rules"
          icon={ShieldCheck}
          label={t('more.sections.rules.label')}
          description={t('more.sections.rules.description')}
          onPress={() => router.push('/rules')}
        />
        <MoreListItem
          testID="more-item-settings"
          icon={Settings}
          label={t('more.sections.settings.label')}
          description={t('more.sections.settings.description')}
          onPress={() => router.push('/settings')}
        />
        {CATALOG_ENABLED ? (
          <MoreListItem
            testID="more-item-catalog"
            icon={Blocks}
            label={t('more.sections.catalog.label')}
            description={t('more.sections.catalog.description')}
            onPress={() => router.push('/catalog')}
          />
        ) : null}
      </View>
    </Screen>
  );
}
