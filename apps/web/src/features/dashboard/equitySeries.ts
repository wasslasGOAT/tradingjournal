import type { DashboardEquityPoint } from "@/data/dashboard"
import type { ChartPoint } from "@/components/chart/types"

/**
 * Convertit les points d'equity (`Decimal`, `src/data/dashboard.ts`) en points
 * `Chart` (`number`, W-6) : un point par jour de la période, jamais moins —
 * régression W-6 (« courbe d'equity invisible ») : un filtrage/agrégation
 * accidentel qui ferait tomber la série à un seul point (ou moins que
 * `equityPoints.length`) doit être détecté par un test, pas découvert à
 * l'écran. Fonction pure, extraite du composant pour rester testable sans DOM.
 */
export function toEquitySeriesPoints(
  equityPoints: readonly DashboardEquityPoint[],
): readonly ChartPoint[] {
  return equityPoints.map((point, index) => ({ x: index, y: point.balance.toNumber() }))
}
