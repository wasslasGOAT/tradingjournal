import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useThemeMode } from '../theme/ThemeProvider';
import { useThemeStore } from '../theme/themeStore';
import { pnlColorSchemes, tabularNumsStyle, themes } from '../tokens';
import {
  computeMaxAbsValue,
  resolveHeatmapCellBorderColor,
  resolveHeatmapCellColor,
} from './heatmapColor';
import type { ChartActivePoint, ChartHeatmapCell } from './types';

export interface HeatmapGridProps {
  readonly testID?: string;
  readonly cells: readonly ChartHeatmapCell[];
  readonly rows: number;
  readonly cols: number;
  readonly formatRowLabel?: (row: number) => string;
  readonly formatColLabel?: (col: number) => string;
  readonly formatTooltipValue?: (point: ChartActivePoint) => string;
  readonly legendLabels?: { readonly low: string; readonly high: string };
  readonly onActivePointChange?: (point: ChartActivePoint | null) => void;
}

/** Taille de cellule (px). Volontairement < 44 pt (ADR-017 vise les cibles
 * d'action principales) : une grille heure × jour tient jusqu'à 24 colonnes,
 * qu'aucune largeur d'écran mobile ne peut afficher à 44 pt chacune (24 × 44
 * = 1 056 px). Convention alignée sur les heatmaps de calendrier usuelles
 * (cellule dense, pas un bouton) — grille dans un `ScrollView` horizontal
 * pour rester atteignable au doigt malgré la petite taille ; à valider
 * visuellement par l'utilisateur (point signalé dans le rapport de tâche).
 */
const CELL_SIZE = 28;

/** Une graduation sur trois pour ne pas surcharger l'axe des colonnes (ex. heures 0, 3, 6…). */
const COLUMN_LABEL_STRIDE = 3;

/**
 * Heatmap sans bibliothèque (M1-6, ADR-021) : grille de `View` colorées par
 * intensité (P&L profit/perte du schéma actif, {@link resolveHeatmapCellColor}).
 * Partagée telle quelle par `Chart.native.tsx`/`Chart.web.tsx` — pas de canvas,
 * juste des primitives RN, donc aucun rendu spécifique à une plateforme ici.
 * Interaction : `Pressable` (toucher natif / clic web) marque la cellule
 * active.
 */
export function HeatmapGrid({
  testID,
  cells,
  rows,
  cols,
  formatRowLabel,
  formatColLabel,
  formatTooltipValue,
  legendLabels,
  onActivePointChange,
}: HeatmapGridProps) {
  const mode = useThemeMode();
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
    // `y` porte la valeur de la cellule (convention `ChartActivePoint` : `y` est
    // toujours la grandeur affichée, comme pour les autres types de `Chart`) ;
    // la ligne (jour de semaine) n'a pas sa place dans `{x,y}` (déjà `col`/`row`
    // de la grille) — passée à part dans `seriesId`.
    onActivePointChange?.(next === null ? null : { x: col, y: value, seriesId: `${row}` });
  };

  return (
    <View testID={testID} className="gap-xs">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="gap-xs">
          {Array.from({ length: rows }, (_, row) => (
            <View key={row} className="flex-row items-center gap-xs">
              {formatRowLabel ? (
                <Text
                  style={[tabularNumsStyle, { width: 32 }]}
                  className="font-sans text-2xs text-textMuted"
                  numberOfLines={1}
                >
                  {formatRowLabel(row)}
                </Text>
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
                  <Pressable
                    key={key}
                    testID={testID ? `${testID}-cell-${row}-${col}` : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={`${rowLabel} ${columnLabel} ${label}`}
                    onPress={cell ? () => handlePress(row, col, value) : undefined}
                    disabled={!cell}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: resolveHeatmapCellColor(value, maxAbsValue, pnl),
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isActive ? colors.accent : resolveHeatmapCellBorderColor(colors),
                      borderRadius: 4,
                    }}
                  />
                );
              })}
            </View>
          ))}
          {formatColLabel ? (
            <View className="flex-row items-center gap-xs">
              {formatRowLabel ? <View style={{ width: 32 }} /> : null}
              {Array.from({ length: cols }, (_, col) => (
                <Text
                  key={col}
                  style={{ width: CELL_SIZE }}
                  className="text-center font-sans text-2xs text-textMuted"
                  numberOfLines={1}
                >
                  {col % COLUMN_LABEL_STRIDE === 0 ? formatColLabel(col) : ''}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
      {legendLabels ? (
        <View className="flex-row items-center justify-end gap-xs pt-xs">
          <Text className="font-sans text-2xs text-textMuted">{legendLabels.low}</Text>
          <View className="h-2 w-16 rounded-full bg-pnlProfit opacity-40" />
          <View className="h-2 w-16 rounded-full bg-pnlProfit" />
          <Text className="font-sans text-2xs text-textMuted">{legendLabels.high}</Text>
        </View>
      ) : null}
    </View>
  );
}
