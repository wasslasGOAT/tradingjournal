import { describe, expect, it } from 'vitest';

import { dataQueryKeys } from './queryKeys';

describe('dataQueryKeys.calendarMonth', () => {
  it('inclut `weekStartsOn` dans la clé (revue W-10)', () => {
    const key = dataQueryKeys.calendarMonth('acc-demo-main', 2026, 9, 1);
    expect(key).toEqual(['calendar', 'acc-demo-main', 2026, 9, 1]);
  });

  it('deux `weekStartsOn` différents produisent des clés différentes (FR vs EN, ADR-017)', () => {
    const fr = dataQueryKeys.calendarMonth('acc-demo-main', 2026, 9, 1);
    const en = dataQueryKeys.calendarMonth('acc-demo-main', 2026, 9, 0);
    expect(fr).not.toEqual(en);
  });
});
