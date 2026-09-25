# `src/data`

Couche données (ARCHITECTURE §4, ADR-023) : clés de requête TanStack Query,
fonctions de lecture/écriture Supabase, mutations optimistes.

Règles :

- **Aucune dépendance au DOM** (pas de `window`, `document`, ni composant) —
  extractible telle quelle en `packages/data`.
- Clés de requête incluant tous les filtres actifs (compte, période, mois) :
  jamais de donnée périmée affichée lors d'un changement de filtre.
- Montants lus en chaîne (`colonne::text`) puis convertis en `Decimal` par
  `packages/core` (ADR-005/016) — jamais de calcul métier ici au-delà de la
  conversion.

Peuplé à partir de W-6 (Dashboard/Calendrier).
