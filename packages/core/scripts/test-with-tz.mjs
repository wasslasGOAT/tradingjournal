#!/usr/bin/env node
/**
 * Lance `vitest run` avec `TZ=Europe/Paris` (revue W-10) : `TZ=x commande`
 * n'existe pas nativement sous PowerShell/`cmd.exe` (contrairement à un
 * shell POSIX), et `cross-env` n'est pas une dépendance du dépôt — ce petit
 * script Node (déjà présent, indépendant du shell de l'utilisateur) fixe
 * `process.env.TZ` avant de relancer Vitest en sous-processus, ce qui
 * fonctionne à l'identique sous Windows, macOS et Linux/CI.
 *
 * But du test (CLAUDE.md : le « jour de trading » dépend du fuseau du
 * compte, jamais de celui de la machine hôte) : `packages/core` résout
 * toujours ses dates via `Intl.DateTimeFormat`/`timeZone` explicite
 * (`packages/core/src/time/localTimeCache.ts`), jamais via le fuseau
 * implicite du process — la suite de tests doit donc rester intégralement
 * verte sous n'importe quel `TZ`, y compris un fuseau très différent d'UTC
 * comme `Europe/Paris`.
 */
import { spawnSync } from 'node:child_process';

const TZ = 'Europe/Paris';

const result = spawnSync('pnpm', ['exec', 'vitest', 'run'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, TZ },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
