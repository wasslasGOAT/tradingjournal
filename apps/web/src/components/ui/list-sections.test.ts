import { describe, expect, it } from 'vitest';

import { buildSectionedRows, countItems } from './list-sections';

const keyExtractor = (item: string, index: number) => `${item}-${index}`;

describe('buildSectionedRows', () => {
  it('sections vides -> aucune ligne', () => {
    expect(buildSectionedRows([], keyExtractor)).toEqual({ rows: [], stickyHeaderIndices: [] });
  });

  it('section sans titre -> pas de ligne d’en-tête (liste plate)', () => {
    const { rows, stickyHeaderIndices } = buildSectionedRows(
      [{ id: 'flat', data: ['a', 'b'] }],
      keyExtractor,
    );
    expect(rows).toEqual([
      { kind: 'item', key: 'a-0', item: 'a', index: 0 },
      { kind: 'item', key: 'b-1', item: 'b', index: 1 },
    ]);
    expect(stickyHeaderIndices).toEqual([]);
  });

  it('une section titrée -> une ligne d’en-tête suivie de ses items', () => {
    const { rows, stickyHeaderIndices } = buildSectionedRows(
      [{ id: 'mar', title: 'Mars 2026', data: ['a'] }],
      keyExtractor,
    );
    expect(rows).toEqual([
      { kind: 'header', key: 'section-mar', title: 'Mars 2026' },
      { kind: 'item', key: 'a-0', item: 'a', index: 0 },
    ]);
    expect(stickyHeaderIndices).toEqual([0]);
  });

  it('plusieurs sections : les index d’en-tête suivent le décalage cumulé', () => {
    const { rows, stickyHeaderIndices } = buildSectionedRows(
      [
        { id: 's1', title: 'Section 1', data: ['a', 'b'] },
        { id: 's2', title: 'Section 2', data: ['c'] },
      ],
      keyExtractor,
    );
    expect(rows.map((r) => r.kind)).toEqual(['header', 'item', 'item', 'header', 'item']);
    expect(stickyHeaderIndices).toEqual([0, 3]);
  });

  it('section vide (data: []) titrée : l’en-tête est quand même produit', () => {
    const { rows } = buildSectionedRows([{ id: 'empty', title: 'Vide', data: [] }], keyExtractor);
    expect(rows).toEqual([{ kind: 'header', key: 'section-empty', title: 'Vide' }]);
  });
});

describe('countItems', () => {
  it('0 pour aucune section', () => {
    expect(countItems([])).toBe(0);
  });

  it('somme des items de toutes les sections, en-têtes exclus', () => {
    expect(
      countItems([
        { id: 's1', title: 'A', data: [1, 2, 3] },
        { id: 's2', data: [4] },
      ]),
    ).toBe(4);
  });
});
