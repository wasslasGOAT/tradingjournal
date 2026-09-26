import { Decimal, formatAmount, formatDayNumber, formatWeekdayShort } from '@repo/core';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CalendarDays, LayoutDashboard, NotebookPen, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';
import { useToast } from '@/components/ui/use-toast';
import { Chart } from '@/components/chart';
import type { ChartActivePoint } from '@/components/chart';
import { dashboardQueryOptions } from '@/data/dashboard';
import { resolveLocale } from '@/lib/i18n';
import { useVisibilityStore } from '@/features/preferences/visibility-store';

import { toEquitySeriesPoints } from './equitySeries';

/**
 * Écran Dashboard (W-6, ARCHITECTURE §6.1) : solde, tuiles P&L/rendement,
 * courbe d'equity et raccourcis — mêmes rôles/API que
 * `apps/app/features/dashboard/DashboardScreen.tsx` (gelé), sur les données
 * factices de `src/data/dashboard.ts` (filtrées par compte + période, URL
 * `_shell`). 4 états gérés : squelette, vide, erreur, rempli.
 */
export function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: '/_shell' });
  const locale = resolveLocale(i18n.language);
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts);
  const { show } = useToast();

  const filters = { accountId: search.account, from: search.from, to: search.to };
  const query = useQuery(dashboardQueryOptions(filters));

  // Tuile « P&L du jour » (revue W-10) : `recentDayTradingDay` n'est plus
  // forcément le dernier jour de la période (multi-comptes, voir
  // `computeLastDayPnl`) — le libellé affiche le jour retenu pour que la
  // valeur ne soit jamais ambiguë. `null` (aucun compte tradé sur la
  // période) retombe sur le libellé générique.
  const recentDayTradingDay = query.data?.recentDayTradingDay ?? null;
  const pnlTodayLabel = recentDayTradingDay
    ? t('dashboard.pnlTodayWithDay', {
        weekday: formatWeekdayShort(recentDayTradingDay, { locale }),
        day: formatDayNumber(recentDayTradingDay, { locale }),
      })
    : t('dashboard.pnlToday');

  const equityPoints = useMemo(
    () => toEquitySeriesPoints(query.data?.equityPoints ?? []),
    [query.data],
  );
  const formatEquityXLabel = (x: number) => {
    const point = query.data?.equityPoints[Math.round(x)];
    return point ? formatDayNumber(point.tradingDay, { locale }) : '';
  };
  const formatEquityYLabel = (y: number) =>
    formatAmount(new Decimal(y), query.data?.currency ?? 'USD', {
      locale,
      hideAmounts,
      decimals: 0,
    });
  // Repart de la valeur `Decimal` source (`query.data.equityPoints[…].balance`), jamais du
  // `number` de tracé (`point.y`, dérivé via `.toNumber()` pour recharts) — CLAUDE.md :
  // l'affichage ne doit jamais recalculer un montant depuis un flottant.
  const formatEquityTooltipValue = (point: ChartActivePoint) => {
    const source = query.data?.equityPoints[Math.round(point.x)];
    const amount = source ? source.balance : new Decimal(point.y);
    return `${t('dashboard.equity.tooltipLabel')} ${formatAmount(amount, query.data?.currency ?? 'USD', { locale, hideAmounts })}`;
  };

  if (query.isPending) {
    return (
      <div data-testid="screen-dashboard" className="flex flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-20 w-32 rounded-md" />
          <Skeleton className="h-20 w-32 rounded-md" />
          <Skeleton className="h-20 w-32 rounded-md" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <p className="text-lg font-semibold text-foreground">{t('dashboard.error.title')}</p>
        <p className="text-sm text-muted-foreground">{t('dashboard.error.description')}</p>
        <Button onClick={() => void query.refetch()}>{t('dashboard.error.retry')}</Button>
      </div>
    );
  }

  const data = query.data;
  const currency = data.currency;

  if (!data.hasActivity) {
    return (
      <div data-testid="screen-dashboard" className="flex flex-col gap-4 p-4 sm:p-6">
        <EmptyState
          testId="dashboard-empty"
          icon={LayoutDashboard}
          title={t('dashboard.empty.title')}
          description={t('dashboard.empty.description')}
          action={{
            label: t('dashboard.empty.action'),
            onClick: () => show(t('header.quickAdd.comingSoon')),
          }}
        />
      </div>
    );
  }

  return (
    <div data-testid="screen-dashboard" className="flex flex-col gap-4 p-4 sm:p-6">
      <Card
        data-testid="dashboard-balance-card"
        className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-lg shadow-primary/10"
      >
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('dashboard.balance')}</p>
          <p
            data-testid="dashboard-balance-value"
            className="mt-1 truncate text-2xl font-semibold tabular-nums text-foreground"
          >
            {formatAmount(data.balance, currency, { locale, hideAmounts })}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <StatTile
          testId="dashboard-stat-pnl-today"
          label={pnlTodayLabel}
          kind="signedAmount"
          value={data.recentDayPnl}
          currency={currency}
          locale={locale}
          hideAmounts={hideAmounts}
        />
        <StatTile
          testId="dashboard-stat-pnl-month"
          label={t('dashboard.pnlMonth')}
          kind="signedAmount"
          value={data.periodPnl}
          currency={currency}
          locale={locale}
          hideAmounts={hideAmounts}
        />
        <StatTile
          testId="dashboard-stat-return-rate"
          label={t('dashboard.returnRate')}
          kind="percent"
          value={data.returnRate}
          locale={locale}
          hideAmounts={hideAmounts}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          data-testid="dashboard-shortcut-add-trade"
          variant="secondary"
          size="sm"
          onClick={() => show(t('header.quickAdd.comingSoon'))}
        >
          <Plus size={16} aria-hidden="true" />
          {t('dashboard.shortcuts.addTrade')}
        </Button>
        <Button
          data-testid="dashboard-shortcut-view-calendar"
          variant="secondary"
          size="sm"
          onClick={() => void navigate({ to: '/calendar', search })}
        >
          <CalendarDays size={16} aria-hidden="true" />
          {t('dashboard.shortcuts.viewCalendar')}
        </Button>
        <Button
          data-testid="dashboard-shortcut-open-journal"
          variant="secondary"
          size="sm"
          onClick={() => void navigate({ to: '/journal', search })}
        >
          <NotebookPen size={16} aria-hidden="true" />
          {t('dashboard.shortcuts.openJournal')}
        </Button>
      </div>

      <Card data-testid="dashboard-equity-card">
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.equity.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart
            testID="dashboard-equity-chart"
            type="area"
            accessibilityLabel={t('dashboard.equity.accessibilityLabel')}
            series={[{ id: 'equity', points: equityPoints, intent: 'accent' }]}
            height={220}
            emptyState={{
              title: t('dashboard.equity.empty.title'),
              description: t('dashboard.equity.empty.description'),
            }}
            formatXLabel={formatEquityXLabel}
            formatYLabel={formatEquityYLabel}
            formatTooltipValue={formatEquityTooltipValue}
          />
        </CardContent>
      </Card>
    </div>
  );
}
