import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/features/preferences/theme-store';

/**
 * Contrôles de démonstration du catalogue (W-4) : thème, couleurs P&L,
 * masquage des montants, langue. Réglages persistés (`theme-store.ts`,
 * `visibility-store.ts`), comme le reste de l'app — même rôle que
 * `apps/app/features/catalog/CatalogControls.tsx` (gelé).
 */
export interface CatalogControlsProps {
  readonly hideAmounts: boolean;
  readonly onToggleHideAmounts: () => void;
}

export function CatalogControls({ hideAmounts, onToggleHideAmounts }: CatalogControlsProps) {
  const { t, i18n } = useTranslation();
  const preference = useThemeStore((state) => state.preference);
  const cyclePreference = useThemeStore((state) => state.cyclePreference);
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme);
  const setPnlColorScheme = useThemeStore((state) => state.setPnlColorScheme);

  const themeLabel = t(`catalog.controls.theme.${preference}`);
  const pnlLabel =
    pnlColorScheme === 'blueGray'
      ? t('catalog.controls.pnlColors.blueGray')
      : t('catalog.controls.pnlColors.greenRed');
  const hideAmountsLabel = t('catalog.controls.hideAmounts.label');
  const languageLabel = i18n.language.toUpperCase();

  return (
    <div data-testid="catalog-controls" className="flex flex-wrap gap-2">
      <Button
        type="button"
        data-testid="catalog-control-theme"
        variant="secondary"
        size="sm"
        aria-label={t('catalog.controls.theme.label')}
        onClick={cyclePreference}
      >
        {themeLabel}
      </Button>
      <Button
        type="button"
        data-testid="catalog-control-pnl-colors"
        variant="secondary"
        size="sm"
        aria-label={t('catalog.controls.pnlColors.label')}
        onClick={() => setPnlColorScheme(pnlColorScheme === 'blueGray' ? 'greenRed' : 'blueGray')}
      >
        {pnlLabel}
      </Button>
      <Button
        type="button"
        data-testid="catalog-control-hide-amounts"
        variant={hideAmounts ? 'default' : 'secondary'}
        size="sm"
        aria-label={hideAmountsLabel}
        onClick={onToggleHideAmounts}
      >
        {hideAmounts ? (
          <EyeOff size={16} aria-hidden="true" />
        ) : (
          <Eye size={16} aria-hidden="true" />
        )}
        {hideAmountsLabel}
      </Button>
      <Button
        type="button"
        data-testid="catalog-control-language"
        variant="secondary"
        size="sm"
        aria-label={t('catalog.controls.language.label')}
        onClick={() => void i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
      >
        {languageLabel}
      </Button>
    </div>
  );
}
