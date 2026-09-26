---
description: Exécute une phase de la roadmap avec l'équipe d'agents (plan → implémentation → tests → revue → clôture)
argument-hint: <identifiant de phase : M0…M9 ou M1-web (MVP), P1…P6 (après le MVP)>
---

Exécute la **Phase $ARGUMENTS** de `docs/ROADMAP.md` (titre `## Phase $ARGUMENTS — …`) en suivant ce protocole.
Si une phase `P*` est demandée alors que des phases `M*` ne sont pas `Terminée`, signale-le et demande confirmation avant de continuer.
Pendant le MVP (phases `M*`), n'utilise pas les agents `backend`, `connectors` et `ai-coach` (ADR-015, ADR-016).
Critère transversal de chaque phase `M*` : vérification sur navigateur de bureau, navigateur mobile et PWA installée (ADR-023), et respect des exigences UX d'ADR-017 (révision du 2026-09-25) pour les écrans livrés. `apps/app` (Expo) et `packages/ui` sont gelés : aucun agent ne les modifie.

1. **Plan** — délègue à l'agent `architect` : plan des tâches de la phase (agent responsable, dépendances, vérification) et liste des décisions à prendre.
   Montre-moi ce plan et **attends ma validation** avant de coder. Si des ADR sont `Proposée`, pose-moi les questions maintenant.
2. **Implémentation** — délègue chaque tâche à l'agent indiqué. Lance en parallèle les tâches indépendantes. Transmets à chaque agent : la tâche, les fichiers concernés, le critère de vérification et les résultats des tâches dont elle dépend.
3. **Tests** — délègue à `qa-tests` : transformer les critères de fin en tests et exécuter toute la suite.
4. **Revue** — délègue en parallèle à `code-reviewer` et, si la phase touche aux données, à l'auth, aux connecteurs, aux paiements ou à l'IA, à `security-auditor`.
5. **Corrections** — renvoie chaque point bloquant à l'agent responsable, puis relance les étapes 3 et 4 sur les parties modifiées (2 boucles maximum, ensuite remonte-moi le problème).
6. **Clôture** — délègue à `architect` : vérification des critères de fin, mise à jour de ROADMAP.md et des docs, statut de la phase.
7. **Rapport** — résume : fait / reste à faire / décisions prises / commandes pour vérifier moi-même. Propose un message de commit, sans committer tant que je n'ai pas validé.
