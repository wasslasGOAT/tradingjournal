import { describe, expect, it } from 'vitest';

import { mergeLineSeries } from './mergeLineSeries';

describe('mergeLineSeries', () => {
  it('tableau vide -> aucune ligne', () => {
    expect(mergeLineSeries([])).toEqual([]);
  });

  it('une série -> une ligne par point, triée par x', () => {
    const rows = mergeLineSeries([
      {
        id: 'equity',
        points: [
          { x: 2, y: 20 },
          { x: 1, y: 10 },
        ],
      },
    ]);
    expect(rows).toEqual([
      { x: 1, equity: 10 },
      { x: 2, equity: 20 },
    ]);
  });

  it('plusieurs séries : union des x, trous en undefined', () => {
    const rows = mergeLineSeries([
      {
        id: 'a',
        points: [
          { x: 1, y: 1 },
          { x: 3, y: 3 },
        ],
      },
      {
        id: 'b',
        points: [{ x: 2, y: 200 }],
      },
    ]);
    expect(rows).toEqual([
      { x: 1, a: 1 },
      { x: 2, b: 200 },
      { x: 3, a: 3 },
    ]);
    expect(rows[0]).not.toHaveProperty('b');
  });
});
