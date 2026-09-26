import { describe, expect, it } from 'vitest';

import { resolveSegmentedIndex } from './segmentedIndex';

const OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

describe('resolveSegmentedIndex', () => {
  it('retourne l’index de la valeur sélectionnée', () => {
    expect(resolveSegmentedIndex(OPTIONS, 'week')).toBe(1);
    expect(resolveSegmentedIndex(OPTIONS, 'month')).toBe(2);
  });

  it('retourne 0 si la valeur ne figure pas dans les options (garde-fou)', () => {
    expect(resolveSegmentedIndex(OPTIONS, 'year' as never)).toBe(0);
  });
});
