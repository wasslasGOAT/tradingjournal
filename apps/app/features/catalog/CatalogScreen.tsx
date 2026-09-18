import {
  Button,
  Card,
  DayCell,
  EmptyState,
  GlowCard,
  ProgressBar,
  Screen,
  ShimmerBar,
  Skeleton,
  StatTile,
} from '@repo/ui';
import { resolveLocale } from '@repo/i18n';
import { Inbox } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { CatalogControls } from './CatalogControls';
import { CatalogHeader } from './CatalogHeader';
import { CatalogSection } from './CatalogSection';
import { SAMPLE_CURRENCY, SAMPLE_DAY_CELLS, SAMPLE_PROGRESS, SAMPLE_STAT_TILES } from './sampleData';

const DAY_CELL_LABEL_KEYS = ['profit', 'loss', 'journalOnly', 'empty', 'today'] as const;

/**
 * Catalogue de composants (M1-3) : vérification visuelle des primitives de
 * `packages/ui` sur téléphone/web, en un seul écran — **développement
 * uniquement**.
 * TODO(M1-9): exclure cette route du build de production (ex. variable
 * d'environnement `EXPO_PUBLIC_DEV_TOOLS`) avant la mise en production du MVP.
 */
export function CatalogScreen() {
  const { t, i18n } = useTranslation('common');
  const [hideAmounts, setHideAmounts] = useState(false);
  const locale = resolveLocale(i18n.language);

  return (
    <Screen testID="catalog-screen" scroll contentClassName="gap-lg">
      <CatalogHeader />
      <CatalogControls hideAmounts={hideAmounts} onToggleHideAmounts={() => setHideAmounts((value) => !value)} />

      <CatalogSection testID="catalog-section-stat-tiles" title={t('catalog.sections.statTiles')}>
        <View className="flex-row flex-wrap gap-sm">
          <StatTile
            testID="catalog-stat-tile-profit"
            label={t('catalog.statTiles.netPnl')}
            kind="signedAmount"
            value={SAMPLE_STAT_TILES.netPnlPositive}
            currency={SAMPLE_CURRENCY}
            locale={locale}
            hideAmounts={hideAmounts}
          />
          <StatTile
            testID="catalog-stat-tile-loss"
            label={t('catalog.statTiles.loss')}
            kind="signedAmount"
            value={SAMPLE_STAT_TILES.netPnlNegative}
            currency={SAMPLE_CURRENCY}
            locale={locale}
            hideAmounts={hideAmounts}
          />
          <StatTile
            testID="catalog-stat-tile-win-rate"
            label={t('catalog.statTiles.winRate')}
            kind="percent"
            value={SAMPLE_STAT_TILES.winRate}
            locale={locale}
            hideAmounts={hideAmounts}
          />
          <StatTile
            testID="catalog-stat-tile-trades"
            label={t('catalog.statTiles.trades')}
            kind="number"
            value={SAMPLE_STAT_TILES.tradesCount}
            locale={locale}
            hideAmounts={hideAmounts}
          />
        </View>
      </CatalogSection>

      <CatalogSection testID="catalog-section-buttons" title={t('catalog.sections.buttons')}>
        <View className="flex-row flex-wrap gap-sm">
          <Button testID="catalog-button-primary" label={t('catalog.buttons.primary')} variant="primary" onPress={() => {}} />
          <Button
            testID="catalog-button-secondary"
            label={t('catalog.buttons.secondary')}
            variant="secondary"
            onPress={() => {}}
          />
          <Button testID="catalog-button-ghost" label={t('catalog.buttons.ghost')} variant="ghost" onPress={() => {}} />
          <Button testID="catalog-button-danger" label={t('catalog.buttons.danger')} variant="danger" onPress={() => {}} />
          <Button
            testID="catalog-button-loading"
            label={t('catalog.buttons.loading')}
            variant="primary"
            loading
            onPress={() => {}}
          />
          <Button
            testID="catalog-button-disabled"
            label={t('catalog.buttons.disabled')}
            variant="primary"
            disabled
            onPress={() => {}}
          />
        </View>
      </CatalogSection>

      <CatalogSection testID="catalog-section-loaders" title={t('catalog.sections.loaders')}>
        <View className="gap-sm">
          <Skeleton testID="catalog-skeleton-line" height={16} width="60%" />
          <Skeleton testID="catalog-skeleton-block" height={64} radius="lg" />
          <ShimmerBar testID="catalog-shimmer-bar" />
          <ProgressBar
            testID="catalog-progress-bar"
            value={SAMPLE_PROGRESS}
            accessibilityLabel={t('catalog.progress.label')}
          />
        </View>
      </CatalogSection>

      <CatalogSection testID="catalog-section-empty-state" title={t('catalog.sections.emptyState')}>
        <Card testID="catalog-empty-state-card">
          <EmptyState
            testID="catalog-empty-state"
            icon={Inbox}
            title={t('catalog.emptyState.title')}
            description={t('catalog.emptyState.description')}
            action={{ label: t('catalog.emptyState.action'), onPress: () => {} }}
          />
        </Card>
      </CatalogSection>

      <CatalogSection testID="catalog-section-calendar" title={t('catalog.sections.calendar')}>
        <View className="flex-row gap-sm">
          {SAMPLE_DAY_CELLS.map((cell, index) => (
            <DayCell
              key={cell.day}
              testID={`catalog-day-cell-${cell.day}`}
              dayLabel={cell.day}
              pnl={cell.pnl}
              hasJournalEntry={cell.hasJournalEntry}
              isToday={cell.isToday}
              currency={SAMPLE_CURRENCY}
              locale={locale}
              hideAmounts={hideAmounts}
              accessibilityLabel={t(`catalog.dayCell.${DAY_CELL_LABEL_KEYS[index] ?? 'empty'}`)}
            />
          ))}
        </View>
      </CatalogSection>

      <CatalogSection testID="catalog-section-cards" title={t('catalog.sections.cards')}>
        <View className="gap-sm">
          <Card testID="catalog-card">
            <Text className="font-sans-semibold text-base text-textPrimary">{t('catalog.cards.cardTitle')}</Text>
            <Text className="font-sans text-sm text-textSecondary">{t('catalog.cards.cardBody')}</Text>
          </Card>
          <GlowCard testID="catalog-glow-card">
            <Text className="font-sans-semibold text-base text-textPrimary">{t('catalog.cards.glowCardTitle')}</Text>
            <Text className="font-sans text-sm text-textSecondary">{t('catalog.cards.glowCardBody')}</Text>
          </GlowCard>
        </View>
      </CatalogSection>
    </Screen>
  );
}
