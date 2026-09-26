import { create } from 'zustand';

/**
 * File d'attente de messages temporaires (M1-4, ARCHITECTURE §6.2) : succès,
 * erreur, info — empilables (plusieurs toasts visibles en même temps).
 * `ToastProvider` (monté une fois, `apps/app/app/_layout.tsx`) affiche cette
 * file ; `useToast` (n'importe où dans l'app) la peuple.
 */
export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
}

interface ToastState {
  toasts: readonly ToastItem[];
  show: (message: string, variant?: ToastVariant) => string;
  dismiss: (id: string) => void;
}

let nextToastId = 0;

/** Identifiant local monotone — pas de dépendance UUID (CLAUDE.md « n'installe aucune dépendance »). */
function generateToastId(): string {
  nextToastId += 1;
  return `toast-${Date.now()}-${nextToastId}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, variant = 'info') => {
    const id = generateToastId();
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
