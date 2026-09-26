/**
 * Interface commune des retours haptiques (M1-2, ADR-017 : « retours haptiques
 * sur mobile — interface commune, implémentation web vide »). Implémentations
 * derrière cette interface : `Haptics.native.ts` (expo-haptics) et
 * `Haptics.web.ts` (no-op) — voir `./Haptics`.
 */
export interface HapticsAdapter {
  /** Changement de sélection discret (ex. bascule d'un segment, d'un onglet). */
  selection(): void;
  /** Interaction légère (ex. cocher une checklist, ouvrir une sheet). */
  impactLight(): void;
  /** Interaction plus marquée (ex. confirmer une suppression, valider un formulaire). */
  impactMedium(): void;
  /** Action réussie (ex. trade enregistré, import terminé). */
  success(): void;
  /** Action en échec (ex. validation refusée, requête en erreur). */
  error(): void;
}
