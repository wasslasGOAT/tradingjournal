import { formatAmount, parseAmount } from '@repo/core';
import { resolveLocale } from '@repo/i18n';
import {
  Button,
  Card,
  GlowCard,
  Screen,
  StatTile,
  tabularNumsStyle,
  themes,
  useThemeMode,
  useVisibilityStore,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { CalendarDays, NotebookPen, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useComingSoonStore } from '@/features/shell/comingSoonStore';

import { SAMPLE_DASHBOARD, SAMPLE_DASHBOARD_CURRENCY } from './sampleData';

/**
 * Écran Dashboard (M1-8, ARCHITECTURE §6.1 : premier écran affiché). Solde en
 * avant (`GlowCard`), P&L jour/mois + rendement en tuiles, raccourcis,
 * emplacement de courbe d'equity (`Chart`, M1-6). Données factices
 * (`sampleData.ts`) — le vrai dashboard (agrégats `@repo/core` sur les trades
 * filtrés par compte/période, TanStack Query) arrive en M3.
 */
export function DashboardScreen() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const mode = useThemeMode();
  const locale = resolveLocale(i18n.language);
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts);
  const showComingSoon = useComingSoonStore((state) => state.show);
  const shortcutIconColor = themes[mode].textPrimary;

  const balance = formatAmount(parseAmount(SAMPLE_DASHBOARD.balance), SAMPLE_DASHBOARD_CURRENCY, {
    locale,
    hideAmounts,
  });

  return (
    <Screen
      testID="screen-dashboard"
      scroll
      edges={{ top: false, bottom: false }}
      contentClassName="gap-lg pb-xl"
    >
      <GlowCard testID="dashboard-balance-card">
        <Text className="font-sans text-sm text-textSecondary">{t('dashboard.balance')}</Text>
        <Text
          testID="dashboard-balance-value"
          className="mt-xs font-sans-semibold text-2xl text-textPrimary"
          style={tabularNumsStyle}
          numberOfLines={1}
        >
          {balance}
        </Text>
      </GlowCard>

      <View className="flex-row flex-wrap gap-sm">
        <StatTile
          testID="dashboard-stat-pnl-today"
          label={t('dashboard.pnlToday')}
          kind="signedAmount"
          value={SAMPLE_DASHBOARD.pnlToday}
          currency={SAMPLE_DASHBOARD_CURRENCY}
          locale={locale}
          hideAmounts={hideAmounts}
        />
        <StatTile
          testID="dashboard-stat-pnl-month"
          label={t('dashboard.pnlMonth')}
          kind="signedAmount"
          value={SAMPLE_DASHBOARD.pnlMonth}
          currency={SAMPLE_DASHBOARD_CURRENCY}
          locale={locale}
          hideAmounts={hideAmounts}
        />
        <StatTile
          testID="dashboard-stat-return-rate"
          label={t('dashboard.returnRate')}
          kind="percent"
          value={SAMPLE_DASHBOARD.returnRate}
          locale={locale}
          hideAmounts={hideAmounts}
        />
      </View>

      <View className="flex-row flex-wrap gap-sm">
        <Button
          testID="dashboard-shortcut-add-trade"
          label={t('dashboard.shortcuts.addTrade')}
          variant="secondary"
          size="sm"
          icon={<Plus size={16} color={shortcutIconColor} />}
          onPress={() => showComingSoon(t('header.quickAdd.comingSoon'))}
        />
        <Button
          testID="dashboard-shortcut-view-calendar"
          label={t('dashboard.shortcuts.viewCalendar')}
          variant="secondary"
          size="sm"
          icon={<CalendarDays size={16} color={shortcutIconColor} />}
          onPress={() => router.push('/calendar')}
        />
        <Button
          testID="dashboard-shortcut-open-journal"
          label={t('dashboard.shortcuts.openJournal')}
          variant="secondary"
          size="sm"
          icon={<NotebookPen size={16} color={shortcutIconColor} />}
          onPress={() => router.push('/journal')}
        />
      </View>

      <Card testID="dashboard-equity-card">
        <Text className="font-sans-semibold text-base text-textPrimary">
          {t('dashboard.equity.title')}
        </Text>
        <View className="mt-md min-h-32 items-center justify-center">
          <Text className="font-sans text-sm text-textMuted">
            {t('dashboard.equity.placeholder')}
          </Text>
        </View>
      </Card>
    </Screen>
  );
}
