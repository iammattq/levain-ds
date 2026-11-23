import { act, render, screen } from '@testing-library/react';
import { RelativeTime, formatSpan } from '../../../index';
import { clockState } from '../../utils/sharedClock';

const T0 = new Date('2026-11-23T12:00:00Z').getTime();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
});
afterEach(() => jest.useRealTimers());

const time = (container: HTMLElement) => container.querySelector('time')!;

describe('RelativeTime', () => {
  it('is exported with formatSpan from the package', () => {
    expect(typeof formatSpan).toBe('function');
    expect(typeof RelativeTime).toBe('function');
  });

  it('renders a <time> with the moment as dateTime, the full date and time as title, and only the span as text', () => {
    const at = T0 - 35 * 60_000;
    const { container } = render(<RelativeTime at={at} />);
    const el = time(container);
    expect(el).toHaveTextContent(/^35m$/);
    expect(el).toHaveAttribute('datetime', new Date(at).toISOString());
    expect(el.title).toBe(new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' }));
    expect(el.title).toMatch(/2026/);
  });

  it.each([
    ['a Date', new Date(T0 - 45_000)],
    ['an ISO string', new Date(T0 - 45_000).toISOString()],
    ['ms since the epoch', T0 - 45_000],
  ])('takes %s', (_, at) => {
    const { container } = render(<RelativeTime at={at} />);
    expect(time(container)).toHaveTextContent('45s');
  });

  it('reads a future time as 0s, never late', () => {
    const { container } = render(<RelativeTime at={T0 + 60_000} warnAfter={10} />);
    expect(time(container)).toHaveTextContent('0s');
    expect(time(container)).not.toHaveAttribute('data-state');
  });

  it('renders nothing for an invalid time', () => {
    const { container } = render(<RelativeTime at="not a date" />);
    expect(container).toBeEmptyDOMElement();
    const nan = render(<RelativeTime at={Number.NaN} />);
    expect(nan.container).toBeEmptyDOMElement();
  });

  it('updates live: every second, then every minute', () => {
    const { container } = render(<RelativeTime at={T0 - 85_000} />);
    expect(time(container)).toHaveTextContent('85s');
    act(() => jest.advanceTimersByTime(1000));
    expect(time(container)).toHaveTextContent('86s');
    act(() => jest.advanceTimersByTime(4000));
    expect(time(container)).toHaveTextContent('2m'); // 90 s
    act(() => jest.advanceTimersByTime(60_000));
    expect(time(container)).toHaveTextContent('3m');
  });

  it('turns late past warnAfter, not at it: data-state and the caution colour, nothing else', () => {
    const { container } = render(<RelativeTime at={T0 - 59_000} warnAfter={60} className="x" />);
    const el = time(container);
    const calm = el.className;
    act(() => jest.advanceTimersByTime(1000)); // exactly 60 s: not yet
    expect(el).not.toHaveAttribute('data-state');
    expect(el.className).toBe(calm);
    act(() => jest.advanceTimersByTime(1000)); // 61 s
    expect(el).toHaveAttribute('data-state', 'late');
    expect(el.className.split(' ').sort()).toEqual([...calm.split(' '), 'text-[var(--color-caution-fg)]'].filter(Boolean).sort());
  });

  it('never turns late without warnAfter', () => {
    const { container } = render(<RelativeTime at={T0 - 10 * 86_400_000} />);
    expect(time(container)).not.toHaveAttribute('data-state');
    expect(time(container)).toHaveTextContent('10d');
  });

  it('animates nothing: no transition or motion on the element (so nothing to drop under Reduce Motion)', () => {
    const { container } = render(<RelativeTime at={T0 - 120_000} warnAfter={60} />);
    const el = time(container);
    expect(el.getAttribute('style')).toBeNull();
    expect(el.className).not.toMatch(/transition|animate/);
  });

  it('many instances share one interval, cleared when the last unmounts', () => {
    const set = jest.spyOn(global, 'setInterval');
    const r = render(
      <>
        {[5, 50, 500, 5000].map((s) => <RelativeTime key={s} at={T0 - s * 1000} warnAfter={100} />)}
      </>,
    );
    expect(screen.getAllByText(/\d/)).toHaveLength(4);
    expect(set).toHaveBeenCalledTimes(1);
    expect(clockState()).toMatchObject({ running: true, subscribers: 4 });
    r.unmount();
    expect(clockState()).toEqual({ running: false, cadence: 0, subscribers: 0 });
    set.mockRestore();
  });
});
