import { act, fireEvent, render, screen } from '@testing-library/react';
import { CommandBlock, CommandBlockCopyAll } from '../../../index';
import { COPIED_MS } from '../CommandBlock';

const writeText = jest.fn<Promise<void>, [string]>();
const realClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => {
  if (realClipboard) Object.defineProperty(navigator, 'clipboard', realClipboard);
  else delete (navigator as { clipboard?: unknown }).clipboard;
});

/** Clicks and lets the clipboard promise settle. */
const press = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el);
  });
};

const THREE = ['pnpm install', 'pnpm --filter @levain/demo build', 'git push origin feature/t4-command-block'];

describe('CommandBlock', () => {
  it('renders one command as a one-item ordered list with one Copy', () => {
    const { container } = render(<CommandBlock commands={['pnpm test']} />);
    const items = container.querySelectorAll('ol > li');
    expect(items).toHaveLength(1);
    expect(items[0].querySelector('code')).toHaveTextContent('pnpm test');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Copy command 1' })).toBeInTheDocument();
  });

  it('renders many commands in order, each with its own numbered Copy', () => {
    const { container } = render(<CommandBlock commands={THREE} />);
    const codes = [...container.querySelectorAll('ol > li code')].map(c => c.textContent);
    expect(codes).toEqual(THREE);
    expect(screen.getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual(['Copy command 1', 'Copy command 2', 'Copy command 3']);
  });

  it('wraps only at spaces: each word is a nowrap span, the spaces between them', () => {
    const cmd = 'ringmaster heavy t4 --kind capture --on pc --out captures/T4 bash demo/scripts/capture-command.sh';
    const { container } = render(<CommandBlock commands={[cmd]} />);
    const code = container.querySelector('code')!;
    const words = [...code.querySelectorAll('span')];
    expect(words.map(w => w.textContent)).toEqual(cmd.split(' '));
    for (const w of words) expect(w).toHaveClass('whitespace-nowrap');
    expect(code.textContent).toBe(cmd);
    expect(code).toHaveClass('type-code', 'overflow-x-auto');
  });

  it('each Copy writes its own command', async () => {
    render(<CommandBlock commands={THREE} />);
    await press(screen.getByRole('button', { name: 'Copy command 2' }));
    expect(writeText).toHaveBeenLastCalledWith(THREE[1]);
    await press(screen.getByRole('button', { name: 'Copy command 3' }));
    expect(writeText).toHaveBeenLastCalledWith(THREE[2]);
    await press(screen.getByRole('button', { name: 'Copy command 1' }));
    expect(writeText).toHaveBeenLastCalledWith(THREE[0]);
    expect(writeText).toHaveBeenCalledTimes(3);
  });
});

describe('CommandBlockCopyAll', () => {
  it('renders nothing for no command or one', () => {
    const { container, rerender } = render(<CommandBlockCopyAll commands={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CommandBlockCopyAll commands={['pnpm test']} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('past one command, Copy all writes them joined with newlines', async () => {
    render(<CommandBlockCopyAll commands={THREE} />);
    await press(screen.getByRole('button', { name: 'Copy all' }));
    expect(writeText).toHaveBeenCalledWith(THREE.join('\n'));
  });
});

describe('the confirmation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const icon = (b: HTMLElement) => b.querySelector('svg')!.getAttribute('data-testid');

  it('a Copy shows a check and announces it politely, then both reset after COPIED_MS', async () => {
    render(<CommandBlock commands={THREE} />);
    const b = screen.getByRole('button', { name: 'Copy command 2' });
    expect(icon(b)).toMatch(/icon-copy/);
    await press(b);
    expect(icon(b)).toMatch(/icon-check/);
    expect(b).toHaveAttribute('data-copied', 'true');
    const live = screen.getAllByRole('status');
    expect(live.every(l => l.getAttribute('aria-live') === 'polite')).toBe(true);
    expect(live.map(l => l.textContent)).toEqual(['', 'Copied command 2', '']);
    // the others are untouched
    expect(icon(screen.getByRole('button', { name: 'Copy command 1' }))).toMatch(/icon-copy/);

    act(() => jest.advanceTimersByTime(COPIED_MS - 1));
    expect(icon(b)).toMatch(/icon-check/);
    act(() => jest.advanceTimersByTime(1));
    expect(icon(b)).toMatch(/icon-copy/);
    expect(b).not.toHaveAttribute('data-copied');
    expect(screen.getAllByRole('status').map(l => l.textContent)).toEqual(['', '', '']);
  });

  it('a second copy during the check holds it a full COPIED_MS from the second', async () => {
    render(<CommandBlock commands={['pnpm test']} />);
    const b = screen.getByRole('button', { name: 'Copy command 1' });
    await press(b);
    act(() => jest.advanceTimersByTime(COPIED_MS - 100));
    await press(b);
    act(() => jest.advanceTimersByTime(COPIED_MS - 1));
    expect(icon(b)).toMatch(/icon-check/);
    act(() => jest.advanceTimersByTime(1));
    expect(icon(b)).toMatch(/icon-copy/);
  });

  it('Copy all confirms the same way and keeps its label', async () => {
    render(<CommandBlockCopyAll commands={THREE} />);
    const b = screen.getByRole('button', { name: 'Copy all' });
    await press(b);
    expect(icon(b)).toMatch(/icon-check/);
    expect(b).toHaveTextContent('Copy all');
    expect(screen.getByRole('status')).toHaveTextContent('Copied all 3 commands');
    act(() => jest.advanceTimersByTime(COPIED_MS));
    expect(icon(b)).toMatch(/icon-copy/);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('unmounting during the check clears its timer', async () => {
    const set = jest.spyOn(global, 'setTimeout');
    const clear = jest.spyOn(global, 'clearTimeout');
    const { unmount } = render(<CommandBlock commands={['pnpm test']} />);
    await press(screen.getByRole('button', { name: 'Copy command 1' }));
    const hold = set.mock.calls.findIndex(c => c[1] === COPIED_MS);
    expect(hold).toBeGreaterThanOrEqual(0);
    const id = set.mock.results[hold].value;
    clear.mockClear();
    unmount();
    expect(clear).toHaveBeenCalledWith(id);
    set.mockRestore();
    clear.mockRestore();
  });
});

describe('without a clipboard', () => {
  it('no navigator.clipboard: Copy and Copy all do not throw and show no check', async () => {
    delete (navigator as { clipboard?: unknown }).clipboard;
    expect(navigator.clipboard).toBeUndefined();
    render(<><CommandBlock commands={THREE} /><CommandBlockCopyAll commands={THREE} /></>);
    for (const name of ['Copy command 1', 'Copy all']) {
      const b = screen.getByRole('button', { name });
      await expect(press(b)).resolves.toBeUndefined();
      expect(b.querySelector('svg')!.getAttribute('data-testid')).toMatch(/icon-copy/);
    }
    expect(screen.getAllByRole('status').every(l => l.textContent === '')).toBe(true);
  });

  it('a refused write (permission denied) is swallowed and shows no check', async () => {
    writeText.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    render(<CommandBlock commands={['pnpm test']} />);
    const b = screen.getByRole('button', { name: 'Copy command 1' });
    await press(b);
    expect(writeText).toHaveBeenCalledWith('pnpm test');
    expect(b.querySelector('svg')!.getAttribute('data-testid')).toMatch(/icon-copy/);
  });
});
