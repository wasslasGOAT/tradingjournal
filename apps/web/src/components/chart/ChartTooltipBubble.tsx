export interface ChartTooltipBubbleProps {
  readonly label: string;
  readonly value: string;
}

/**
 * Infobulle du point actif (W-4, ARCHITECTURE §6 : « infobulle lisible » au
 * survol/tap) — même rôle que `packages/ui/src/chart/ChartTooltipBubble.tsx`
 * (gelé), posée par `recharts` dans le contenu personnalisé de `<Tooltip>`.
 */
export function ChartTooltipBubble({ label, value }: ChartTooltipBubbleProps) {
  return (
    <div className="rounded-sm border border-border bg-popover px-3 py-1.5 shadow-md">
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
