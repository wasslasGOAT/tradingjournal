import type { FlattenedListRow, ListSection } from './types';

export interface FlattenedSections<TItem> {
  readonly rows: readonly FlattenedListRow<TItem>[];
  /** Index (dans `rows`) de chaque en-tête — pour `stickyHeaderIndices` de `FlashList`. */
  readonly stickyHeaderIndices: readonly number[];
}

/**
 * Aplatit des sections en une seule liste `{header|item}` (M1-5) — logique
 * pure, testée sans rendu. Une section sans `title` ne produit pas de ligne
 * d'en-tête (liste plate). `keyExtractor` : identité stable d'un item pour la
 * clé `FlashList` (jamais l'index seul — resterait stable même si des
 * sections vides ou d'autres items changent en amont).
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
