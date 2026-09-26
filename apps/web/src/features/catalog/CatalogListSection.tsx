import { formatDayNumber, formatMonthLabel, formatWeekdayShort } from '@repo/core';
import { resolveLocale } from '@repo/i18n';
import { Inbox } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { TradeListRow } from '@/components/ui/trade-list-row';
import { VirtualizedList } from '@/components/ui/virtualized-list';

import { CatalogSection } from './CatalogSection';
import { generateSampleTrades, groupSampleTradesByDay } from './listSampleData';

const SAMPLE_TRADE_COUNT = 1000;
const SAMPLE_CURRENCY = 'USD';

function extractTradeKey(item: { readonly id: string }): string {
  return item.id;
}

/**
 * Démo de `VirtualizedList` (W-4, ADR-017 : « listes virtualisées au-delà de
 * 50 éléments ») : 1 000 lignes de trade factices groupées par jour, pour
 * vérifier le défilement fluide — même rôle que
 * `apps/app/features/catalog/CatalogListSection.tsx` (gelé).
 */
export function CatalogListSection() {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  const sections = useMemo(() => {
    const trades = generateSampleTrades(SAMPLE_TRADE_COUNT);
    return groupSampleTradesByDay(trades).map((section) => ({
      id: section.id,
      title: `${formatWeekdayShort(section.day, { locale })} ${formatDayNumber(section.day, { locale })} ${formatMonthLabel(section.day, { locale })}`,
      data: section.data,
    }));
  }, [locale]);

  return (
    <CatalogSection testId="catalog-section-list" title={t('catalog.sections.list')}>
      <div className="overflow-hidden rounded-lg border border-border">
        <VirtualizedList
          testId="catalog-trade-list"
          sections={sections}
          keyExtractor={extractTradeKey}
          emptyState={{
            icon: Inbox,
            title: t('catalog.list.empty.title'),
            description: t('catalog.list.empty.description'),
          }}
          endOfListLabel={t('catalog.list.endOfList')}
          height={420}
          renderItem={(item) => (
            <TradeListRow
              testId={`catalog-trade-row-${item.id}`}
              symbol={item.symbol}
              direction={item.direction}
              directionLabel={t(`catalog.list.direction.${item.direction}`)}
              dateLabel={`${formatWeekdayShort(item.day, { locale })} ${formatDayNumber(item.day, { locale })}`}
              pnl={item.pnl}
              currency={SAMPLE_CURRENCY}
              locale={locale}
              aria-label={`${item.symbol} ${t(`catalog.list.direction.${item.direction}`)} ${item.pnl}`}
            />
          )}
        />
      </div>
    </CatalogSection>
  );
}
