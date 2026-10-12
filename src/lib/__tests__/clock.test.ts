import { act, renderHook } from '@testing-library/react-native';

import { useChillStore } from '../../store/useChillStore';
import { __resetClockForTests, now, offsetOf, timeOffsetMs, useNow, useTimeOffset } from '../clock';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 9, 12, 12, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useChillStore.getState().resetAll();
});

afterEach(() => {
  __resetClockForTests();
  jest.useRealTimers();
});

describe('offsetOf', () => {
  it('reads a finite offset and treats anything else as 0', () => {
    expect(offsetOf({ timeOffsetMs: 5 })).toBe(5);
    expect(offsetOf({ timeOffsetMs: -5 })).toBe(-5);
    expect(offsetOf({})).toBe(0);
    expect(offsetOf(undefined)).toBe(0);
    expect(offsetOf({ timeOffsetMs: NaN })).toBe(0);
    expect(offsetOf({ timeOffsetMs: Infinity })).toBe(0);
  });
});

describe('now', () => {
  it('equals Date.now() without an offset', () => {
    expect(timeOffsetMs()).toBe(0);
    expect(now()).toBe(T0);
  });

  it('adds the fast-forward offset', () => {
    useChillStore.getState().fastForward(24 * HOUR);
    expect(timeOffsetMs()).toBe(24 * HOUR);
    expect(now()).toBe(T0 + 24 * HOUR);
    jest.advanceTimersByTime(1000);
    expect(now()).toBe(T0 + 24 * HOUR + 1000);
  });

  it('goes back to device time after resetAll', () => {
    useChillStore.getState().fastForward(3 * HOUR);
    useChillStore.getState().resetAll();
    expect(now()).toBe(T0);
  });
});

describe('useNow', () => {
  it('returns app time and re-renders every 30s by default', async () => {
    const { result } = await renderHook(() => useNow());
    expect(result.current).toBe(T0);
    await act(() => {
      jest.advanceTimersByTime(29_999);
    });
    expect(result.current).toBe(T0);
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(T0 + 30_000);
  });

  it('honours a custom interval', async () => {
    const { result } = await renderHook(() => useNow(1000));
    await act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(T0 + 3000);
  });

  it('switches interval when the argument changes', async () => {
    const { result, rerender } = await renderHook(({ ms }: { ms: number }) => useNow(ms), {
      initialProps: { ms: 30_000 },
    });
    await rerender({ ms: 1000 });
    await act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(T0 + 1000);
  });

  it('updates immediately when fast-forwarded', async () => {
    const { result } = await renderHook(() => useNow());
    await act(() => {
      useChillStore.getState().fastForward(24 * HOUR);
    });
    expect(result.current).toBe(T0 + 24 * HOUR);
  });

  it('never ticks with a non-positive interval', async () => {
    const { result } = await renderHook(() => useNow(0));
    await act(() => {
      jest.advanceTimersByTime(120_000);
    });
    expect(result.current).toBe(T0);
  });

  it('shares one timer between subscribers and stops it when unmounted', async () => {
    const setSpy = jest.spyOn(globalThis, 'setInterval');
    const clearSpy = jest.spyOn(globalThis, 'clearInterval');
    const started = () => setSpy.mock.calls.filter((call) => call[1] === 5000).length;
    const a = await renderHook(() => useNow(5000));
    const b = await renderHook(() => useNow(5000));
    expect(started()).toBe(1);
    await act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(a.result.current).toBe(T0 + 5000);
    expect(b.result.current).toBe(T0 + 5000);
    await a.unmount();
    expect(clearSpy).not.toHaveBeenCalled();
    await b.unmount();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    setSpy.mockRestore();
    clearSpy.mockRestore();
  });
});

describe('useTimeOffset', () => {
  it('reflects the stored offset', async () => {
    const { result } = await renderHook(() => useTimeOffset());
    expect(result.current).toBe(0);
    await act(() => {
      useChillStore.getState().fastForward(HOUR);
    });
    expect(result.current).toBe(HOUR);
  });
});
