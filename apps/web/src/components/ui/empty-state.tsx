import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly action?: EmptyStateAction;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * État « vide » générique (W-4, ADR-017 : « EmptyState + action » sur chaque
 * écran de données) — même API que `packages/ui/src/components/EmptyState`
 * (gelé), adaptée au web (`onClick` plutôt que `onPress`).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  testId,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      role="status"
      className={cn(
        'mx-auto flex w-full max-w-sm flex-col items-center gap-2 px-6 py-10 text-center',
        className,
      )}
    >
      <Icon size={32} className="text-muted-foreground" aria-hidden="true" />
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ? (
        <Button
          data-testid={testId ? `${testId}-action` : undefined}
          className="mt-2"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
