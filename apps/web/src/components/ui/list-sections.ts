/**
 * Types + logique pure de `VirtualizedList` (W-4, copie de
 * `packages/ui/src/list/types.ts` + `listSections.ts`, gelé) : aplatit des
 * sections en une seule liste `{header|item}` pour `@tanstack/react-virtual`.
 * Une liste plate est modélisée comme une seule section sans `title` (pas
 * d'en-tête rendu) — évite deux API séparées pour « liste » et « liste à
 * sections ».
 */
export interface ListSection<TItem> {
  readonly id: string;
  /** Titre de section (omis -> pas d'en-tête pour cette section). */
  readonly title?: string;
  readonly data: readonly TItem[];
}

export type FlattenedListRow<TItem> =
  | { readonly kind: 'header'; readonly key: string; readonly title: string }
  | { readonly kind: 'item'; readonly key: string; readonly item: TItem; readonly index: number };

export interface FlattenedSections<TItem> {
  readonly rows: readonly FlattenedListRow<TItem>[];
  /** Index (dans `rows`) de chaque en-tête — pour un positionnement "sticky" éventuel. */
  readonly stickyHeaderIndices: readonly number[];
}

/**
 * Aplatit des sections en une seule liste `{header|item}`. `keyExtractor` :
 * identité stable d'un item pour la clé de virtualisation (jamais l'index
 * seul — resterait stable même si des sections vides ou d'autres items
 * changent en amont).
 */
export function buildSectionedRows<TItem>(
  sections: readonly ListSection<TItem>[],
  keyExtractor: (item: TItem, index: number) => string,
): FlattenedSections<TItem> {
  const rows: FlattenedListRow<TItem>[] = [];
  const stickyHeaderIndices: number[] = [];

  for (const section of sections) {
    if (section.title !== undefined) {
      stickyHeaderIndices.push(rows.length);
      rows.push({ kind: 'header', key: `section-${section.id}`, title: section.title });
    }
    section.data.forEach((item, index) => {
      rows.push({ kind: 'item', key: keyExtractor(item, index), item, index });
    });
  }

  return { rows, stickyHeaderIndices };
}

/** Nombre total d'items (toutes sections confondues, en-têtes exclus) — détermine l'état vide. */
export function countItems<TItem>(sections: readonly ListSection<TItem>[]): number {
  return sections.reduce((total, section) => total + section.data.length, 0);
}
