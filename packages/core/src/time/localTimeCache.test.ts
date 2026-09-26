import { describe, expect, it } from 'vitest';

import { getCachedFormatter, getLocalTimeParts } from './localTimeCache';

describe('getCachedFormatter', () => {
  it('renvoie la même instance de formateur pour deux appels avec le même fuseau (mémoïsation)', () => {
    const first = getCachedFormatter('Europe/Paris');
    const second = getCachedFormatter('Europe/Paris');
    expect(second).toBe(first);
  });

  it('renvoie des instances distinctes pour des fuseaux distincts', () => {
    const paris = getCachedFormatter('Europe/Paris');
    const tokyo = getCachedFormatter('Asia/Tokyo');
    expect(paris).not.toBe(tokyo);
  });

  it('lève une RangeError pour un fuseau inconnu, au premier appel', () => {
    expect(() => getCachedFormatter('Not/AZone')).toThrow(RangeError);
  });

  it('lève une RangeError pour un fuseau inconnu de façon répétée, sans jamais le mettre en cache comme valide (deuxième appel)', () => {
    expect(() => getCachedFormatter('Still/Invalid')).toThrow(RangeError);
    // Deuxième appel : doit lever à nouveau (pas de cache "silencieux" d'un échec de construction).
    expect(() => getCachedFormatter('Still/Invalid')).toThrow(RangeError);
  });

  it('un fuseau invalide ne pollue pas le cache pour un fuseau valide homonyme partiel', () => {
    expect(() => getCachedFormatter('Bogus/Zone')).toThrow(RangeError);
    // Un fuseau valide appelé juste après doit fonctionner normalement.
    expect(() => getCachedFormatter('Europe/London')).not.toThrow();
  });
});

describe('getLocalTimeParts', () => {
  it('décompose un instant UTC en composants civils locaux (cas simple, pas de DST)', () => {
    // 2026-03-15T02:00Z = 11:00 JST (UTC+9, pas de DST au Japon).
    const parts = getLocalTimeParts(new Date('2026-03-15T02:00:00Z'), 'Asia/Tokyo');
    expect(parts).toEqual({ year: 2026, month: 3, day: 15, hour: 11, minute: 0, second: 0 });
  });

  it('des appels répétés avec le même fuseau (formateur mémoïsé) donnent des résultats corrects et indépendants entre instants', () => {
    const before = getLocalTimeParts(new Date('2026-03-08T06:30:00Z'), 'America/New_York');
    const after = getLocalTimeParts(new Date('2026-03-08T07:00:00Z'), 'America/New_York');
    // DST US : bascule le 2026-03-08 à 07:00Z (02:00 EST -> 03:00 EDT).
    expect(before).toEqual({ year: 2026, month: 3, day: 8, hour: 1, minute: 30, second: 0 });
    expect(after).toEqual({ year: 2026, month: 3, day: 8, hour: 3, minute: 0, second: 0 });
  });

  it("gère le passage à l'heure d'été en Europe (Paris, recul d'automne CEST -> CET) via le formateur mémoïsé", () => {
    // DST UE se termine le 2026-10-25 à 03:00 CEST (-> 02:00 CET) = 01:00Z.
    const atShift = getLocalTimeParts(new Date('2026-10-25T01:00:00Z'), 'Europe/Paris');
    expect(atShift).toEqual({ year: 2026, month: 10, day: 25, hour: 2, minute: 0, second: 0 });
  });

  it('minuit local ne renvoie jamais hour: 24 (filet de sécurité hourCycle h23)', () => {
    const midnight = getLocalTimeParts(new Date('2026-01-15T00:00:00Z'), 'UTC');
    expect(midnight.hour).toBe(0);
  });

  it("indépendance au fuseau de la machine hôte : timeZone: 'UTC' explicite ignore `TZ` du process (voir aussi `pnpm test:tz`)", () => {
    // `Intl.DateTimeFormat` avec `timeZone` explicite ne retombe jamais sur le
    // fuseau du process (`TZ` d'environnement) : ce test doit donner le même
    // résultat quel que soit le `TZ` sous lequel Vitest tourne (CI, Windows
    // local sans `TZ`, ou `pnpm test:tz` avec `TZ=Europe/Paris`).
    const parts = getLocalTimeParts(new Date('2026-03-29T01:30:00Z'), 'UTC');
    expect(parts).toEqual({ year: 2026, month: 3, day: 29, hour: 1, minute: 30, second: 0 });
  });
});
