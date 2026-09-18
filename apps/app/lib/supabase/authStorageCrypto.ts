import { gcm } from '@noble/ciphers/aes.js';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';
import { base64 } from '@scure/base';

/**
 * Chiffrement/déchiffrement authentifié AES-256-GCM, sans dépendance native
 * (T6, décision D5 ; correctif audit sécurité M0-S1).
 *
 * Réutilisés par `authStorage.native.ts` pour appliquer la méthode recommandée par
 * Supabase pour React Native/Expo (« LargeSecureStore ») : `expo-secure-store` est
 * limité à 2048 octets, trop petit pour une session complète (access + refresh
 * token, métadonnées). La session est donc chiffrée et stockée dans AsyncStorage
 * (taille non limitée), tandis que seule la clé de chiffrement — 32 octets, donc
 * bien sous la limite — est stockée dans SecureStore (Keychain iOS / Keystore
 * Android).
 *
 * Pourquoi GCM et pas CTR (version précédente) : CTR ne fournit aucune
 * authentification. Or l'écriture est en deux étapes non atomiques (clé dans
 * SecureStore, texte chiffré dans AsyncStorage) : une interruption de l'app
 * entre les deux peut désynchroniser une clé neuve et un texte chiffré ancien
 * (ou l'inverse). Avec CTR, cette désynchronisation ne produit qu'un texte
 * corrompu, détecté seulement par hasard (JSON invalide, `catch` générique).
 * Avec GCM, le tag d'authentification (16 octets, inclus dans le texte chiffré)
 * fait échouer explicitement `decrypt()` dans ce cas, comme pour toute
 * altération du texte chiffré — l'appelant traite alors la session comme
 * illisible plutôt que de risquer de propager une valeur corrompue.
 *
 * Fonctions pures : la source d'aléa est injectée (`generateRandomBytes`), ce
 * qui les rend testables sous Node sans module natif ni polyfill
 * `crypto.getRandomValues` (Node >= 19 l'expose globalement).
 *
 * `@noble/ciphers/utils.js` encode/décode l'UTF-8 via `TextEncoder`/`TextDecoder`
 * globaux (pris en charge nativement par Hermes depuis React Native 0.72, donc
 * disponibles sans polyfill sur Expo SDK 57/RN 0.86 utilisés ici) — pas besoin
 * d'un encodeur UTF-8 fait main.
 */

const AES_KEY_BYTE_LENGTH = 32; // AES-256
const GCM_NONCE_BYTE_LENGTH = 12; // 96 bits — taille recommandée (NIST SP 800-38D) pour AES-GCM

/** Version du format stocké — permet de faire évoluer le format sans casser les sessions existantes. */
const FORMAT_VERSION = 'v1';

export type GenerateRandomBytes = (byteLength: number) => Uint8Array;

export interface EncryptedPayload {
  /** Clé de chiffrement AES-256 en base64 — à stocker dans SecureStore. */
  keyBase64: string;
  /**
   * Payload versionné `v1.<nonce base64>.<texte chiffré + tag GCM en base64>` —
   * à stocker dans AsyncStorage. Le nonce est aléatoire à chaque appel : avec
   * une clé neuve à chaque écriture (voir ci-dessus), il ne serait de toute
   * façon jamais réutilisé avec la même clé, mais un nonce aléatoire par écriture
   * est la pratique standard pour GCM, indépendamment de ce détail d'usage.
   */
  payload: string;
}

/** Chiffre `plainText` avec une nouvelle clé AES-256 et un nonce GCM, tous deux aléatoires. */
export function encryptForStorage(
  generateRandomBytes: GenerateRandomBytes,
  plainText: string,
): EncryptedPayload {
  const keyBytes = generateRandomBytes(AES_KEY_BYTE_LENGTH);
  const nonceBytes = generateRandomBytes(GCM_NONCE_BYTE_LENGTH);
  const cipherBytes = gcm(keyBytes, nonceBytes).encrypt(utf8ToBytes(plainText));

  return {
    keyBase64: base64.encode(keyBytes),
    payload: `${FORMAT_VERSION}.${base64.encode(nonceBytes)}.${base64.encode(cipherBytes)}`,
  };
}

/**
 * Déchiffre un `payload` produit par {@link encryptForStorage} avec la clé
 * `keyBase64` correspondante.
 *
 * Lève une exception si le format est inconnu, si la clé/le nonce/le texte
 * chiffré sont malformés, ou si l'authentification GCM échoue (mauvaise clé,
 * texte altéré, désynchronisation clé/valeur). L'appelant doit traiter toute
 * exception comme une session illisible : purger le stockage et considérer
 * l'utilisateur déconnecté (jamais journaliser la valeur, chiffrée ou non).
 */
export function decryptFromStorage(keyBase64: string, payload: string): string {
  const segments = payload.split('.');
  if (segments.length !== 3 || segments[0] !== FORMAT_VERSION) {
    throw new Error('authStorageCrypto: unknown payload format');
  }
  const [, nonceBase64, cipherBase64] = segments;

  const keyBytes = base64.decode(keyBase64);
  const nonceBytes = base64.decode(nonceBase64 ?? '');
  const cipherBytes = base64.decode(cipherBase64 ?? '');

  const plainBytes = gcm(keyBytes, nonceBytes).decrypt(cipherBytes);
  return bytesToUtf8(plainBytes);
}
