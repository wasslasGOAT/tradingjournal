import { afterEach, describe, expect, it } from 'vitest';

import { defaultPnlColorScheme } from '../tokens';
import { useThemeStore } from './themeStore';

const initialState = useThemeStore.getState();

afterEach(() => {
  useThemeStore.setState(initialState, true);
});

describe('useThemeStore', () => {
  it('démarre sur "system" et le schéma P&L par défaut (pas encore de préférence persistée, M1)', () => {
    const state = useThemeStore.getState();
    expect(state.preference).toBe('system');
    expect(state.pnlColorScheme).toBe(defaultPnlColorScheme);
  });

  it('force un thème puis peut revenir au système', () => {
    useThemeStore.getState().setPreference('light');
    expect(useThemeStore.getState().preference).toBe('light');

    useThemeStore.getState().setPreference('system');
    expect(useThemeStore.getState().preference).toBe('system');
  });

  it('change le schéma de couleurs P&L', () => {
    useThemeStore.getState().setPnlColorScheme('greenRed');
    expect(useThemeStore.getState().pnlColorScheme).toBe('greenRed');
  });
});
