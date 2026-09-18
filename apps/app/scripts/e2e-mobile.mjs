#!/usr/bin/env node
/**
 * apps/app/scripts/e2e-mobile.mjs
 *
 * `pnpm e2e:mobile` (T10) : lance les parcours Maestro (`apps/app/.maestro/**`)
 * contre un simulateur/émulateur ou un appareil déjà démarré, avec l'app en
 * cours d'exécution (Expo Go ou build de dev EAS — voir README).
 *
 * Maestro requiert un JDK et un simulateur/émulateur (ou un appareil physique
 * connecté) : indisponibles sur ce poste au moment de T10 (Windows 11 Home,
 * pas de Docker/Android Studio configuré ici). Plutôt que d'échouer avec une
 * erreur "command not found" opaque, on vérifie explicitement la présence de
 * `maestro` sur le PATH et on explique pourquoi ça ne peut pas tourner ici.
 */

import { spawnSync } from 'node:child_process';

const MAESTRO_INSTALL_DOC = 'https://docs.maestro.dev/getting-started/installing-maestro';

function isMaestroOnPath() {
  const isWindows = process.platform === 'win32';
  const result = spawnSync(isWindows ? 'where' : 'which', ['maestro'], {
    stdio: 'ignore',
    shell: isWindows,
  });
  return result.status === 0;
}

if (!isMaestroOnPath()) {
  console.error(
    [
      '[e2e:mobile] Maestro est introuvable sur le PATH : les tests mobiles ne peuvent pas',
      'tourner sur cette machine (pas de JDK/Android Studio ni de simulateur/émulateur',
      'configurés ici).',
      '',
      `Installer Maestro : ${MAESTRO_INSTALL_DOC}`,
      'Prérequis supplémentaires : un JDK (Maestro en dépend) et un simulateur iOS',
      '(Xcode, macOS uniquement) ou un émulateur/appareil Android avec Expo Go installé,',
      'ou un build de dev EAS (agent `release`).',
      '',
      'Une fois Maestro et un simulateur/émulateur disponibles :',
      '  1. Démarrer l’app (`pnpm dev:app`, puis ouvrir sur le simulateur/émulateur).',
      '  2. Relancer `pnpm e2e:mobile` (exécute `maestro test .maestro/hello.yaml`).',
    ].join('\n'),
  );
  process.exit(1);
}

const result = spawnSync('maestro', ['test', '.maestro/hello.yaml'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
