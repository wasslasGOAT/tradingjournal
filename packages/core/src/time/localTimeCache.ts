/**
 * Cache interne (non exporté depuis `@repo/core`) de `Intl.DateTimeFormat`
 * par fuseau IANA, et décomposition d'un instant UTC en composants civils
 * locaux (année/mois/jour/heure/minute/seconde) à partir de ce formateur.
 *
 * Contexte perf (profilage CPU du Calendrier web, changement de mois) :
 * `tradingDayOf`, `localWeekdayOf`, `computeHeatmap`, `aggregateByHourOfDay`
 * et `classifySession` décomposaient chacun l'instant UTC dans un fuseau via
 * `new Intl.DateTimeFormat(...)` (validation) et/ou `formatInTimeZone`
 * (`date-fns-tz`, qui reconstruit elle-même un `Intl.DateTimeFormat` à
 * chaque appel via `tzTokenizeDate`) — un par trade, dans des boucles
 * d'agrégation. Un même compte n'a qu'un seul fuseau (parfois deux ou trois
 * avec les fenêtres de session fixes de {@link classifySession}), donc le
 * formateur `Intl.DateTimeFormat` peut être construit une seule fois par
 * fuseau et réutilisé pour tous les instants suivants : `formatToParts` est
 * pur vis-à-vis de l'instant passé en argument, un même formateur produit
 * les bons composants civils pour n'importe quel instant, DST inclus (c'est
 * la même primitive ECMA-402 que celle utilisée en interne par
 * `date-fns-tz`).
 *
 * Ne remplace **pas** `formatInTimeZone` là où celui-ci compose avec une
 * locale `date-fns` (noms de mois/jours, `packages/core/format`) : ce module
 * ne décompose que des composants numériques (année, mois, jour, heure,
 * minute, seconde), jamais de libellé localisé.
 */

/** Composants civils locaux d'un instant, résolus dans un fuseau IANA. */
export interface LocalTimeParts {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number;
  readonly hour: number; // 0-23
  readonly minute: number;
  readonly second: number;
}

/**
 * Fuseaux déjà validés/construits, indexés par identifiant IANA. Une entrée
 * n'est ajoutée qu'après construction réussie de l'`Intl.DateTimeFormat`
 * correspondant : un fuseau invalide n'est **jamais** mis en cache comme
 * valide (il lève à chaque appel, voir {@link getCachedFormatter}).
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Construit (ou relit depuis le cache) l'`Intl.DateTimeFormat` numérique
 * pour `timezone`. `Intl.DateTimeFormat` lève une `RangeError` de façon
 * synchrone à la construction si le fuseau est inconnu (spec ECMA-402) :
 * c'est le mécanisme de validation, préservé à l'identique — seule la
 * construction réussie est mémoïsée.
 * @throws {RangeError} si `timezone` n'est pas un identifiant IANA reconnu
 */
export function getCachedFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timezone);
  if (cached) return cached;

  // Volontairement non catché ici : un fuseau invalide doit lever à chaque
  // appel (jamais mis en cache comme valide) — voir les appelants
  // (`assertValidTimezone` transforme cette erreur, les autres la laissent
  // remonter telle quelle, comme avant cette optimisation).
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23', // 0..23, jamais "24" (évite un cas particulier à minuit avec h24 sur certains moteurs)
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  formatterCache.set(timezone, formatter);
  return formatter;
}

/**
 * Décompose un instant UTC en composants civils locaux dans `timezone`
 * (année/mois/jour/heure/minute/seconde), via le formateur mémoïsé de
 * {@link getCachedFormatter}.
 * @throws {RangeError} si `timezone` n'est pas un identifiant IANA reconnu
 */
export function getLocalTimeParts(utc: Date, timezone: string): LocalTimeParts {
  const parts = getCachedFormatter(timezone).formatToParts(utc);
  let year = 0;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const part of parts) {
    switch (part.type) {
      case 'year':
        year = Number(part.value);
        break;
      case 'month':
        month = Number(part.value);
        break;
      case 'day':
        day = Number(part.value);
        break;
      case 'hour':
        // `hourCycle: 'h23'` garantit 0..23, mais certaines implémentations
        // ICU rendent malgré tout "24" pour minuit avec certaines options :
        // filet de sécurité pour rester équivalent à `formatInTimeZone`.
        hour = Number(part.value) % 24;
        break;
      case 'minute':
        minute = Number(part.value);
        break;
      case 'second':
        second = Number(part.value);
        break;
      default:
        break;
    }
  }
  return { year, month, day, hour, minute, second };
}
