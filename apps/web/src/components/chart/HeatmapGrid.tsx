import { useMemo, useState } from 'react';

import { useThemeStore } from '@/features/preferences/theme-store';
import { pnlColorSchemes, themes } from '@/lib/theme/tokens';

import {
  computeMaxAbsValue,
  resolveHeatmapCellBorderColor,
  resolveHeatmapCellColor,
} from './heatmapColor';
import type { ChartActivePoint, ChartHeatmapCell } from './types';

export interface HeatmapGridProps {
  readonly testId?: string;
  readonly cells: readonly ChartHeatmapCell[];
  readonly rows: number;
  readonly cols: number;
  readonly formatRowLabel?: (row: number) => string;
  readonly formatColLabel?: (col: number) => string;
  readonly formatTooltipValue?: (point: ChartActivePoint) => string;
  readonly legendLabels?: { readonly low: string; readonly high: string };
  readonly onActivePointChange?: (point: ChartActivePoint | null) => void;
}

/** Taille de cellule (px) — même valeur que `packages/ui/src/chart/HeatmapGrid.tsx`
 * (gelé) : volontairement < 44 px (une grille heure × jour tient jusqu'à 24
 * colonnes, qu'aucune largeur d'écran mobile ne peut afficher à 44 px
 * chacune) — grille dans un conteneur défilant horizontalement.
 */
const CELL_SIZE = 28;
const COLUMN_LABEL_STRIDE = 3;

/**
 * Heatmap sans bibliothèque de graphique (W-4) : grille de `div` colorées par
 * intensité (P&L profit/perte du schéma actif). Même rôle que
 * `packages/ui/src/chart/HeatmapGrid.tsx` (gelé) — interaction clic/tap
 * marquant la cellule active, boutons natifs (`<button>`) pour le clavier.
 */
export function HeatmapGrid({
  testId,
  cells,
  rows,
  cols,
  formatRowLabel,
  formatColLabel,
  formatTooltipValue,
  legendLabels,
  onActivePointChange,
}: HeatmapGridProps) {
  const mode = useThemeStore((state) => state.resolvedMode);
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme);
  const colors = themes[mode];
  const pnl = pnlColorSchemes[mode][pnlColorScheme];
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const cellByKey = useMemo(() => {
    const map = new Map<string, ChartHeatmapCell>();
    for (const cell of cells) map.set(`${cell.row}-${cell.col}`, cell);
    return map;
  }, [cells]);
  const maxAbsValue = useMemo(() => computeMaxAbsValue(cells.map((cell) => cell.value)), [cells]);

  const handlePress = (row: number, col: number, value: number) => {
    const key = `${row}-${col}`;
    const next = activeKey === key ? null : key;
    setActiveKey(next);
    onActivePointChange?.(next === null ? null : { x: col, y: value, seriesId: `${row}` });
  };

  return (
    <div data-testid={testId} className="flex flex-col gap-1">
      <div className="overflow-x-auto">
        <div className="flex flex-col gap-1">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex items-center gap-1">
              {formatRowLabel ? (
                <span className="w-8 shrink-0 truncate text-right font-mono text-2xs text-muted-foreground">
                  {formatRowLabel(row)}
                </span>
              ) : null}
              {Array.from({ length: cols }, (_, col) => {
                const cell = cellByKey.get(`${row}-${col}`);
                const value = cell?.value ?? 0;
                const key = `${row}-${col}`;
                const isActive = activeKey === key;
                const label = formatTooltipValue
                  ? formatTooltipValue({ x: col, y: value, seriesId: `${row}` })
                  : `${value}`;
                const columnLabel = formatColLabel ? formatColLabel(col) : `${col}`;
                const rowLabel = formatRowLabel ? formatRowLabel(row) : `${row}`;

                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={testId ? `${testId}-cell-${row}-${col}` : undefined}
                    aria-label={`${rowLabel} ${columnLabel} ${label}`}
                    aria-pressed={isActive}
                    disabled={!cell}
                    onClick={cell ? () => handlePress(row, col, value) : undefined}
                    className="shrink-0 rounded-[4px] transition-colors disabled:cursor-default"
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: resolveHeatmapCellColor(value, maxAbsValue, pnl),
                      borderWidth: isActive ? 2 : 1,
                      borderStyle: 'solid',
                      borderColor: isActive ? colors.accent : resolveHeatmapCellBorderColor(colors),
                    }}
                  />
                );
              })}
            </div>
          ))}
          {formatColLabel ? (
            <div className="flex items-center gap-1">
              {formatRowLabel ? <div className="w-8 shrink-0" /> : null}
              {Array.from({ length: cols }, (_, col) => (
                <span
                  key={col}
                  style={{ width: CELL_SIZE }}
                  className="shrink-0 text-center font-mono text-2xs text-muted-foreground"
                >
                  {col % COLUMN_LABEL_STRIDE === 0 ? formatColLabel(col) : ''}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {legendLabels ? (
        <div className="flex items-center justify-end gap-2 pt-1">
          <span className="text-2xs text-muted-foreground">{legendLabels.low}</span>
          <span className="h-2 w-16 rounded-full bg-pnl-profit opacity-40" />
          <span className="h-2 w-16 rounded-full bg-pnl-profit" />
          <span className="text-2xs text-muted-foreground">{legendLabels.high}</span>
        </div>
      ) : null}
    </div>
  );
}
