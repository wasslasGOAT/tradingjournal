import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Fusion de classes Tailwind (utilitaire standard shadcn/ui). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
