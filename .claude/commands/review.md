---
description: Revue complète des changements en cours (qualité + sécurité)
---

Lance en parallèle `code-reviewer` et `security-auditor` sur les changements actuels (`git diff` et fichiers non suivis). $ARGUMENTS
Fusionne leurs rapports en une seule liste triée par gravité, sans doublons, avec pour chaque point l'agent qui doit corriger. Ne corrige rien sans mon accord.
