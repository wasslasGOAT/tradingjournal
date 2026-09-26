import { getLocalTimeParts } from './localTimeCache';

/**
 * Session de marché d'un instant UTC (DATA_MODEL `trades.session`).
 * `overlap` : au moins deux places sont ouvertes simultanément (ex. Londres
 * et New York en début d'après-midi Europe). `other` : aucune des trois
 * places de référence n'est ouverte à cet instant.
 */
export type Session = 'asia' | 'london' | 'new_york' | 'overlap' | 'other';

/** Fenêtre horaire locale (heure civile de la place) définissant une session. */
interface SessionWindow {
  readonly timezone: string;
  readonly session: Exclude<Session, 'overlap' | 'other'>;
  /** Secondes écoulées depuis minuit local (borne incluse). */
  readonly startSeconds: number;
  /** Secondes écoulées depuis minuit local (borne exclue). */
  readonly endSeconds: number;
}

/**
 * Fenêtres de référence des trois places (heures de marché forex usuelles,
 * volontairement larges — approximation MVP, ajustable plus tard sans
 * changer la signature). Fenêtre Asie alignée sur les heures d'ouverture
 * usuelles de la place de Tokyo (09:00–18:00 JST), qui correspond à la
 * convention forex courante « session asiatique 00:00–09:00 UTC » (le
 * Japon n'observe pas l'heure d'été, fenêtre UTC fixe). Londres et New York
 * observent chacune leur propre DST, gérée en décomposant l'instant UTC
 * dans le fuseau IANA de la place (même technique que {@link tradingDayOf})
 * plutôt qu'avec un décalage UTC fixe — c'est ce qui fait varier le résultat
 * d'un jour à l'autre autour des changements d'heure (tests golden DST).
 */
const SESSION_WINDOWS: readonly SessionWindow[] = [
  { timezone: 'Asia/Tokyo', session: 'asia', startSeconds: 9 * 3600, endSeconds: 18 * 3600 },
  { timezone: 'Europe/London', session: 'london', startSeconds: 8 * 3600, endSeconds: 17 * 3600 },
  {
    timezone: 'America/New_York',
    session: 'new_york',
    startSeconds: 8 * 3600,
    endSeconds: 17 * 3600,
  },
];

/**
 * Secondes écoulées depuis minuit dans `timezone`, pour l'instant UTC `utc`
 * — décomposition mémoïsée par fuseau (voir {@link getLocalTimeParts},
 * `localTimeCache.ts`) : `classifySession` teste jusqu'à trois fuseaux fixes
 * (Tokyo, Londres, New York) par instant, potentiellement pour chaque trade
 * d'une agrégation ; le formateur `Intl.DateTimeFormat` de chaque fuseau
 * n'est donc construit qu'une seule fois au total.
 */
function secondsSinceLocalMidnight(utc: Date, timezone: string): number {
  const { hour, minute, second } = getLocalTimeParts(utc, timezone);
  return hour * 3600 + minute * 60 + second;
}

function isWithinWindow(utc: Date, window: SessionWindow): boolean {
  const seconds = secondsSinceLocalMidnight(utc, window.timezone);
  return seconds >= window.startSeconds && seconds < window.endSeconds;
}

/**
 * Classe un instant UTC dans une {@link Session} de marché.
 *
 * Formule : pour chacune des trois places (Tokyo, Londres, New York), on
 * calcule l'heure locale de `utc` dans son fuseau IANA (gère nativement les
 * changements d'heure de chaque place, y compris les jours de bascule) puis
 * on teste l'appartenance à sa fenêtre d'ouverture. Résultat :
 * - 2 places ouvertes ou plus -> `'overlap'` ;
 * - exactement 1 place ouverte -> son nom (`'asia'` / `'london'` / `'new_york'`) ;
 * - aucune -> `'other'`.
 *
 * Pure : aucune dépendance au compte (la session de marché est globale, à
 * la différence du {@link TradingDay} qui dépend du fuseau du compte).
 *
 * @param utc horodatage UTC de l'exécution/trade
 */
export function classifySession(utc: Date): Session {
  const openWindows = SESSION_WINDOWS.filter((window) => isWithinWindow(utc, window));
  if (openWindows.length >= 2) return 'overlap';
  const [only] = openWindows;
  return only ? only.session : 'other';
}
