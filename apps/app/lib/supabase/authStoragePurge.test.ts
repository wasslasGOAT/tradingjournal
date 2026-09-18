import { describe, expect, it } from 'vitest';

import { shouldPurgeStaleCiphertext } from './authStoragePurge';

describe('shouldPurgeStaleCiphertext', () => {
  it('autorise la purge quand le texte chiffré est inchangé (session réellement illisible)', () => {
    expect(shouldPurgeStaleCiphertext('v1.nonce.cipher', 'v1.nonce.cipher')).toBe(true);
  });

  it('refuse la purge quand un `setItem` concurrent a écrit un nouveau texte chiffré (course avec un rafraîchissement de jeton)', () => {
    expect(shouldPurgeStaleCiphertext('v1.old-nonce.old-cipher', 'v1.new-nonce.new-cipher')).toBe(
      false,
    );
  });

  it('refuse la purge quand la valeur a été supprimée entre-temps (`removeItem` concurrent)', () => {
    expect(shouldPurgeStaleCiphertext('v1.nonce.cipher', null)).toBe(false);
  });
});
