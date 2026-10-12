import { useChillStore } from '../../store/useChillStore';
import { parseTestHooks, runTestHooks } from '../testHooks';

const HOUR = 3_600_000;

beforeEach(() => {
  useChillStore.getState().resetAll();
});

describe('parseTestHooks', () => {
  it.each<[string, ReturnType<typeof parseTestHooks>]>([
    ['', { reset: false, seed: false, ffHours: null }],
    ['?seed=demo', { reset: false, seed: true, ffHours: null }],
    ['seed=demo', { reset: false, seed: true, ffHours: null }],
    ['?seed=other', { reset: false, seed: false, ffHours: null }],
    ['?reset=1', { reset: true, seed: false, ffHours: null }],
    ['?reset=true', { reset: true, seed: false, ffHours: null }],
    ['?reset=0', { reset: false, seed: false, ffHours: null }],
    ['?ff=24', { reset: false, seed: false, ffHours: 24 }],
    ['?ff=1.5', { reset: false, seed: false, ffHours: 1.5 }],
    ['?ff=-2', { reset: false, seed: false, ffHours: -2 }],
    ['?ff=0', { reset: false, seed: false, ffHours: null }],
    ['?ff=abc', { reset: false, seed: false, ffHours: null }],
    ['?ff=', { reset: false, seed: false, ffHours: null }],
    ['?reset=1&seed=demo&ff=48', { reset: true, seed: true, ffHours: 48 }],
  ])('%p', (search, expected) => {
    expect(parseTestHooks(search)).toEqual(expected);
  });
});

describe('runTestHooks', () => {
  it('does nothing without hooks', () => {
    const before = useChillStore.getState();
    expect(runTestHooks({ reset: false, seed: false, ffHours: null })).toBe(false);
    expect(useChillStore.getState().items).toBe(before.items);
    expect(useChillStore.getState().settings).toBe(before.settings);
  });

  it('seeds the demo freezer and completes onboarding', () => {
    expect(runTestHooks({ reset: false, seed: true, ffHours: null })).toBe(true);
    const s = useChillStore.getState();
    expect(s.settings.onboarded).toBe(true);
    expect(s.items.some((i) => i.id === 'demo-sneakers')).toBe(true);
  });

  it('fast-forwards by hours', () => {
    runTestHooks({ reset: false, seed: false, ffHours: 24 });
    expect(useChillStore.getState().settings.timeOffsetMs).toBe(24 * HOUR);
  });

  it('resets before seeding and fast-forwarding', () => {
    useChillStore.getState().fastForward(5 * HOUR);
    useChillStore.getState().updateSettings({ currency: 'EUR' });
    runTestHooks({ reset: true, seed: true, ffHours: 2 });
    const s = useChillStore.getState();
    expect(s.settings.currency).toBe('USD');
    expect(s.settings.timeOffsetMs).toBe(2 * HOUR);
    expect(s.settings.onboarded).toBe(true);
    expect(s.items.length).toBeGreaterThan(0);
  });

  it('reset alone returns to onboarding', () => {
    runTestHooks({ reset: false, seed: true, ffHours: null });
    runTestHooks({ reset: true, seed: false, ffHours: null });
    expect(useChillStore.getState().settings.onboarded).toBe(false);
    expect(useChillStore.getState().items).toEqual([]);
  });
});
