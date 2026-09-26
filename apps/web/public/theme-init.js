// Anti-flash (W-3, ARCHITECTURE §6.2) : pose `data-theme` sur `<html>` avant
// le premier rendu React, à partir de la préférence persistée
// (`edgebook.web.preferences.themePreference`, voir
// `src/features/preferences/theme-store.ts`) ou du système sinon.
// Enveloppé de `try/catch` : `localStorage` peut être indisponible.
//
// Sorti d'`index.html` en fichier statique chargé en synchrone (revue
// sécurité W-10) : `release` retire `'unsafe-inline'` de `script-src`
// (CSP), donc ce script ne peut plus être inline. Chargé de façon
// synchrone (pas de `defer`/`async`, pas de `type="module"`) juste avant la
// fermeture de `<head>` pour s'exécuter avant le premier rendu et éviter le
// flash — comportement identique à l'ancien script inline.
(function () {
  try {
    var KEY = 'edgebook.web.preferences.themePreference';
    var raw = window.localStorage.getItem(KEY);
    var preference = raw === 'dark' || raw === 'light' || raw === 'system' ? raw : 'system';
    var prefersLight =
      preference === 'system' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches;
    var mode = preference === 'system' ? (prefersLight ? 'light' : 'dark') : preference;
    document.documentElement.dataset.theme = mode;
  } catch {
    document.documentElement.dataset.theme = 'dark';
  }
})();
