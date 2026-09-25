# Pack d'architecture — Edgebook

Ce dossier se place **à la racine d'un repo vide**. Claude Code lit `CLAUDE.md` automatiquement.

| Fichier | Rôle | Quand le modifier |
|---|---|---|
| `CLAUDE.md` | Règles de travail et invariants pour Claude Code | Rarement |
| `docs/ARCHITECTURE.md` | Carte du système, stack, modules, API, déploiement | Quand un choix change |
| `docs/DATA_MODEL.md` | Tables et conventions | À chaque évolution de schéma |
| `docs/ROADMAP.md` | Phases MVP M0 → M9 puis post-MVP P1 → P6, tâches et critères de fin | Librement (réordonner, couper, ajouter) |
| `docs/DECISIONS.md` | Historique des décisions (ADR) | À chaque changement d'avis |
| `.claude/agents/*.md` | 11 sous-agents spécialisés (voir tableau dans `CLAUDE.md`) | Librement : rôle, outils, `model` |
| `.claude/commands/*.md` | Commandes `/phase`, `/review`, `/decide` | Librement |

## Démarrer avec Claude Code
```bash
mkdir edgebook && cd edgebook && git init
# copier le contenu de ce dossier ici
claude
```
Vérifier que les agents sont chargés : `/agents` (ils apparaissent dans « Project agents »).

Premier message conseillé :
> Lis CLAUDE.md et tous les fichiers de docs/. Résume-moi l'architecture en 10 lignes et liste les ADR au statut « Proposée » sur lesquels tu as besoin de ma décision.

Puis, phase par phase :
```
/phase M0
```
Le flux : `architect` planifie → tu valides → les agents spécialisés codent (en parallèle quand c'est possible) → `qa-tests` teste → `code-reviewer` + `security-auditor` relisent → `architect` clôture la phase.

Autres commandes :
- `/review` : revue qualité + sécurité des changements en cours
- `/decide remplacer Supabase Auth par Clerk` : nouvel ADR, impact, puis adaptation du code
- Appel direct d'un agent : « Utilise l'agent connectors pour ajouter l'import cTrader »

## Personnaliser les agents
- `model:` : `opus` pour l'architecte, le coach IA et les deux relecteurs ; `sonnet` pour les autres. Passe tout en `sonnet` pour économiser, ou en `inherit` pour suivre le modèle de la session.
- `tools:` : les relecteurs sont en lecture seule volontairement. Seuls `connectors`, `ai-coach` et `release` ont accès au web (docs officielles qui évoluent).
- Ajouter un agent : créer `.claude/agents/<nom>.md`, puis l'ajouter au tableau de `CLAUDE.md` et aux phases concernées dans `ROADMAP.md`. Pistes : `designer` (maquettes/identité), `growth` (onboarding, paywall, analytics produit), `docs-writer` (aide utilisateur, fiches store).

## Décisions à prendre de ton côté
- MVP : suppression de compte (ADR-018), agrégats multi-devises (ADR-019), onglets MVP (ADR-011), nom et logo (ADR-012)
- Après le MVP : pondération du score (ADR-008), découpage Free/Pro et prix (`packages/config/plans.ts`), premiers connecteurs broker (phase P4)
- Comptes à ouvrir pour le MVP : Supabase et Cloudflare Pages (hébergement web, ADR-025). Apple Developer et Google Play Console seulement pour la publication sur les stores via Capacitor (P6, ADR-023). Après le MVP : Fly.io/Railway, RevenueCat, Stripe, Anthropic API, Sentry, PostHog, MetaApi (si MT4/MT5)
