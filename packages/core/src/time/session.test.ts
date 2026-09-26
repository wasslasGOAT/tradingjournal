import { describe, expect, it } from 'vitest';

import { classifySession } from './session';

describe('classifySession', () => {
  it('classe un instant pendant la fenêtre asiatique (Tokyo) seule', () => {
    // 2026-03-15T02:00Z = 11:00 JST (UTC+9, pas de DST au Japon) -> dans [09:00, 18:00).
    // Londres (02:00 GMT) et New York (21:00 EST la veille) fermés à cet instant.
    expect(classifySession(new Date('2026-03-15T02:00:00Z'))).toBe('asia');
  });

  it('classe un instant pendant la fenêtre de Londres uniquement (hiver, GMT)', () => {
    // 2026-01-15T09:30Z = 09:30 GMT (hiver, UTC+0) -> dans [08:00, 17:00).
    // New York (04:30 EST) fermé ; Tokyo (18:30 JST) fermé (fenêtre [09:00,18:00) exclut 18:30).
    expect(classifySession(new Date('2026-01-15T09:30:00Z'))).toBe('london');
  });

  it('classe un instant pendant la fenêtre de New York uniquement (hiver, EST)', () => {
    // 2026-01-15T20:00Z = 15:00 EST (hiver, UTC-5) -> dans [08:00, 17:00).
    // Londres fermé (20:00 GMT). Tokyo (05:00 JST le lendemain) fermé (avant 09:00).
    expect(classifySession(new Date('2026-01-15T20:00:00Z'))).toBe('new_york');
  });

  it('classe le chevauchement Londres/New York', () => {
    // 2026-01-15T14:00Z = 14:00 GMT (Londres, dans sa fenêtre) = 09:00 EST (New York, dans sa
    // fenêtre) -> les deux ouvertes simultanément. Tokyo (23:00 JST) fermé.
    expect(classifySession(new Date('2026-01-15T14:00:00Z'))).toBe('overlap');
  });

  it("classe 'other' quand aucune des trois places n'est ouverte", () => {
    // 2026-01-15T23:00Z = 23:00 GMT (Londres fermé), 18:00 EST (New York fermé, borne exclue),
    // 08:00 JST le lendemain (Tokyo fermé, avant l'ouverture 09:00).
    expect(classifySession(new Date('2026-01-15T23:00:00Z'))).toBe('other');
  });

  it('borne incluse juste avant la fermeture de New York, exclue pile à la fermeture', () => {
    // New York hiver (EST, UTC-5) ferme à 17:00 local = 22:00Z. Londres et Tokyo fermés aux deux
    // instants testés (aucune ambiguïté de chevauchement sur cette borne).
    expect(classifySession(new Date('2026-01-15T21:59:59Z'))).toBe('new_york'); // 16:59:59 EST, incluse
    expect(classifySession(new Date('2026-01-15T22:00:00Z'))).toBe('other'); // 17:00:00 EST, exclue
  });

  describe('changements d’heure (DST)', () => {
    it("passage à l'heure d'été en Europe (29 mars 2026, Londres) change la classification à heure UTC fixe", () => {
      // Instant choisi dans la zone de chevauchement Londres/New York en heure d'hiver (16:30Z),
      // hors de la fenêtre asiatique (Tokyo fermé aux deux dates, 01:30 JST le lendemain).
      // Veille du passage (28 mars, Londres encore GMT UTC+0) : 16:30Z = 16:30 GMT (Londres ouvert,
      // dans [08:00,17:00)) et 12:30 EDT (New York déjà à l'heure d'été US depuis le 8 mars,
      // ouvert) -> chevauchement.
      expect(classifySession(new Date('2026-03-28T16:30:00Z'))).toBe('overlap');
      // Le passage à l'heure d'été UE a lieu le 2026-03-29 à 01:00Z (01:00 GMT -> 02:00 BST).
      // Même heure UTC le lendemain, après le passage : 16:30Z = 17:30 BST (UTC+1) -> Londres a
      // fermé plus tôt en UTC (sa fenêtre locale [08:00,17:00) se traduit maintenant par
      // [07:00,16:00) UTC) -> Londres fermé. New York (12:30 EDT) reste seule ouverte.
      expect(classifySession(new Date('2026-03-29T16:30:00Z'))).toBe('new_york');
    });

    it("passage à l'heure d'été aux États-Unis (8 mars 2026, New York) change la classification à heure UTC fixe", () => {
      // Veille du passage (7 mars, encore EST UTC-5) : 12:30Z = 07:30 EST, avant l'ouverture de
      // New York (08:00). Londres (GMT, DST UE pas encore commencée) : 12:30 GMT -> ouvert seul.
      expect(classifySession(new Date('2026-03-07T12:30:00Z'))).toBe('london');
      // Le passage à l'heure d'été US a lieu le 2026-03-08 à 07:00Z (02:00 EST -> 03:00 EDT).
      // Même heure UTC, après le passage : 12:30Z = 08:30 EDT (UTC-4) -> New York ouvert ;
      // Londres toujours GMT (12:30 GMT) -> ouvert aussi -> chevauchement.
      expect(classifySession(new Date('2026-03-08T12:30:00Z'))).toBe('overlap');
    });
  });
});
