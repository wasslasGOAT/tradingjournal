import { useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';

/** En-tête du catalogue (W-4) : retour + titre/sous-titre. */
export function CatalogHeader() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <header data-testid="catalog-header" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <IconButton
          testId="catalog-back"
          icon={ArrowLeft}
          aria-label={t('catalog.back')}
          onClick={() => router.history.back()}
        />
        <h1 data-testid="catalog-title" className="text-lg font-semibold text-foreground">
          {t('catalog.title')}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">{t('catalog.subtitle')}</p>
    </header>
  );
}
