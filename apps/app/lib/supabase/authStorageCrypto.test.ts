import { describe, expect, it } from 'vitest';

import { decryptFromStorage, encryptForStorage } from './authStorageCrypto';
import type { GenerateRandomBytes } from './authStorageCrypto';

/** Générateur déterministe (tests reproductibles) : jamais utilisé en dehors des tests. */
const deterministicGenerator: GenerateRandomBytes = (byteLength) =>
  Uint8Array.from({ length: byteLength }, (_, index) => index % 256);

/** Générateur cryptographique réel (Node >= 19 expose `crypto.getRandomValues` globalement). */
const realGenerator: GenerateRandomBytes = (byteLength) =>
  crypto.getRandomValues(new Uint8Array(byteLength));

describe('authStorageCrypto', () => {
  it.each([
    ['une chaîne simple', 'hello world'],
    ['une chaîne vide', ''],
    ['un JSON de session', JSON.stringify({ access_token: 'abc.def.ghi', refresh_token: 'jkl' })],
    ['des caractères Unicode', 'Chargement… 你好'],
    ['un emoji (plan astral, > 1 unité UTF-16)', '🚀🔥👨‍👩‍👧‍👦'],
    ['un texte long (> 2048 octets)', 'x'.repeat(4000)],
  ])('déchiffre ce qui a été chiffré : %s', (_label, plainText) => {
    const { keyBase64, payload } = encryptForStorage(deterministicGenerator, plainText);

    expect(decryptFromStorage(keyBase64, payload)).toBe(plainText);
  });

  it('produit une clé et un nonce différents à chaque appel avec un générateur réel', () => {
    const first = encryptForStorage(realGenerator, 'session-1');
    const second = encryptForStorage(realGenerator, 'session-1');

    expect(first.keyBase64).not.toBe(second.keyBase64);
    expect(first.payload).not.toBe(second.payload);
    expect(decryptFromStorage(first.keyBase64, first.payload)).toBe('session-1');
    expect(decryptFromStorage(second.keyBase64, second.payload)).toBe('session-1');
  });

  it('le payload est versionné (`v1.<nonce>.<texte chiffré>`)', () => {
    const { payload } = encryptForStorage(deterministicGenerator, 'value');
    const segments = payload.split('.');

    expect(segments).toHaveLength(3);
    expect(segments[0]).toBe('v1');
  });

  it('rejette une altération d’un seul octet du texte chiffré (authentification GCM)', () => {
    const { keyBase64, payload } = encryptForStorage(realGenerator, 'secret-session');
    const [version, nonceBase64, cipherBase64] = payload.split('.');
    const tamperedCipherBase64 =
      cipherBase64![0] === 'A' ? `B${cipherBase64!.slice(1)}` : `A${cipherBase64!.slice(1)}`;
    const tamperedPayload = `${version}.${nonceBase64}.${tamperedCipherBase64}`;

    expect(() => decryptFromStorage(keyBase64, tamperedPayload)).toThrow();
  });

  it('rejette une mauvaise clé (authentification GCM)', () => {
    const encrypted = encryptForStorage(deterministicGenerator, 'secret');
    const wrongKeyBase64 = encryptForStorage(
      (n) => Uint8Array.from({ length: n }, () => 0xff),
      'other',
    ).keyBase64;

    expect(() => decryptFromStorage(wrongKeyBase64, encrypted.payload)).toThrow();
  });

  it('rejette un format de payload inconnu', () => {
    const { keyBase64 } = encryptForStorage(deterministicGenerator, 'value');

    expect(() => decryptFromStorage(keyBase64, 'not-a-valid-payload')).toThrow();
    expect(() => decryptFromStorage(keyBase64, 'v2.abc.def')).toThrow();
    expect(() => decryptFromStorage(keyBase64, 'v1.only-one-segment')).toThrow();
  });

  it('la clé chiffrée est utilisable (32 octets AES-256 encodés en base64)', () => {
    const { keyBase64 } = encryptForStorage(deterministicGenerator, 'value');

    expect(Buffer.from(keyBase64, 'base64')).toHaveLength(32);
  });
});
