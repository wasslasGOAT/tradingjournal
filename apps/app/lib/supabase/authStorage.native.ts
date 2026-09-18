import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { decryptFromStorage, encryptForStorage } from './authStorageCrypto';
import { shouldPurgeStaleCiphertext } from './authStoragePurge';
import type { AuthStorage } from './authStorage.types';

/**
 * Session Supabase sur natif (iOS/Android), méthode « LargeSecureStore »
 * recommandée par Supabase pour React Native/Expo (T6, décision D5) :
 * - la session (peut dépasser la limite de 2048 octets de SecureStore) est
 *   chiffrée (AES-256-GCM, `authStorageCrypto.ts`) puis stockée dans AsyncStorage ;
 * - seule la clé de chiffrement (32 octets) est stockée dans SecureStore
 *   (Keychain iOS / Keystore Android via `expo-secure-store`).
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (correctif audit sécurité M0-S2) : exclut la
 * clé de chiffrement des sauvegardes iCloud/iTunes. Sans cette option, une
 * restauration de sauvegarde sur un autre appareil pourrait rendre la clé (et
 * donc, une fois la valeur AsyncStorage elle-même restaurée par le même
 * mécanisme, la session Supabase) lisible ailleurs que sur l'appareil d'origine.
 * Sans effet sur Android (propriété iOS uniquement), inoffensif à laisser.
 *
 * Sécurité : ARCHITECTURE §9 (« stockage sécurisé des sessions sur mobile »).
 */

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Purge conditionnelle (correctif revue M0 — Important 4, voir
 * `authStoragePurge.ts`) : ne supprime `key` que si le texte chiffré actuel
 * (relu maintenant) est identique à `originalPayload` (celui lu au début de
 * `getItem`, avant l'échec). S'il a changé — ou disparu —, un `setItem`/
 * `removeItem` concurrent a eu lieu entre-temps ; on ne purge pas une session
 * qui vient d'être écrite avec succès.
 *
 * Portée (correctif revue M0 boucle 2 — Mineur 7) : cette purge ne couvre pas
 * la course « texte chiffré déjà écrit par `setItem`, clé pas encore écrite »
 * (voir le commentaire sur l'ordre d'écriture dans `setItem` ci-dessous) — un
 * `getItem` concurrent y lirait un texte chiffré sans clé lisible sans qu'un
 * `setItem`/`removeItem` ait « changé » `originalPayload` au sens de cette
 * fonction. C'est `lock: processLock` (`client.ts`) qui sérialise les
 * opérations d'auth de `supabase-js` et évite cette fenêtre en pratique ;
 * cette purge reste une défense en profondeur pour les autres cas
 * (texte altéré, clé supprimée séparément, etc.).
 */
async function purgeIfUnchanged(key: string, originalPayload: string): Promise<void> {
  const currentPayload = await AsyncStorage.getItem(key);
  if (!shouldPurgeStaleCiphertext(originalPayload, currentPayload)) return;

  await AsyncStorage.removeItem(key);
  await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
}

export const authStorage: AuthStorage = {
  async getItem(key) {
    const payload = await AsyncStorage.getItem(key);
    if (!payload) return null;

    const keyBase64 = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
    if (!keyBase64) {
      // Clé de chiffrement absente (changement d'appareil, réinstallation
      // partielle...) : la valeur chiffrée lue ci-dessus est illisible. On
      // nettoie plutôt que de renvoyer une erreur — équivaut à une session
      // absente, Supabase Auth redemandera une connexion. Purge conditionnelle
      // (voir `purgeIfUnchanged`) : si un `setItem` concurrent a déjà remplacé
      // le texte chiffré par une session fraîche, on ne la supprime pas.
      await purgeIfUnchanged(key, payload);
      return null;
    }

    try {
      const decrypted = decryptFromStorage(keyBase64, payload);
      // Défense en profondeur au-delà de l'authentification GCM : la valeur
      // stockée par Supabase Auth est toujours un JSON de session. Un texte
      // qui passe l'authentification GCM mais n'est pas un JSON valide
      // indiquerait un bug ailleurs plutôt qu'une attaque, mais autant le
      // traiter de la même façon (purge + reconnexion) que le reste.
      JSON.parse(decrypted);
      return decrypted;
    } catch {
      // Authentification GCM échouée (mauvaise clé, texte altéré,
      // désynchronisation clé/valeur), format inconnu, ou JSON invalide : la
      // session lue par ce `getItem` est illisible. On ne journalise jamais la
      // valeur, chiffrée ou non. `client.ts` sérialise déjà les opérations
      // d'auth de `supabase-js` (`lock: processLock`), ce qui prévient
      // l'essentiel de la course avec un `setItem` concurrent (rafraîchissement
      // de jeton) — cette purge conditionnelle (voir `purgeIfUnchanged`) est une
      // défense en profondeur supplémentaire : elle ne supprime les deux
      // entrées que si le texte chiffré n'a pas changé depuis la lecture
      // ci-dessus, pour ne jamais purger une session fraîchement écrite par un
      // appelant concurrent. Équivaut sinon à une session absente, Supabase
      // Auth redemandera une connexion.
      await purgeIfUnchanged(key, payload);
      return null;
    }
  },
  async setItem(key, value) {
    const { keyBase64, payload } = encryptForStorage(
      (length) => Crypto.getRandomBytes(length),
      value,
    );
    // Texte chiffré écrit avant la clé : si l'app est interrompue entre les deux
    // écritures, `getItem` retrouve soit aucune des deux valeurs, soit un texte
    // chiffré sans clé lisible (purge explicite ci-dessus), jamais une clé neuve
    // couplée à un texte chiffré plus ancien sans que ce soit détecté — dans ce
    // dernier cas, l'authentification GCM fait échouer `decryptFromStorage`
    // (contrairement à l'ancien mode CTR, qui aurait renvoyé un texte corrompu
    // en silence). Cas app relancée après interruption uniquement : rien de
    // concurrent ne réécrit `key` entre-temps, donc `purgeIfUnchanged` purge
    // sans condition effective. Pour un `getItem` concurrent pendant cette
    // même fenêtre (avant interruption), voir la note de portée sur
    // `purgeIfUnchanged` ci-dessus — ce n'est pas ce que la purge couvre.
    await AsyncStorage.setItem(key, payload);
    await SecureStore.setItemAsync(key, keyBase64, SECURE_STORE_OPTIONS);
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
  },
};
