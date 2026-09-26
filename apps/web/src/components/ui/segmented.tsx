import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

export interface SegmentedProps<T extends string = string> {
  readonly testId?: string;
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  /** Libellé accessible du groupe (ex. `t('trades.viewMode.label')`) — requis. */
  readonly 'aria-label': string;
  readonly className?: string;
}

/**
 * Sélecteur à segments (W-4, ARCHITECTURE §6.2 : ex. `$ / % / R`,
 * `Jour/Semaine/Mois/Année`) — même rôle que
 * `packages/ui/src/components/Segmented` (gelé), construit ici sur
 * `Tabs`/Radix (`TabsList` déjà pilotable au clavier, flèches gauche/droite).
 */
export function Segmented<T extends string = string>({
  testId,
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <Tabs
      data-testid={testId}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className={className}
    >
      <TabsList aria-label={ariaLabel} className="relative w-full">
        {/*
         * Fond actif déplacé par `transform` (W-9, ADR-017 révision 2026-09-25) :
         * un seul élément qui glisse (`translateX`, propriété composée — jamais
         * de repaint par image) plutôt qu'un `background-color`/`box-shadow`
         * appliqué/retiré sur le bouton actif à chaque bascule (coûteux sous
         * CPU ralenti, cause mesurée de saccades). Largeur égale entre options
         * (`flex-1` sur chaque `TabsTrigger`) : `translateX(n * 100%)` déplace
         * donc exactement d'une largeur de bouton par étape, sans mesure DOM.
         */}
        <span
          aria-hidden="true"
          style={{
            width: `calc((100% - 6px) / ${options.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
          className="absolute top-[3px] bottom-[3px] left-[3px] rounded-md bg-background shadow-sm transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] motion-reduce:transition-none"
        />
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            data-testid={testId ? `${testId}-option-${option.value}` : undefined}
            value={option.value}
            className={cn(
              'relative min-h-9 flex-1 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent',
            )}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
