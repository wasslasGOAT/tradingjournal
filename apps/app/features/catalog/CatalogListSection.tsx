import { formatDayNumber, formatMonthLabel, formatWeekdayShort } from '@repo/core';
import { resolveLocale } from '@repo/i18n';
import { TradeListRow, VirtualizedList } from '@repo/ui';
import { Inbox } from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { generateSampleTrades, groupSampleTradesByDay } from './listSampleData';
import { CatalogSection } from './CatalogSection';

const SAMPLE_TRADE_COUNT = 1000;
const SAMPLE_CURRENCY = 'USD';

/**
 * Démo de `VirtualizedList` (M1-5, ADR-017 : « listes virtualisées au-delà de
 * 50 éléments ») : 1 000 lignes de trade factices groupées par jour, pour
 * vérifier le défilement fluide et les en-têtes de section collants.
 */
export function CatalogListSection() {
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);

  const sections = useMemo(() => {
    const trades = generateSampleTrades(SAMPLE_TRADE_COUNT);
    return groupSampleTradesByDay(trades).map((section) => ({
      id: section.id,
      // Composé à partir des formateurs `@repo/core/format` (jour/mois/jour de
      // semaine) : pas de date complète dédiée dans `@repo/core`, et un en-tête
      // par jour a besoin de plus que le seul quantième (`formatDayNumber`) pour
      // rester lisible parmi ~25 sections.
      title: `${formatWeekdayShort(section.day, { locale })} ${formatDayNumber(section.day, { locale })} ${formatMonthLabel(section.day, { locale })}`,
      data: section.data,
    }));
  }, [locale]);

  return (
    <CatalogSection testID="catalog-section-list" title={t('catalog.sections.list')}>
      <View style={{ height: 420 }} className="overflow-hidden rounded-lg border border-border">
        <VirtualizedList
          testID="catalog-trade-list"
          sections={sections}
          keyExtractor={(item) => item.id}
          emptyState={{
            icon: Inbox,
            title: t('catalog.list.empty.title'),
            description: t('catalog.list.empty.description'),
          }}
          endOfListLabel={t('catalog.list.endOfList')}
          renderItem={(item) => (
            <TradeListRow
              testID={`catalog-trade-row-${item.id}`}
              symbol={item.symbol}
              direction={item.direction}
              directionLabel={t(`catalog.list.direction.${item.direction}`)}
              dateLabel={`${formatWeekdayShort(item.day, { locale })} ${formatDayNumber(item.day, { locale })}`}
              pnl={item.pnl}
              currency={SAMPLE_CURRENCY}
              locale={locale}
              accessibilityLabel={`${item.symbol} ${t(`catalog.list.direction.${item.direction}`)} ${item.pnl}`}
            />
          )}
        />
      </View>
    </CatalogSection>
  );
}
