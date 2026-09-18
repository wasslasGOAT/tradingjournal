import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { createPersistOptions } from './persistOptions';
import { createQueryClient } from './queryClient';

/**
 * Provider TanStack Query de l'app (T6), à monter une seule fois dans
 * `app/_layout.tsx`. Cache persisté (AsyncStorage natif / `localStorage` web,
 * ARCHITECTURE §10) : dashboard et calendrier restent lisibles hors-ligne dès
 * les phases suivantes, sans changer ce composant.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  const persistOptions = useMemo(() => createPersistOptions(), []);

  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
