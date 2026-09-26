import { getCachedFormatter, getLocalTimeParts } from './localTimeCache';

const TRADING_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ROLLOVER_TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

declare const tradingDayBrand: unique symbol;

/**
 * Jour de trading, chaîne `YYYY-MM-DD` (calendrier local du compte, pas UTC).
 * Correspond à la colonne `trades.trading_day` / `daily_stats.trading_day`
 * (DATA_MODEL). Brandée pour ne pas être confondue avec une date ISO
 * quelconque : ne construire une valeur de ce type que via {@link tradingDayOf}
 * ou {@link toTradingDay}.
 */
export type TradingDay = string & { readonly [tradingDayBrand]: true };

/** Erreur typée levée quand une heure de bascule (`day_rollover_time`) est mal formée. */
export class InvalidRolloverTimeError extends Error {
  constructor(readonly receivedValue: string) {
    super(
      `Heure de bascule invalide : attendu "HH:mm" ou "HH:mm:ss", reçu ${JSON.stringify(receivedValue)}.`,
    );
    this.name = 'InvalidRolloverTimeError';
  }
}

/** Erreur typée levée quand un fuseau horaire (`accounts.timezone`) n'est pas un identifiant IANA connu. */
export class InvalidTimezoneError extends Error {
  constructor(readonly receivedValue: string) {
    super(
      `Fuseau horaire invalide : attendu un identifiant IANA (ex. "America/New_York"), reçu ${JSON.stringify(receivedValue)}.`,
    );
    this.name = 'InvalidTimezoneError';
  }
}

/**
 * Vérifie que `timezone` est un identifiant IANA reconnu par le moteur JS.
 * `Intl.DateTimeFormat` lève une `RangeError` de façon synchrone à la
 * construction si le fuseau est inconnu (spec ECMA-402) — c'est le seul
 * moyen fiable de le valider sans table de fuseaux en dur.
 *
 * Perf : la construction est mémoïsée par fuseau ({@link getCachedFormatter},
 * `packages/core/src/time/localTimeCache.ts`) — `tradingDayOf` est appelée
 * une fois par trade dans les boucles d'agrégation (calendrier, heatmap...)
 * pour un très petit nombre de fuseaux distincts (celui du compte). Un
 * fuseau invalide n'est jamais mis en cache comme valide : la construction
 * échoue à chaque appel (non mémoïsée en cas d'échec), donc cette fonction
 * lève systématiquement, y compris au deuxième appel et suivants.
 * @throws {InvalidTimezoneError} si `timezone` n'est pas reconnu
 */
function assertValidTimezone(timezone: string): void {
  try {
    getCachedFormatter(timezone);
  } catch {
    throw new InvalidTimezoneError(timezone);
  }
}

/**
 * Construit un {@link TradingDay} à partir d'une chaîne `YYYY-MM-DD` déjà
 * calculée (ex. valeur relue depuis `trades.trading_day`).
 * @throws {Error} si `value` n'est pas au format `YYYY-MM-DD`
 */
export function toTradingDay(value: string): TradingDay {
  if (!TRADING_DAY_PATTERN.test(value)) {
    throw new Error(`TradingDay invalide : attendu "YYYY-MM-DD", reçu ${JSON.stringify(value)}.`);
  }
  return value as TradingDay;
}

/** Nombre de secondes écoulées depuis minuit pour une heure `HH:mm[:ss]`. */
function parseRolloverTime(rolloverTime: string): number {
  const match = ROLLOVER_TIME_PATTERN.exec(rolloverTime);
  if (!match) {
    throw new InvalidRolloverTimeError(rolloverTime);
  }
  const [, hours, minutes, seconds] = match;
  const h = Number(hours);
  const m = Number(minutes);
  const s = seconds === undefined ? 0 : Number(seconds);
  if (h > 23 || m > 59 || s > 59) {
    throw new InvalidRolloverTimeError(rolloverTime);
  }
  return h * 3600 + m * 60 + s;
}

/** Composants de date/heure locaux (calendrier civil, pas de fuseau). */
interface LocalDateTimeParts {
  year: number;
  month: number; // 1-12
  day: number;
  secondsSinceMidnight: number;
}

/**
 * Décompose un instant UTC en date/heure civile dans `timezone`.
 *
 * Implémentation : {@link getLocalTimeParts} (`localTimeCache.ts`) formate
 * directement `utc` dans `timezone` (via `Intl.DateTimeFormat#formatToParts`,
 * la même primitive ECMA-402 qu'utilise `date-fns-tz` en interne, mémoïsée
 * par fuseau) sans passer par un `Date` intermédiaire dont on relirait les
 * champs `getUTC*` — cette dernière approche est fausse : elle consiste à
 * décaler l'horodatage UTC d'un offset calculé *pour cet instant*, puis à
 * relire l'heure obtenue comme si c'était l'heure locale, ce qui suppose que
 * l'offset est constant entre l'instant UTC et l'instant "décalé". Cette
 * hypothèse casse pendant les |offset| heures qui suivent chaque changement
 * d'heure (le décalage recalculé à l'instant décalé diffère de celui de
 * l'instant d'origine). En formatant directement l'instant UTC dans le
 * fuseau cible, `formatToParts` n'exprime jamais cette hypothèse : le
 * résultat est correct y compris pendant les changements d'heure (voir les
 * tests golden DST).
 */
function toLocalDateTimeParts(utc: Date, timezone: string): LocalDateTimeParts {
  const { year, month, day, hour, minute, second } = getLocalTimeParts(utc, timezone);
  return {
    year,
    month,
    day,
    secondsSinceMidnight: hour * 3600 + minute * 60 + second,
  };
}

function formatTradingDay(year: number, month: number, day: number): TradingDay {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}` as TradingDay;
}

/**
 * Calcule le jour de trading d'un horodatage UTC pour un compte donné.
 *
 * Formule : on prend la date civile de `utc` dans `timezone`. Si
 * `rolloverTime` n'est pas minuit (`00:00:00`) et que l'heure locale est
 * supérieure ou égale à `rolloverTime`, le jour de trading est cette date
 * civile **+ 1 jour** (la session qui commence à l'heure de bascule
 * appartient au jour suivant, ex. session Globex 17:00 New York → jour du
 * lendemain). Sinon (ou si `rolloverTime` vaut minuit, cas "aucune
 * bascule" — ARCHITECTURE §1.2, "minuit local pour les actions"), le jour
 * de trading est la date civile elle-même.
 *
 * @param utc horodatage UTC de l'exécution/trade (`timestamptz`)
 * @param timezone fuseau IANA du compte (`accounts.timezone`), ex. `"America/New_York"`
 * @param rolloverTime heure de bascule locale `"HH:mm"` ou `"HH:mm:ss"` (`accounts.day_rollover_time`)
 * @returns le {@link TradingDay} (`YYYY-MM-DD`, calendrier local, pas UTC)
 * @throws {InvalidTimezoneError} si `timezone` n'est pas un identifiant IANA reconnu
 * @throws {InvalidRolloverTimeError} si `rolloverTime` n'est pas au format `HH:mm`/`HH:mm:ss`
 */
export function tradingDayOf(utc: Date, timezone: string, rolloverTime: string): TradingDay {
  assertValidTimezone(timezone);
  const rolloverSeconds = parseRolloverTime(rolloverTime);
  const local = toLocalDateTimeParts(utc, timezone);

  if (rolloverSeconds === 0 || local.secondsSinceMidnight < rolloverSeconds) {
    return formatTradingDay(local.year, local.month, local.day);
  }

  // Bascule : jour civil local + 1, via UTC pour profiter du report de mois/année.
  const shifted = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  return formatTradingDay(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}
