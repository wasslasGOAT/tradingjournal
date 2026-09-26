import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';

import { AppShell } from '@/features/shell/AppShell';
import { shellSearchToRange, validateShellSearch } from '@/features/shell/filters';
import type { ShellSearch } from '@/features/shell/filters';

/**
 * Disposition connectée (W-5, ADR-011, ADR-024) : route pathless
 * (`_shell`, préfixe réservé par TanStack Router pour une disposition sans
 * segment d'URL) enveloppant toutes les sections de l'app (`AppShell`) —
 * sidebar >= 1024 px, tab bar flottante sinon, header commun.
 *
 * Compte et période sont des **paramètres de recherche typés** (ARCHITECTURE
 * §6.1 : « persistés... et URL (web) ») : source de vérité unique, validée
 * ici (`validateShellSearch`, jamais de plage indéfinie), lue par `AppHeader`
 * et modifiable par toute route enfant via `Route.useSearch()` /
 * `useNavigate()` (global, W-9 boucle de corrections n°1 — **pas**
 * `Route.useNavigate()`). `_shell` est une route *pathless* (aucun segment
 * d'URL propre) : `Route.useNavigate()` résout ses navigations relatives
 * (`to: '.'` ou omis) par rapport au chemin **de cette route**, qui vaut `/`
 * pour une route pathless — un changement de compte/période depuis
 * `/calendar` renvoyait donc au Dashboard. `useNavigate()` global résout au
 * contraire par rapport à l'URL affichée (route enfant active), donc reste
 * sur `/calendar`. Un rechargement sur une route profonde conserve donc le
 * compte et la période choisis.
 */
export const Route = createFileRoute('/_shell')({
  validateSearch: (search: Record<string, unknown>): ShellSearch => validateShellSearch(search),
  component: ShellLayout,
});

function ShellLayout() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <AppShell
      accountId={search.account}
      onAccountChange={(account) => {
        void navigate({ to: '.', search: (prev) => ({ ...prev, account }), replace: true });
      }}
      dateRange={shellSearchToRange(search)}
      dateRangeShortcut={search.shortcut}
      onPeriodChange={(range, shortcut) => {
        void navigate({
          to: '.',
          search: (prev) => ({ ...prev, from: range.start, to: range.end, shortcut }),
          replace: true,
        });
      }}
    >
      <Outlet />
    </AppShell>
  );
}
