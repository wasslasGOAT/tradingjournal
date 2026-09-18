import type { ExpoConfig } from 'expo/config';

import { APP_NAME } from '@repo/config';

// Projet EAS créé par `npx eas-cli init --account wassimaha` (docs/RELEASE.md).
// L'identifiant n'est pas un secret ; `EAS_PROJECT_ID` permet de pointer un autre projet.
const EAS_PROJECT_ID = 'dd23ce8e-9296-4435-b7a9-d94b4ae3147b';
const easProjectId = process.env.EAS_PROJECT_ID ?? EAS_PROJECT_ID;

// Nom, logo et bundle ids restent provisoires (ADR-012) — remplaçables ici et dans
// packages/config sans toucher au reste de l'app.
const config: ExpoConfig = {
  name: APP_NAME,
  slug: 'edgebook',
  owner: 'wassimaha',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'edgebook',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  // Politique `appVersion` : une mise à jour OTA (`eas update`) n'est proposée qu'aux
  // builds natifs partageant le même `version` ci-dessus (ARCHITECTURE §11/§12) — évite
  // qu'un build natif obsolète reçoive un bundle JS incompatible avec son code natif.
  runtimeVersion: {
    policy: 'appVersion',
  },
  // `updates.url` ne peut exister sans projectId (EAS le rejette sinon) : absent tant que
  // `EAS_PROJECT_ID` n'est pas défini (avant `npx eas-cli init`, docs/RELEASE.md) — le build
  // de dev/web continue de fonctionner sans lui.
  ...(easProjectId ? { updates: { url: `https://u.expo.dev/${easProjectId}` } } : {}),
  ios: {
    bundleIdentifier: 'com.edgebook.app',
    supportsTablet: true,
  },
  android: {
    package: 'com.edgebook.app',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#000000',
    },
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    // Session Supabase chiffrée sur natif (T6, décision D5) : clé Keychain/Keystore.
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  // Lu par `expo-constants` (`Constants.expoConfig?.extra?.eas?.projectId`) et par la CLI
  // EAS elle-même. Absent tant que `EAS_PROJECT_ID` n'est pas défini : ne casse rien (build
  // de dev/web, `npx expo config`), seuls `eas build`/`eas update` en ont besoin.
  ...(easProjectId ? { extra: { eas: { projectId: easProjectId } } } : {}),
};

export default config;
