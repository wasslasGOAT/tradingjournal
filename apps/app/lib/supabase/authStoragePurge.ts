/**
 * Logique de purge conditionnelle de `authStorage.native.ts` (correctif revue
 * M0 — Important 4), isolée en fonction pure pour être testable sans module
 * natif (`AsyncStorage`, `SecureStore`).
 *
 * Contexte : `getItem` lit le texte chiffré (AsyncStorage) puis la clé
 * (SecureStore) en deux appels non atomiques. Un `setItem` concurrent
 * (rafraîchissement de jeton Supabase) peut s'intercaler entre les deux et
 * écrire un nouveau texte chiffré + une nouvelle clé cohérents entre eux, mais
 * différents de ce que `getItem` a déjà lu — l'authentification GCM échoue
 * alors dans `decryptFromStorage`, non pas parce que la session est illisible,
 * mais parce que `getItem` a lu un mélange ancien texte/nouvelle clé (ou
 * l'inverse). Purger dans ce cas supprimerait la session fraîchement écrite par
 * le `setItem` concurrent.
 *
 * `client.ts` passe `lock: processLock` à `createClient` pour empêcher
 * l'essentiel de cette course (sérialise les opérations d'auth de
 * `supabase-js` entre elles côté React Native, qui n'a pas `navigator.locks`).
 * Cette purge conditionnelle reste une défense en profondeur pour tout appelant
 * hors `supabase-js` qui écrirait directement via `authStorage`, ou pour une
 * fenêtre de course que `lock` ne couvrirait pas.
 */

/**
 * `true` si le texte chiffré observé au moment de l'échec de déchiffrement est
 * identique à celui lu au tout début de `getItem` — dans ce cas, aucune
 * écriture concurrente n'a eu lieu et l'échec vient bien d'une session
 * illisible (mauvaise clé, texte altéré) : la purge est légitime.
 *
 * `false` si le texte chiffré a changé entre-temps (ou a été supprimé,
 * `currentPayload === null`) : un `setItem` (ou `removeItem`) concurrent a eu
 * lieu, on ne purge pas — ce serait purger une valeur qu'on n'a pas lue et qui
 * n'a jamais échoué à se déchiffrer.
 */
export function shouldPurgeStaleCiphertext(
  originalPayload: string,
  currentPayload: string | null,
): boolean {
  return currentPayload === originalPayload;
}
