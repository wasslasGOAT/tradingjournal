import { beforeEach, describe, expect, it } from 'vitest';

import { useMotionStore } from './motionStore';

describe('useMotionStore', () => {
  beforeEach(() => {
    useMotionStore.setState({ forceReducedMotion: null });
  });

  it('suit le système par défaut (`null`, aucun forçage)', () => {
    expect(useMotionStore.getState().forceReducedMotion).toBeNull();
  });

  it('force la réduction des animations', () => {
    useMotionStore.getState().setForceReducedMotion(true);
    expect(useMotionStore.getState().forceReducedMotion).toBe(true);
  });

  it('force les animations actives', () => {
    useMotionStore.getState().setForceReducedMotion(false);
    expect(useMotionStore.getState().forceReducedMotion).toBe(false);
  });

  it('revient au système (`null`)', () => {
    useMotionStore.getState().setForceReducedMotion(true);
    useMotionStore.getState().setForceReducedMotion(null);
    expect(useMotionStore.getState().forceReducedMotion).toBeNull();
  });
});
