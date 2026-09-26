import type { ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/lib/use-media-query';

export interface ResponsiveSheetProps {
  readonly testId?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Titre affiché dans l'en-tête — requis (`DialogTitle`/`DrawerTitle`, toujours besoin d'un libellé accessible). */
  readonly title: string;
  readonly description?: string;
  /** Libellé accessible du bouton de fermeture (`Dialog`, bureau) — ex. `t('common.close')`. */
  readonly closeLabel: string;
  readonly children: ReactNode;
  readonly contentClassName?: string;
}

/** À partir de cette largeur, la fenêtre s'ouvre en `Dialog` centré plutôt qu'en `Drawer` bas. */
const DESKTOP_BREAKPOINT_QUERY = '(min-width: 768px)';

/**
 * Panneau responsive (W-4, ARCHITECTURE §6.1) : `Drawer` coulissant par le
 * bas sur mobile, `Dialog` centré sur bureau — même rôle que
 * `packages/ui/src/components/Sheet` (gelé), qui utilise une seule
 * présentation (sheet bas) sur toutes les plateformes natives ; le web tire
 * parti de Radix (`Dialog`/`Drawer`/`vaul`) pour le piège à focus et
 * `Échap`, déjà géré nativement par ces primitives.
 */
export function ResponsiveSheet({
  testId,
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  contentClassName,
}: ResponsiveSheetProps) {
  const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT_QUERY);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid={testId} closeLabel={closeLabel} className={contentClassName}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent data-testid={testId} className={contentClassName}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
