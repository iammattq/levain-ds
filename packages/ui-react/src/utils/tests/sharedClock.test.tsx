import { act, render, screen } from '@testing-library/react';
import { clockState, useSharedNow } from '../sharedClock';

function Age({ at, id }: { at: number; id: string }) {
  const now = useSharedNow(at);
  return <span data-testid={id}>{Math.round((now - at) / 1000)}</span>;
}

const T0 = new Date('2026-11-23T12:00:00Z').getTime();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useSharedNow', () => {
  it('is stopped with nothing mounted', () => {
    expect(clockState()).toEqual({ running: false, cadence: 0, subscribers: 0 });
  });

  it('shares one interval across instances and clears it when the last unmounts', () => {
    const set = jest.spyOn(global, 'setInterval');
    const clear = jest.spyOn(global, 'clearInterval');
    const a = render(<Age at={T0 - 10_000} id="a" />);
    const b = render(<Age at={T0 - 20_000} id="b" />);
    const c = render(<Age at={T0 - 30_000} id="c" />);
    expect(set).toHaveBeenCalledTimes(1);
    expect(clockState()).toMatchObject({ running: true, cadence: 1000, subscribers: 3 });

    act(() => jest.advanceTimersByTime(5000));
    expect(screen.getByTestId('a')).toHaveTextContent('15');
    expect(screen.getByTestId('c')).toHaveTextContent('35');
    expect(set).toHaveBeenCalledTimes(1);

    a.unmount();
    b.unmount();
    expect(clockState().running).toBe(true);
    c.unmount();
    expect(clockState()).toEqual({ running: false, cadence: 0, subscribers: 0 });
    expect(clear).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('ticks every second while a time is under 90 s, then every minute', () => {
    const r = render(<Age at={T0 - 80_000} id="a" />);
    expect(clockState().cadence).toBe(1000);
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByTestId('a')).toHaveTextContent('81');
    act(() => jest.advanceTimersByTime(9000)); // 90 s old: seconds no longer show
    expect(clockState().cadence).toBe(60_000);
    expect(screen.getByTestId('a')).toHaveTextContent('90');
    act(() => jest.advanceTimersByTime(59_000)); // nothing re-renders within the minute
    expect(screen.getByTestId('a')).toHaveTextContent('90');
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByTestId('a')).toHaveTextContent('150');
    r.unmount();
  });

  it('paces by the youngest: a young time joining a slow clock speeds it up and reads fresh at once', () => {
    const set = jest.spyOn(global, 'setInterval');
    const old = render(<Age at={T0 - 3_600_000} id="old" />);
    expect(clockState().cadence).toBe(60_000);
    act(() => jest.advanceTimersByTime(30_000)); // half a minute without a tick
    const young = render(<Age at={Date.now() - 5000} id="young" />);
    expect(clockState().cadence).toBe(1000);
    expect(screen.getByTestId('young')).toHaveTextContent('5');
    expect(screen.getByTestId('old')).toHaveTextContent('3630');
    young.unmount();
    act(() => jest.advanceTimersByTime(1000)); // the next tick sees only the old one and slows down
    expect(clockState().cadence).toBe(60_000);
    expect(jest.getTimerCount()).toBe(1); // re-paced, never two at once
    expect(set.mock.calls.length).toBeGreaterThanOrEqual(3);
    old.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('treats a future time as young (seconds will show when it arrives)', () => {
    const r = render(<Age at={T0 + 3_600_000} id="a" />);
    expect(clockState().cadence).toBe(1000);
    r.unmount();
  });

  it('re-paces when an instance is given a younger time', () => {
    const r = render(<Age at={T0 - 3_600_000} id="a" />);
    expect(clockState().cadence).toBe(60_000);
    r.rerender(<Age at={T0 - 1000} id="a" />);
    expect(clockState().cadence).toBe(1000);
    r.unmount();
  });

  it('reads a fresh time on first mount after the clock sat stopped', () => {
    act(() => jest.advanceTimersByTime(3_600_000));
    const r = render(<Age at={Date.now() - 2000} id="a" />);
    expect(screen.getByTestId('a')).toHaveTextContent('2');
    r.unmount();
  });
});
