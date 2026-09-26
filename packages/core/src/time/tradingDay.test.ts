import { describe, expect, it } from 'vitest';

import {
  InvalidRolloverTimeError,
  InvalidTimezoneError,
  isTradingDayInMonth,
  tradingDayOf,
  tradingDayParts,
  toTradingDay,
} from './tradingDay';

describe('tradingDayOf', () => {
  it("bascule au jour suivant quand l'heure locale dépasse la bascule (cas de référence)", () => {
    // 2026-03-30T21:30Z = 17:30 heure de New York (EDT, UTC-4) ; bascule 17:00 -> jour suivant.
    expect(tradingDayOf(new Date('2026-03-30T21:30:00Z'), 'America/New_York', '17:00')).toBe(
      '2026-03-31',
    );
  });

  it("reste sur le même jour civil quand l'heure locale est avant la bascule", () => {
    // Avant le passage à l'heure d'été US (EST, UTC-5) : 21:30Z = 16:30 local, avant 17:00.
    expect(tradingDayOf(new Date('2026-03-07T21:30:00Z'), 'America/New_York', '17:00')).toBe(
      '2026-03-07',
    );
  });

  it("applique le bon décalage juste après le passage à l'heure d'été (DST)", () => {
    // Après le passage à l'heure d'été US (EDT, UTC-4) : 21:30Z = 17:30 local, après 17:00.
    expect(tradingDayOf(new Date('2026-03-09T21:30:00Z'), 'America/New_York', '17:00')).toBe(
      '2026-03-10',
    );
  });

  it("bascule dès que l'heure locale est exactement égale à la bascule (borne incluse)", () => {
    // 21:00Z = 17:00:00 local exactement (EDT, UTC-4).
    expect(tradingDayOf(new Date('2026-03-30T21:00:00Z'), 'America/New_York', '17:00')).toBe(
      '2026-03-31',
    );
  });

  it("n'applique aucun décalage quand la bascule est minuit (identité, ex. actions)", () => {
    // Europe/Paris hiver (UTC+1) : 2026-01-15T23:30Z -> 2026-01-16T00:30 local.
    expect(tradingDayOf(new Date('2026-01-15T23:30:00Z'), 'Europe/Paris', '00:00')).toBe(
      '2026-01-16',
    );
  });

  it('accepte une heure de bascule au format HH:mm:ss', () => {
    expect(tradingDayOf(new Date('2026-03-30T21:30:00Z'), 'America/New_York', '17:00:00')).toBe(
      '2026-03-31',
    );
  });

  it("fait passer à l'année suivante quand la bascule tombe le 31 décembre", () => {
    // Europe/Paris hiver (UTC+1) : 2025-12-31T21:30Z -> 2025-12-31T22:30 local, bascule 22:00.
    expect(tradingDayOf(new Date('2025-12-31T21:30:00Z'), 'Europe/Paris', '22:00')).toBe(
      '2026-01-01',
    );
  });

  it("gère le passage à l'heure d'été en Europe (Paris, UTC+2 en été)", () => {
    // 2026-07-15T22:30Z -> 2026-07-16T00:30 local (été, UTC+2), bascule minuit -> identité.
    expect(tradingDayOf(new Date('2026-07-15T22:30:00Z'), 'Europe/Paris', '00:00')).toBe(
      '2026-07-16',
    );
  });

  it('rejette une heure de bascule mal formée', () => {
    expect(() =>
      tradingDayOf(new Date('2026-03-30T21:30:00Z'), 'America/New_York', '25:00'),
    ).toThrow(InvalidRolloverTimeError);
    expect(() => tradingDayOf(new Date('2026-03-30T21:30:00Z'), 'America/New_York', 'abc')).toThrow(
      InvalidRolloverTimeError,
    );
  });

  it('rejette un fuseau horaire inconnu (InvalidTimezoneError, pas "0NaN-NaN-NaN")', () => {
    expect(() => tradingDayOf(new Date('2026-03-30T21:30:00Z'), 'Not/AZone', '00:00')).toThrow(
      InvalidTimezoneError,
    );
    expect(() => tradingDayOf(new Date('2026-03-30T21:30:00Z'), '', '00:00')).toThrow(
      InvalidTimezoneError,
    );
  });

  it('rejette un fuseau horaire inconnu de façon répétée (la mémoïsation par fuseau ne met jamais un fuseau invalide en cache comme valide)', () => {
    expect(() =>
      tradingDayOf(new Date('2026-03-30T21:30:00Z'), 'Repeated/Invalid', '00:00'),
    ).toThrow(InvalidTimezoneError);
    // Deuxième appel avec le même fuseau invalide : doit lever à nouveau, pas retourner un résultat mis en cache par erreur.
    expect(() =>
      tradingDayOf(new Date('2026-03-31T10:00:00Z'), 'Repeated/Invalid', '00:00'),
    ).toThrow(InvalidTimezoneError);
  });

  it('un fuseau valide appelé juste après un fuseau invalide continue de fonctionner normalement (pas de pollution du cache)', () => {
    expect(() =>
      tradingDayOf(new Date('2026-03-30T21:30:00Z'), 'Another/Invalid', '00:00'),
    ).toThrow(InvalidTimezoneError);
    expect(tradingDayOf(new Date('2026-01-15T23:30:00Z'), 'Europe/Paris', '00:00')).toBe(
      '2026-01-16',
    );
  });

  describe('changements d’heure (DST) — tests golden', () => {
    // Tableau de référence (revue code-reviewer), identique quel que soit le TZ du process
    // d'exécution (TZ=UTC, TZ=Europe/Paris, TZ=Asia/Tokyo, TZ=America/New_York...).
    it('automne America/New_York : bascule 00:00, 04:30Z est 00:30 EDT -> même jour civil', () => {
      // DST US se termine le 2026-11-01 à 02:00 EDT (-> 01:00 EST) = 06:00Z.
      // 04:30Z est avant ce basculement : encore EDT (UTC-4) -> 00:30 local.
      expect(tradingDayOf(new Date('2026-11-01T04:30:00Z'), 'America/New_York', '00:00')).toBe(
        '2026-11-01',
      );
    });

    it('printemps America/New_York : bascule 02:00, 06:30Z est 01:30 EST -> même jour civil', () => {
      // DST US commence le 2026-03-08 à 02:00 EST (-> 03:00 EDT) = 07:00Z.
      // 06:30Z est avant ce basculement : encore EST (UTC-5) -> 01:30 local, avant la bascule 02:00.
      expect(tradingDayOf(new Date('2026-03-08T06:30:00Z'), 'America/New_York', '02:00')).toBe(
        '2026-03-08',
      );
    });

    it('automne Europe/Paris : bascule 03:00, 01:00Z (instant du recul CEST->CET) est 02:00 CET -> même jour civil', () => {
      // DST UE se termine le 2026-10-25 à 03:00 CEST (-> 02:00 CET) = 01:00Z.
      // À cet instant précis, le décalage appliqué est déjà CET (UTC+1) -> 02:00 local.
      expect(tradingDayOf(new Date('2026-10-25T01:00:00Z'), 'Europe/Paris', '03:00')).toBe(
        '2026-10-25',
      );
    });

    it("heure répétée d'automne : deux instants UTC distincts affichant la même heure locale donnent le même jour de trading", () => {
      // 2026-11-01 01:30 heure de New York existe deux fois : une première fois en EDT
      // (UTC-4, 05:30Z) puis une seconde fois en EST (UTC-5, 06:30Z) après le recul de l'horloge.
      const first = tradingDayOf(new Date('2026-11-01T05:30:00Z'), 'America/New_York', '01:00');
      const second = tradingDayOf(new Date('2026-11-01T06:30:00Z'), 'America/New_York', '01:00');
      expect(first).toBe('2026-11-02');
      expect(second).toBe('2026-11-02');
    });

    it("heure sautée du printemps : le saut d'horloge peut faire changer de jour de trading entre deux instants UTC très proches", () => {
      // 2026-03-08 : l'heure locale saute de 01:59:59 EST directement à 03:00:00 EDT (l'heure "02h" n'existe pas).
      // Avec une bascule à 02:30, ces deux instants (à 1 seconde d'écart en UTC) tombent de part et d'autre.
      const justBefore = tradingDayOf(
        new Date('2026-03-08T06:59:59Z'),
        'America/New_York',
        '02:30',
      );
      const justAfter = tradingDayOf(new Date('2026-03-08T07:00:00Z'), 'America/New_York', '02:30');
      expect(justBefore).toBe('2026-03-08'); // 01:59:59 EST, avant la bascule 02:30
      expect(justAfter).toBe('2026-03-09'); // 03:00:00 EDT, après la bascule 02:30 (l'heure "02h" est sautée)
    });
  });
});

describe('tradingDayOf — indépendance au fuseau de la machine hôte', () => {
  it('reste stable quel que soit `TZ` du process (voir aussi `pnpm test:tz`, TZ=Europe/Paris)', () => {
    // Même instant/compte, indépendamment du fuseau du process qui exécute le test.
    expect(tradingDayOf(new Date('2026-03-29T01:30:00Z'), 'UTC', '00:00')).toBe('2026-03-29');
    // EDT (UTC-4) : 01:30Z -> 2026-03-28T21:30 local, après la bascule 17:00 -> jour suivant.
    expect(tradingDayOf(new Date('2026-03-29T01:30:00Z'), 'America/New_York', '17:00')).toBe(
      '2026-03-29',
    );
  });
});

describe('toTradingDay', () => {
  it('accepte une chaîne YYYY-MM-DD', () => {
    expect(toTradingDay('2026-03-31')).toBe('2026-03-31');
  });

  it('rejette un format invalide', () => {
    expect(() => toTradingDay('31/03/2026')).toThrow();
    expect(() => toTradingDay('2026-03-31T00:00:00Z')).toThrow();
  });
});

describe('tradingDayParts', () => {
  it('découpe un TradingDay en composants calendaires', () => {
    expect(tradingDayParts(toTradingDay('2026-03-09'))).toEqual({ year: 2026, month: 3, day: 9 });
  });

  it('gère les mois/jours à deux chiffres', () => {
    expect(tradingDayParts(toTradingDay('2026-12-31'))).toEqual({
      year: 2026,
      month: 12,
      day: 31,
    });
  });
});

describe('isTradingDayInMonth', () => {
  it('vrai si le jour appartient au mois civil demandé', () => {
    expect(isTradingDayInMonth(toTradingDay('2026-03-15'), 2026, 3)).toBe(true);
  });

  it('faux si le mois diffère', () => {
    expect(isTradingDayInMonth(toTradingDay('2026-03-15'), 2026, 4)).toBe(false);
  });

  it("faux si l'année diffère (même mois civil)", () => {
    expect(isTradingDayInMonth(toTradingDay('2026-03-15'), 2027, 3)).toBe(false);
  });

  it('vrai en bordure de mois (premier et dernier jour)', () => {
    expect(isTradingDayInMonth(toTradingDay('2026-03-01'), 2026, 3)).toBe(true);
    expect(isTradingDayInMonth(toTradingDay('2026-03-31'), 2026, 3)).toBe(true);
  });
});
