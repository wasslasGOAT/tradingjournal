import { describe, expect, it } from 'vitest';

import { accountFormSchema, dayRolloverTime, timezoneName } from './account';

const valid = {
  name: 'Prop Challenge 200k',
  kind: 'prop_challenge' as const,
  currency: 'USD',
  startingBalance: '200000',
  startingDate: '2026-03-01',
  timezone: 'Europe/Paris',
  dayRolloverTime: '00:00',
  groupingMethod: 'fifo' as const,
};

describe('accountFormSchema', () => {
  it('accepte un compte valide et applique isArchived: false par défaut', () => {
    const result = accountFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.isArchived).toBe(false);
  });

  it('rejette un nom vide', () => {
    expect(accountFormSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
  });

  it('rejette un type de compte inconnu', () => {
    expect(accountFormSchema.safeParse({ ...valid, kind: 'hedge_fund' }).success).toBe(false);
  });

  it('rejette une méthode de regroupement inconnue', () => {
    expect(accountFormSchema.safeParse({ ...valid, groupingMethod: 'lifo' }).success).toBe(false);
  });

  it('rejette une devise non ISO 4217', () => {
    expect(accountFormSchema.safeParse({ ...valid, currency: 'us' }).success).toBe(false);
  });

  it('accepte les champs optionnels (broker, platform, externalAccountId)', () => {
    const result = accountFormSchema.safeParse({ ...valid, broker: 'IG', platform: 'MT5', externalAccountId: 'ACC-1' });
    expect(result.success).toBe(true);
  });
});

describe('dayRolloverTime', () => {
  it('accepte HH:mm et HH:mm:ss', () => {
    expect(dayRolloverTime.safeParse('00:00').success).toBe(true);
    expect(dayRolloverTime.safeParse('23:59:59').success).toBe(true);
  });

  it('rejette une heure invalide', () => {
    expect(dayRolloverTime.safeParse('24:00').success).toBe(false);
    expect(dayRolloverTime.safeParse('9:00').success).toBe(false);
    expect(dayRolloverTime.safeParse('00:60').success).toBe(false);
  });
});

describe('timezoneName', () => {
  it('accepte un identifiant IANA ou UTC', () => {
    expect(timezoneName.safeParse('Europe/Paris').success).toBe(true);
    expect(timezoneName.safeParse('America/New_York').success).toBe(true);
    expect(timezoneName.safeParse('UTC').success).toBe(true);
  });

  it('rejette une chaîne sans /', () => {
    expect(timezoneName.safeParse('Paris').success).toBe(false);
  });
});
