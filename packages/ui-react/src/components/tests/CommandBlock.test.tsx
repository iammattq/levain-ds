import { act, fireEvent, render, screen } from '@testing-library/react';
import { CommandBlock } from '../../../index';

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
