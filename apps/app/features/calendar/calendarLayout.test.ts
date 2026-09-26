import { describe, expect, it } from 'vitest';

import { NARROW_CALENDAR_BREAKPOINT, isNarrowCalendarLayout } from './calendarLayout';

describe('isNarrowCalendarLayout', () => {
  it('étroit sous le seuil (ex. iPhone SE, 320 px)', () => {
    expect(isNarrowCalendarLayout(320)).toBe(true);
  });

  it('large à partir du seuil (limite incluse)', () => {
    expect(isNarrowCalendarLayout(NARROW_CALENDAR_BREAKPOINT)).toBe(false);
    expect(isNarrowCalendarLayout(375)).toBe(false);
    expect(isNarrowCalendarLayout(430)).toBe(false);
  });
});
