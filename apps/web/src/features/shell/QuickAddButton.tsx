import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { ResponsiveSheet } from '@/components/ui/sheet-responsive';

/**
 * Bouton d'ajout rapide global (W-5, ADR-011 : « bouton d'ajout rapide de
 * trade global »). La vraie saisie de trade n'existe pas encore (M4) :
 * ouvre une `Sheet` placeholder plutôt qu'un simple toast (ARCHITECTURE
 * §6.1), cohérente avec le reste des écrans (état « bientôt disponible »).
 */
export function QuickAddButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        testId="header-quick-add"
        icon={Plus}
        variant="default"
        aria-label={t('header.quickAdd.accessibilityLabel')}
        onClick={() => setOpen(true)}
      />
      <ResponsiveSheet
        testId="header-quick-add-sheet"
        open={open}
        onOpenChange={setOpen}
        title={t('header.quickAdd.accessibilityLabel')}
        closeLabel={t('close')}
      >
        <p className="text-sm text-muted-foreground">{t('header.quickAdd.comingSoon')}</p>
      </ResponsiveSheet>
    </>
  );
}
