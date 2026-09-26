/**
 * Types de `VirtualizedList` (M1-5, ADR-017 : « listes virtualisées FlashList
 * au-delà de 50 éléments »). Une liste plate est modélisée comme une seule
 * section sans `title` (pas d'en-tête rendu) — évite deux API séparées pour
 * « liste » et « liste à sections ».
 */
export interface ListSection<TItem> {
  readonly id: string;
  /** Titre de section (omis -> pas d'en-tête pour cette section, ex. liste plate à une seule section). */
  readonly title?: string;
  readonly data: readonly TItem[];
}

/** Ligne aplatie (M1-5) — une section devient un en-tête suivi de ses lignes, consommé tel quel par `FlashList`. */
export type FlattenedListRow<TItem> =
  | { readonly kind: 'header'; readonly key: string; readonly title: string }
  | { readonly kind: 'item'; readonly key: string; readonly item: TItem; readonly index: number };
